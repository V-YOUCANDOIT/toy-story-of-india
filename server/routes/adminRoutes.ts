import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection.ts';
import { authenticate, requireAdmin } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import {
  adjustProductStock,
  restoreStockForOrder,
} from '../services/inventoryService.ts';
import { getStoreSettings, updateStoreSettings } from '../services/settingsService.ts';
import {
  inventoryAdjustSchema,
  orderStatusUpdateSchema,
  storeSettingsSchema,
} from '../validators/schemas.ts';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', (_req, res) => {
  const db = getDb();
  const settings = getStoreSettings();

  const salesSummary = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN order_status != 'Cancelled' THEN final_total ELSE 0 END), 0) as total_sales,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN order_status = 'Pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN order_status = 'Delivered' THEN 1 END) as delivered_orders
       FROM orders`
    )
    .get() as {
    total_sales: number;
    total_orders: number;
    pending_orders: number;
    delivered_orders: number;
  };

  const customerCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`)
      .get() as { count: number }
  ).count;

  const productCount = (
    db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  ).count;

  const lowStockProducts = db
    .prepare(
      `SELECT p.id, p.name, p.sku, p.stock_quantity, p.price, c.name as category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.stock_quantity <= ? AND p.is_available = 1
       ORDER BY p.stock_quantity ASC`
    )
    .all(settings.low_stock_threshold);

  const recentOrders = db
    .prepare(
      `SELECT id, order_number, customer_name, customer_email, final_total, payment_method, payment_status, order_status, created_at
       FROM orders
       ORDER BY created_at DESC, id DESC
       LIMIT 8`
    )
    .all();

  const categorySales = db
    .prepare(
      `SELECT c.name as category_name,
        COALESCE(SUM(oi.line_total), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as units_sold
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.order_status != 'Cancelled'
       GROUP BY c.id
       ORDER BY revenue DESC, c.display_order ASC`
    )
    .all();

  res.json({
    metrics: {
      total_sales: Math.round(salesSummary.total_sales * 100) / 100,
      total_orders: salesSummary.total_orders,
      pending_orders: salesSummary.pending_orders,
      delivered_orders: salesSummary.delivered_orders,
      total_customers: customerCount,
      total_products: productCount,
      low_stock_count: lowStockProducts.length,
    },
    low_stock_products: lowStockProducts,
    recent_orders: recentOrders,
    sales_overview: categorySales,
  });
});

router.get('/orders', (req, res) => {
  const db = getDb();
  const { q, status } = req.query as { q?: string; status?: string };

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (q && q.trim()) {
    where.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)');
    const term = `%${q.trim()}%`;
    params.push(term, term, term);
  }
  if (status && status !== 'all') {
    where.push('order_status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const orders = db
    .prepare(
      `SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
       FROM orders o
       ${whereSql}
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all(...params) as Array<Record<string, unknown>>;

  res.json({
    orders: orders.map((o) => ({
      ...o,
      shipping_address_snapshot: JSON.parse(o.shipping_address_snapshot as string),
    })),
  });
});

router.put('/orders/:id/status', (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { order_status } = orderStatusUpdateSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, order_number, order_status, payment_method FROM orders WHERE id = ?')
      .get(orderId) as
      | {
          id: number;
          order_number: string;
          order_status: string;
          payment_method: string;
        }
      | undefined;

    if (!existing) throw new AppError('Order not found', 404);

    db.transaction(() => {
      if (order_status === 'Cancelled' && existing.order_status !== 'Cancelled') {
        restoreStockForOrder(existing.id, existing.order_number, req.user!.id);
      }

      // If COD order reaches Delivered, mark payment as paid
      const markCodPaid =
        existing.payment_method === 'cod' && order_status === 'Delivered';

      db.prepare(
        `UPDATE orders
         SET order_status = ?,
             payment_status = CASE WHEN ? THEN 'paid' WHEN ? THEN CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END ELSE payment_status END,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        order_status,
        markCodPaid ? 1 : 0,
        order_status === 'Cancelled' ? 1 : 0,
        orderId
      );

      if (markCodPaid) {
        db.prepare(
          `UPDATE payments SET status = 'paid', updated_at = datetime('now') WHERE order_id = ?`
        ).run(orderId);
      }
    })();

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<
      string,
      unknown
    >;
    res.json({
      order: {
        ...updated,
        shipping_address_snapshot: JSON.parse(
          updated.shipping_address_snapshot as string
        ),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/customers', (_req, res) => {
  const db = getDb();
  const customers = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.order_status != 'Cancelled' THEN o.final_total ELSE 0 END), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();

  res.json({ customers });
});

router.get('/customers/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();

    const customer = db
      .prepare(
        `SELECT id, name, email, phone, role, is_active, created_at
         FROM users WHERE id = ? AND role = 'customer'`
      )
      .get(id);
    if (!customer) throw new AppError('Customer not found', 404);

    const orders = db
      .prepare(
        `SELECT id, order_number, final_total, payment_method, payment_status, order_status, created_at
         FROM orders WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(id);

    res.json({ customer, orders });
  } catch (err) {
    next(err);
  }
});

router.put('/customers/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);
    const db = getDb();

    const target = db
      .prepare('SELECT id, role FROM users WHERE id = ?')
      .get(id) as { id: number; role: string } | undefined;
    if (!target || target.role !== 'customer') {
      throw new AppError('Customer account not found', 404);
    }

    db.prepare(
      `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(is_active ? 1 : 0, id);

    res.json({ message: 'Customer status updated', is_active });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory', (_req, res) => {
  const db = getDb();
  const settings = getStoreSettings();

  const products = db
    .prepare(
      `SELECT p.id, p.name, p.sku, p.brand, p.stock_quantity, p.price, p.is_available, c.name as category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.stock_quantity ASC, p.name ASC`
    )
    .all();

  const logs = db
    .prepare(
      `SELECT l.*, p.name as product_name, p.sku as product_sku
       FROM inventory_logs l
       JOIN products p ON p.id = l.product_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 40`
    )
    .all();

  res.json({
    low_stock_threshold: settings.low_stock_threshold,
    products,
    logs,
  });
});

router.put('/inventory/:productId', (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const data = inventoryAdjustSchema.parse(req.body);
    const result = adjustProductStock(
      productId,
      data.stock_quantity,
      data.reason,
      req.user!.id
    );
    res.json({ adjustment: result });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', (_req, res) => {
  res.json({ settings: getStoreSettings() });
});

router.put('/settings', (req, res, next) => {
  try {
    const patch = storeSettingsSchema.parse(req.body);
    const updated = updateStoreSettings(patch);
    res.json({ settings: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
