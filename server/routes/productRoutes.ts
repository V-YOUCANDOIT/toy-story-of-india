import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { getDb } from '../database/connection.ts';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { productSchema } from '../validators/schemas.ts';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path
      .basename(file.originalname, safeExt)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 32);
    cb(null, `${base || 'toy'}-${Date.now()}-${Math.round(Math.random() * 1e5)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, WebP, and AVIF images are allowed.', 400));
    }
  },
});

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface RawProductRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  discounted_price: number | null;
  category_id: number;
  category_name: string;
  category_slug: string;
  brand: string;
  age_recommendation: string;
  stock_quantity: number;
  sku: string;
  specifications: string;
  images: string;
  is_available: number;
  is_featured: number;
  is_bestseller: number;
  is_new_arrival: number;
  popularity_score: number;
  created_at: string;
  updated_at: string;
}

function hydrateProduct(row: RawProductRow) {
  return {
    ...row,
    specifications: JSON.parse(row.specifications || '{}'),
    images: JSON.parse(row.images || '[]'),
    is_available: row.is_available === 1,
    is_featured: row.is_featured === 1,
    is_bestseller: row.is_bestseller === 1,
    is_new_arrival: row.is_new_arrival === 1,
  };
}

router.get('/meta/filters', (_req, res) => {
  const db = getDb();
  const brands = db
    .prepare('SELECT DISTINCT brand FROM products WHERE is_available = 1 ORDER BY brand ASC')
    .all() as Array<{ brand: string }>;
  const ages = db
    .prepare(
      'SELECT DISTINCT age_recommendation FROM products WHERE is_available = 1 ORDER BY age_recommendation ASC'
    )
    .all() as Array<{ age_recommendation: string }>;
  const priceBounds = db
    .prepare(
      'SELECT MIN(COALESCE(discounted_price, price)) as min_price, MAX(price) as max_price FROM products WHERE is_available = 1'
    )
    .get() as { min_price: number | null; max_price: number | null };

  res.json({
    brands: brands.map((b) => b.brand),
    ages: ages.map((a) => a.age_recommendation),
    min_price: priceBounds?.min_price ?? 0,
    max_price: priceBounds?.max_price ?? 500,
  });
});

router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const {
    q,
    category,
    brand,
    age,
    minPrice,
    maxPrice,
    sort = 'popularity',
    featured,
    bestseller,
    new_arrival,
    includeUnavailable,
    page = '1',
    limit = '12',
  } = req.query as Record<string, string | undefined>;

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (!(req.user?.role === 'admin' && includeUnavailable === 'true')) {
    where.push('p.is_available = 1');
  }

  if (q && q.trim()) {
    where.push(
      '(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)'
    );
    const term = `%${q.trim()}%`;
    params.push(term, term, term, term, term);
  }

  if (category && category !== 'all') {
    if (/^\d+$/.test(category)) {
      where.push('p.category_id = ?');
      params.push(Number(category));
    } else {
      where.push('c.slug = ?');
      params.push(category);
    }
  }

  if (brand && brand !== 'all') {
    where.push('p.brand = ?');
    params.push(brand);
  }

  if (age && age !== 'all') {
    where.push('p.age_recommendation = ?');
    params.push(age);
  }

  if (minPrice !== undefined && minPrice !== '') {
    where.push('COALESCE(p.discounted_price, p.price) >= ?');
    params.push(Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    where.push('COALESCE(p.discounted_price, p.price) <= ?');
    params.push(Number(maxPrice));
  }

  if (featured === 'true') where.push('p.is_featured = 1');
  if (bestseller === 'true') where.push('p.is_bestseller = 1');
  if (new_arrival === 'true') where.push('p.is_new_arrival = 1');

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  let orderBy = 'p.popularity_score DESC, p.created_at DESC';
  if (sort === 'price_asc') {
    orderBy = 'COALESCE(p.discounted_price, p.price) ASC';
  } else if (sort === 'price_desc') {
    orderBy = 'COALESCE(p.discounted_price, p.price) DESC';
  } else if (sort === 'newest') {
    orderBy = 'p.created_at DESC, p.id DESC';
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 12));
  const offset = (pageNum - 1) * pageSize;

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as RawProductRow[];

  res.json({
    products: rows.map(hydrateProduct),
    pagination: {
      total: totalRow.total,
      page: pageNum,
      limit: pageSize,
      total_pages: Math.ceil(totalRow.total / pageSize),
    },
  });
});

router.get('/:id', optionalAuth, (req, res, next) => {
  try {
    const param = req.params.id;
    const db = getDb();

    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${/^\d+$/.test(param) ? 'p.id = ?' : 'p.slug = ?'}`
      )
      .get(/^\d+$/.test(param) ? Number(param) : param) as RawProductRow | undefined;

    if (!row || (row.is_available !== 1 && req.user?.role !== 'admin')) {
      throw new AppError('Product not found', 404);
    }

    const relatedRows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.is_available = 1 AND p.id != ? AND (p.category_id = ? OR p.age_recommendation = ?)
         ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, p.popularity_score DESC
         LIMIT 4`
      )
      .all(
        row.id,
        row.category_id,
        row.age_recommendation,
        row.category_id
      ) as RawProductRow[];

    res.json({
      product: hydrateProduct(row),
      related: relatedRows.map(hydrateProduct),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.array('images', 8),
  (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/products/${f.filename}`);
    res.status(201).json({ urls });
  }
);

