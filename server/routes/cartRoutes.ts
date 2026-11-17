import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection.ts';
import { authenticate } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { calculateUserCart } from '../services/cartService.ts';
import { cartItemAddSchema, cartItemUpdateSchema } from '../validators/schemas.ts';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const cart = calculateUserCart(req.user!.id);
  res.json({ cart });
});

router.post('/items', (req, res, next) => {
  try {
    const data = cartItemAddSchema.parse(req.body);
    const db = getDb();

    const product = db
      .prepare('SELECT id, name, stock_quantity, is_available FROM products WHERE id = ?')
      .get(data.product_id) as
      | { id: number; name: string; stock_quantity: number; is_available: number }
      | undefined;

    if (!product || product.is_available !== 1) {
      throw new AppError('This product is currently unavailable.', 404);
    }

    if (product.stock_quantity <= 0) {
      throw new AppError(`"${product.name}" is currently out of stock.`, 400);
    }

    const existing = db
      .prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
      .get(req.user!.id, data.product_id) as
      | { id: number; quantity: number }
      | undefined;

    const targetQty = (existing?.quantity || 0) + data.quantity;
    if (targetQty > product.stock_quantity) {
      throw new AppError(
        `Only ${product.stock_quantity} unit(s) of "${product.name}" available in stock.`,
        400
      );
    }

    if (existing) {
      db.prepare(
        `UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(targetQty, existing.id);
    } else {
      db.prepare(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`
      ).run(req.user!.id, data.product_id, targetQty);
    }

    const cart = calculateUserCart(req.user!.id);
    res.status(201).json({ cart });
  } catch (err) {
    next(err);
  }
});

router.put('/items/:id', (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    const { quantity } = cartItemUpdateSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, user_id, product_id FROM cart_items WHERE id = ?')
      .get(itemId) as
      | { id: number; user_id: number; product_id: number }
      | undefined;

    if (!existing) throw new AppError('Cart item not found', 404);
    if (existing.user_id !== req.user!.id) throw new AppError('Access denied', 403);

    if (quantity === 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
      res.json({ cart: calculateUserCart(req.user!.id) });
      return;
    }

    const product = db
      .prepare('SELECT name, stock_quantity, is_available FROM products WHERE id = ?')
      .get(existing.product_id) as
      | { name: string; stock_quantity: number; is_available: number }
      | undefined;

    if (!product || product.is_available !== 1) {
      throw new AppError('This product is no longer available.', 400);
    }

    if (quantity > product.stock_quantity) {
      throw new AppError(
        `Only ${product.stock_quantity} unit(s) of "${product.name}" available.`,
        400
      );
    }

    db.prepare(
      `UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(quantity, itemId);

    res.json({ cart: calculateUserCart(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, user_id FROM cart_items WHERE id = ?')
      .get(itemId) as { id: number; user_id: number } | undefined;

    if (!existing) throw new AppError('Cart item not found', 404);
    if (existing.user_id !== req.user!.id) throw new AppError('Access denied', 403);

    db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
    res.json({ cart: calculateUserCart(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

router.post('/merge', (req, res, next) => {
  try {
    const schema = z.object({
      items: z.array(cartItemAddSchema).max(50),
    });
    const { items } = schema.parse(req.body);
    const db = getDb();

    const tx = db.transaction(() => {
      for (const item of items) {
        const product = db
          .prepare('SELECT id, stock_quantity, is_available FROM products WHERE id = ?')
          .get(item.product_id) as
          | { id: number; stock_quantity: number; is_available: number }
          | undefined;

        if (!product || product.is_available !== 1 || product.stock_quantity <= 0) {
          continue;
        }

        const existing = db
          .prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
          .get(req.user!.id, item.product_id) as
          | { id: number; quantity: number }
          | undefined;

        const capped = Math.min(
          product.stock_quantity,
          (existing?.quantity || 0) + item.quantity
        );
        if (capped <= 0) continue;

        if (existing) {
          db.prepare(
            `UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(capped, existing.id);
        } else {
          db.prepare(
            `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`
          ).run(req.user!.id, item.product_id, capped);
        }
      }
    });

    tx();
    res.json({ cart: calculateUserCart(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
