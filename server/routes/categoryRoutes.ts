import { Router } from 'express';
import { getDb } from '../database/connection.ts';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { categorySchema } from '../validators/schemas.ts';

const router = Router();

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const includeInactive = req.user?.role === 'admin' && req.query.all === 'true';

  const categories = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_available = 1) as product_count
       FROM categories c
       ${includeInactive ? '' : 'WHERE c.is_active = 1'}
       ORDER BY c.display_order ASC, c.name ASC`
    )
    .all();

  res.json({ categories });
});

router.post('/', authenticate, requireAdmin, (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const slug = data.slug || toSlug(data.name);
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        slug,
        data.description,
        data.image_url,
        data.display_order,
        data.is_active ? 1 : 0
      );

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(Number(result.lastInsertRowid));

    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = categorySchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id, slug FROM categories WHERE id = ?').get(id) as
      | { id: number; slug: string }
      | undefined;
    if (!existing) throw new AppError('Category not found', 404);

    const slug = data.slug || toSlug(data.name);
    db.prepare(
      `UPDATE categories
       SET name = ?, slug = ?, description = ?, image_url = ?, display_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.name,
      slug,
      data.description,
      data.image_url,
      data.display_order,
      data.is_active ? 1 : 0,
      id
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) throw new AppError('Category not found', 404);

    const linkedProducts = (
      db
        .prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?')
        .get(id) as { count: number }
    ).count;

    if (linkedProducts > 0) {
      throw new AppError(
        `Cannot delete category while ${linkedProducts} product(s) are assigned to it. Reassign those products first.`,
        409
      );
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
