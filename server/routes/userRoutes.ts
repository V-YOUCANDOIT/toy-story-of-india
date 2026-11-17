import { Router } from 'express';
import { getDb } from '../database/connection.ts';
import { authenticate } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { addressSchema, updateProfileSchema } from '../validators/schemas.ts';

const router = Router();
router.use(authenticate);

router.put('/profile', (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const db = getDb();

    db.prepare(
      `UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(data.name, data.phone, req.user!.id);

    const updated = db
      .prepare('SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?')
      .get(req.user!.id);

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/addresses', (req, res) => {
  const db = getDb();
  const addresses = db
    .prepare(
      `SELECT id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       FROM addresses WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`
    )
    .all(req.user!.id);

  res.json({ addresses });
});

router.post('/addresses', (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);
    const db = getDb();

    const existingCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?')
        .get(req.user!.id) as { count: number }
    ).count;

    const makeDefault = data.is_default || existingCount === 0 ? 1 : 0;

    const tx = db.transaction(() => {
      if (makeDefault === 1) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(
          req.user!.id
        );
      }

      const result = db
        .prepare(
          `INSERT INTO addresses (user_id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.user!.id,
          data.label,
          data.full_name,
          data.phone,
          data.line1,
          data.line2,
          data.city,
          data.state,
          data.postal_code,
          data.country,
          makeDefault
        );

      return db
        .prepare('SELECT * FROM addresses WHERE id = ?')
        .get(Number(result.lastInsertRowid));
    });

    const address = tx();
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
});

router.put('/addresses/:id', (req, res, next) => {
  try {
    const addrId = Number(req.params.id);
    const data = addressSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, user_id FROM addresses WHERE id = ?')
      .get(addrId) as { id: number; user_id: number } | undefined;

    if (!existing) throw new AppError('Address not found', 404);
    if (existing.user_id !== req.user!.id) throw new AppError('Access denied', 403);

    const tx = db.transaction(() => {
      if (data.is_default) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(
          req.user!.id
        );
      }

      db.prepare(
        `UPDATE addresses
         SET label = ?, full_name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      ).run(
        data.label,
        data.full_name,
        data.phone,
        data.line1,
        data.line2,
        data.city,
        data.state,
        data.postal_code,
        data.country,
        data.is_default ? 1 : 0,
        addrId,
        req.user!.id
      );

      return db.prepare('SELECT * FROM addresses WHERE id = ?').get(addrId);
    });

    const address = tx();
    res.json({ address });
  } catch (err) {
    next(err);
  }
});

router.delete('/addresses/:id', (req, res, next) => {
  try {
    const addrId = Number(req.params.id);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, user_id FROM addresses WHERE id = ?')
      .get(addrId) as { id: number; user_id: number } | undefined;

    if (!existing) throw new AppError('Address not found', 404);
    if (existing.user_id !== req.user!.id) throw new AppError('Access denied', 403);

    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(
      addrId,
      req.user!.id
    );
    res.json({ message: 'Address removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
