import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { getDb } from '../database/connection.ts';
import {
  authenticate,
  clearAuthCookies,
  CSRF_COOKIE_NAME,
  getCookieOptions,
  optionalAuth,
  setAuthCookies,
} from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { authRateLimiter } from '../middleware/rateLimit.ts';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/schemas.ts';

const router = Router();

router.get('/csrf', (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing || crypto.randomBytes(24).toString('hex');
  if (!existing) {
    res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions(req, false));
  }
  res.json({ csrfToken: token });
});

router.get('/session', optionalAuth, (req, res) => {
  res.json({ user: req.user || null });
});

router.post('/register', authRateLimiter, (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = bcrypt.hashSync(data.password, 12);
    const result = db
      .prepare(
        `INSERT INTO users (name, email, phone, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 'customer', 1)`
      )
      .run(data.name, data.email, data.phone, passwordHash);

    const userId = Number(result.lastInsertRowid);
    const user = {
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'customer' as const,
    };

    const { token, csrfToken } = setAuthCookies(req, res, user);
    res.status(201).json({ user, csrfToken, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimiter, (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const db = getDb();

    const row = db
      .prepare(
        `SELECT id, name, email, phone, password_hash, role, is_active
         FROM users WHERE email = ?`
      )
      .get(data.email) as
      | {
          id: number;
          name: string;
          email: string;
          phone: string;
          password_hash: string;
          role: 'customer' | 'admin';
          is_active: number;
        }
      | undefined;

    if (!row || !bcrypt.compareSync(data.password, row.password_hash)) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (row.is_active !== 1) {
      throw new AppError('This account has been deactivated. Please contact support.', 403);
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
    };

    const { token, csrfToken } = setAuthCookies(req, res, user);
    res.json({ user, csrfToken, token });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookies(req, res);
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/forgot-password', authRateLimiter, (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const db = getDb();
    const user = db
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .get(email) as { id: number; email: string } | undefined;

    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare(
        `UPDATE users
         SET reset_token_hash = ?, reset_token_expires = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(tokenHash, expiresAt, user.id);

      res.json({
        message:
          'If an account exists for that email, a password reset link has been prepared.',
        ...(process.env.NODE_ENV !== 'production' ? { dev_reset_token: rawToken } : {}),
      });
      return;
    }

    res.json({
      message:
        'If an account exists for that email, a password reset link has been prepared.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authRateLimiter, (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
    const db = getDb();

    const user = db
      .prepare(
        `SELECT id, reset_token_expires FROM users
         WHERE reset_token_hash = ?`
      )
      .get(tokenHash) as { id: number; reset_token_expires: string | null } | undefined;

    if (
      !user ||
      !user.reset_token_expires ||
      new Date(user.reset_token_expires).getTime() < Date.now()
    ) {
      throw new AppError('Reset token is invalid or has expired.', 400);
    }

    const newHash = bcrypt.hashSync(data.password, 12);
    db.prepare(
      `UPDATE users
       SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(newHash, user.id);

    res.json({ message: 'Password updated successfully. Please sign in.' });
  } catch (err) {
    next(err);
  }
});

export default router;
