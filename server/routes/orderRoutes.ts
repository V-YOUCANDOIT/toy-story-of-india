import crypto from 'crypto';
import { Router } from 'express';
import { env } from '../config/env.ts';
import { getDb } from '../database/connection.ts';
import { authenticate } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { calculateUserCart } from '../services/cartService.ts';
import {
  deductStockForOrder,
  restoreStockForOrder,
} from '../services/inventoryService.ts';
import { getStoreSettings } from '../services/settingsService.ts';
import { createOrderSchema } from '../validators/schemas.ts';

const router = Router();
router.use(authenticate);

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomInt(100000, 999999);
  return `PA-${year}-${suffix}`;
}

router.post('/', (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const db = getDb();
    const settings = getStoreSettings();

    if (data.payment_method === 'cod' && !settings.cod_enabled) {
      throw new AppError(
        'Cash on Delivery is currently disabled. Please choose another payment method.',
        400
      );
    }

    if (
      data.payment_method === 'demo_online' &&
      (!env.paymentTestMode || !settings.demo_payment_enabled)
    ) {
      throw new AppError('Test payment mode is not enabled.', 403);
    }

    if (
      data.payment_method === 'razorpay' &&
      (!env.razorpayKeyId || !env.razorpayKeySecret)
    ) {
      throw new AppError(
        'Online Razorpay checkout is awaiting API credentials configuration.',
        503
      );
    }

    const cart = calculateUserCart(req.user!.id);
    if (cart.items.length === 0) {
      throw new AppError('Your shopping bag is empty.', 400);
    }

    const orderNumber = generateOrderNumber();

    const createdOrder = db.transaction(() => {
      // 1. Validate & deduct stock atomically
      deductStockForOrder(
        cart.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          name: item.name,
        })),
        orderNumber,
        req.user!.id
      );

      // 2. Determine initial order & payment status
      const initialPaymentStatus =
        data.payment_method === 'cod' ? 'pending' : 'awaiting_verification';
      const initialOrderStatus =
        data.payment_method === 'cod' ? 'Confirmed' : 'Pending';

      // 3. Create order with authoritative backend totals
      const orderRes = db
        .prepare(
          `INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            shipping_address_snapshot, subtotal, discount_total, delivery_charge,
            final_total, payment_method, payment_status, order_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderNumber,
          req.user!.id,
          data.customer_name,
          data.customer_email,
          data.customer_phone,
          JSON.stringify(data.shipping_address),
          cart.subtotal,
          cart.discount_total,
          cart.delivery_charge,
          cart.final_total,
          data.payment_method,
          initialPaymentStatus,
          initialOrderStatus,
          data.notes
        );

      const orderId = Number(orderRes.lastInsertRowid);

      // 4. Create immutable order item snapshots
      const insertItem = db.prepare(
        `INSERT INTO order_items (
          order_id, product_id, product_name_snapshot, product_sku_snapshot,
          product_image_snapshot, unit_price, unit_discount_price, quantity, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const item of cart.items) {
        insertItem.run(
          orderId,
          item.product_id,
          item.name,
          item.sku,
          item.image,
          item.price,
          item.discounted_price,
          item.quantity,
          item.line_total
        );
      }

      // 5. Create initial payment ledger record
      db.prepare(
        `INSERT INTO payments (order_id, provider, provider_order_id, amount, currency, status)
         VALUES (?, ?, ?, ?, 'USD', ?)`
      ).run(
        orderId,
        data.payment_method,
        data.payment_method === 'cod' ? `cod_${orderNumber}` : '',
        cart.final_total,
        data.payment_method === 'cod' ? 'pending' : 'initiated'
      );

      // 6. Clear customer cart
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.id);

      return orderId;
    })();

    const order = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(createdOrder) as Record<string, unknown>;
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(createdOrder);

    res.status(201).json({
      order: {
        ...order,
        shipping_address_snapshot: JSON.parse(
          order.shipping_address_snapshot as string
        ),
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const orders = db
    .prepare(
      `SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all(req.user!.id) as Array<Record<string, unknown>>;

  const formatted = orders.map((o) => ({
    ...o,
    shipping_address_snapshot: JSON.parse(o.shipping_address_snapshot as string),
  }));

  res.json({ orders: formatted });
});

router.get('/:id', (req, res, next) => {
  try {
    const idParam = req.params.id;
    const db = getDb();

    const order = db
      .prepare(
        `SELECT * FROM orders WHERE ${/^\d+$/.test(idParam) ? 'id = ?' : 'order_number = ?'}`
      )
      .get(/^\d+$/.test(idParam) ? Number(idParam) : idParam) as
      | (Record<string, unknown> & { id: number; user_id: number })
      | undefined;

    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You do not have permission to view this order.', 403);
    }

    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(order.id);
    const payment = db
      .prepare(
        'SELECT id, provider, provider_order_id, provider_payment_id, amount, currency, status, created_at, updated_at FROM payments WHERE order_id = ?'
      )
      .get(order.id);

    res.json({
      order: {
        ...order,
        shipping_address_snapshot: JSON.parse(
          order.shipping_address_snapshot as string
        ),
        items,
        payment,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/cancel', (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const db = getDb();

    const order = db
      .prepare('SELECT id, order_number, user_id, order_status, payment_status FROM orders WHERE id = ?')
      .get(orderId) as
      | {
          id: number;
          order_number: string;
          user_id: number;
          order_status: string;
          payment_status: string;
        }
      | undefined;

    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('You do not have permission to cancel this order.', 403);
    }

    if (!['Pending', 'Confirmed'].includes(order.order_status)) {
      throw new AppError(
        `Orders in "${order.order_status}" status can no longer be cancelled.`,
        400
      );
    }

    db.transaction(() => {
      db.prepare(
        `UPDATE orders
         SET order_status = 'Cancelled',
             payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(order.id);

      db.prepare(
        `UPDATE payments
         SET status = CASE WHEN status = 'paid' THEN 'refunded' ELSE 'failed' END,
             updated_at = datetime('now')
         WHERE order_id = ?`
      ).run(order.id);

      restoreStockForOrder(order.id, order.order_number, req.user!.id);
    })();

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as Record<
      string,
      unknown
    >;
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(order.id);

    res.json({
      order: {
        ...updated,
        shipping_address_snapshot: JSON.parse(
          updated.shipping_address_snapshot as string
        ),
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