router.post('/', authenticate, requireAdmin, (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const db = getDb();

    const catExists = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(data.category_id);
    if (!catExists) throw new AppError('Selected category does not exist', 400);

    if (
      data.discounted_price !== null &&
      data.discounted_price !== undefined &&
      data.discounted_price >= data.price
    ) {
      throw new AppError('Discounted price must be lower than regular price', 400);
    }

    const slug = data.slug || `${toSlug(data.name)}-${Date.now().toString().slice(-4)}`;
    const info = db
      .prepare(
        `INSERT INTO products (
          name, slug, description, price, discounted_price, category_id, brand,
          age_recommendation, stock_quantity, sku, specifications, images,
          is_available, is_featured, is_bestseller, is_new_arrival
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        slug,
        data.description,
        data.price,
        data.discounted_price ?? null,
        data.category_id,
        data.brand,
        data.age_recommendation,
        data.stock_quantity,
        data.sku,
        JSON.stringify(data.specifications || {}),
        JSON.stringify(data.images || []),
        data.is_available ? 1 : 0,
        data.is_featured ? 1 : 0,
        data.is_bestseller ? 1 : 0,
        data.is_new_arrival ? 1 : 0
      );

    const newId = Number(info.lastInsertRowid);
    db.prepare(
      `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
       VALUES (?, ?, 0, ?, 'initial_create', 'ADMIN', ?)`
    ).run(newId, data.stock_quantity, data.stock_quantity, req.user!.id);

    const created = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
      )
      .get(newId) as RawProductRow;

    res.status(201).json({ product: hydrateProduct(created) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = productSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, stock_quantity, slug FROM products WHERE id = ?')
      .get(id) as { id: number; stock_quantity: number; slug: string } | undefined;
    if (!existing) throw new AppError('Product not found', 404);

    if (
      data.discounted_price !== null &&
      data.discounted_price !== undefined &&
      data.discounted_price >= data.price
    ) {
      throw new AppError('Discounted price must be lower than regular price', 400);
    }

    const slug = data.slug || existing.slug;
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE products SET
          name = ?, slug = ?, description = ?, price = ?, discounted_price = ?,
          category_id = ?, brand = ?, age_recommendation = ?, stock_quantity = ?, sku = ?,
          specifications = ?, images = ?, is_available = ?, is_featured = ?,
          is_bestseller = ?, is_new_arrival = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        data.name,
        slug,
        data.description,
        data.price,
        data.discounted_price ?? null,
        data.category_id,
        data.brand,
        data.age_recommendation,
        data.stock_quantity,
        data.sku,
        JSON.stringify(data.specifications || {}),
        JSON.stringify(data.images || []),
        data.is_available ? 1 : 0,
        data.is_featured ? 1 : 0,
        data.is_bestseller ? 1 : 0,
        data.is_new_arrival ? 1 : 0,
        id
      );

      if (existing.stock_quantity !== data.stock_quantity) {
        db.prepare(
          `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
           VALUES (?, ?, ?, ?, 'admin_product_edit', 'ADMIN', ?)`
        ).run(
          id,
          data.stock_quantity - existing.stock_quantity,
          existing.stock_quantity,
          data.stock_quantity,
          req.user!.id
        );
      }
    });
    tx();

    const updated = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
      )
      .get(id) as RawProductRow;

    res.json({ product: hydrateProduct(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) throw new AppError('Product not found', 404);

    const hasOrders = (
      db
        .prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?')
        .get(id) as { count: number }
    ).count;

    if (hasOrders > 0) {
      // Preserve order integrity by marking unavailable instead of breaking foreign keys
      db.prepare(
        `UPDATE products SET is_available = 0, updated_at = datetime('now') WHERE id = ?`
      ).run(id);
      res.json({
        message: 'Product has historical orders and was archived (marked unavailable).',
        archived: true,
      });
      return;
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted', archived: false });
  } catch (err) {
    next(err);
  }
});

export default router;
