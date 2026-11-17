import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection.ts';
import { authenticate } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT w.id as wishlist_id, w.created_at as saved_at,
        p.*, c.name as category_name, c.slug as category_slug
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`
    )
    .all(req.user!.id) as Array<Record<string, unknown>>;

  const items = rows.map((r) => ({
    ...r,
    specifications: JSON.parse((r.specifications as string) || '{}'),
    images: JSON.parse((r.images as string) || '[]'),
    is_available: r.is_available === 1,
    is_featured: r.is_featured === 1,
    is_bestseller: r.is_bestseller === 1,
    is_new_arrival: r.is_new_arrival === 1,
  }));

  res.json({ items });
});

router.post('/', (req, res, next) => {
  try {
    const schema = z.object({ product_id: z.coerce.number().int().positive() });
    const { product_id } = schema.parse(req.body);
    const db = getDb();

    const prod = db
      .prepare('SELECT id FROM products WHERE id = ? AND is_available = 1')
      .get(product_id);
    if (!prod) throw new AppError('Product not found', 404);

    db.prepare(
      `INSERT OR IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)`
    ).run(req.user!.id, product_id);

    res.status(201).json({ message: 'Saved to wishlist', product_id });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const db = getDb();

    const byItem = db
      .prepare('DELETE FROM wishlist_items WHERE id = ? AND user_id = ?')
      .run(targetId, req.user!.id);

    if (byItem.changes === 0) {
      db.prepare('DELETE FROM wishlist_items WHERE product_id = ? AND user_id = ?').run(
        targetId,
        req.user!.id
      );
    }

    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
});

export default router;
