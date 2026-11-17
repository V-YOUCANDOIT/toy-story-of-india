import crypto from 'crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { getDb } from '../database/connection.ts';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  is_active: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const AUTH_COOKIE_NAME = 'pa_token';
export const CSRF_COOKIE_NAME = 'pa_csrf';

export function isHttpsRequest(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  return req.secure || proto === 'https' || (Array.isArray(proto) && proto.includes('https'));
}

export function getCookieOptions(req: Request, httpOnly: boolean): CookieOptions {
  const https = isHttpsRequest(req);
  return {
    httpOnly,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function signAuthToken(user: { id: number; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: '7d',
  });
}

export function setAuthCookies(
  req: Request,
  res: Response,
  user: { id: number; role: string }
): { token: string; csrfToken: string } {
  const token = signAuthToken(user);
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(req, true));
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions(req, false));

  return { token, csrfToken };
}

export function clearAuthCookies(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const base: CookieOptions = {
    sameSite: https ? 'none' : 'lax',
    secure: https,
    path: '/',
  };
  res.clearCookie(AUTH_COOKIE_NAME, base);
  res.clearCookie(CSRF_COOKIE_NAME, base);
}

function loadUserFromRequest(req: Request): AuthUser | undefined {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  const bearerHeader = req.headers.authorization;
  const token =
    cookieToken ||
    (bearerHeader?.startsWith('Bearer ') ? bearerHeader.slice(7) : undefined);

  if (!token) return undefined;

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as {
      sub: number;
      role: string;
    };
    const db = getDb();
    const user = db
      .prepare(
        'SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?'
      )
      .get(decoded.sub) as AuthUser | undefined;

    if (!user || user.is_active !== 1) return undefined;
    return user;
  } catch {
    return undefined;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const user = loadUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.user = user;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = loadUserFromRequest(req);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Exempt webhook endpoints (verified via provider HMAC signature)
  if (req.path === '/api/payments/webhook') {
    next();
    return;
  }

  // Validate double-submit CSRF cookie when cookie-based auth is active
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers['x-csrf-token'];
  if (csrfCookie && req.cookies?.[AUTH_COOKIE_NAME]) {
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      res.status(403).json({ error: 'Invalid or missing CSRF token' });
      return;
    }
  }

  next();
}
