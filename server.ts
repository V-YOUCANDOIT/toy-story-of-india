import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { env } from './server/config/env.ts';
import { runMigrations } from './server/database/migrations.ts';
import { seedDatabase } from './server/database/seed.ts';
import { csrfProtection } from './server/middleware/auth.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { generalApiLimiter } from './server/middleware/rateLimit.ts';
import adminRoutes from './server/routes/adminRoutes.ts';
import authRoutes from './server/routes/authRoutes.ts';
import cartRoutes from './server/routes/cartRoutes.ts';
import categoryRoutes from './server/routes/categoryRoutes.ts';
import orderRoutes from './server/routes/orderRoutes.ts';
import paymentRoutes from './server/routes/paymentRoutes.ts';
import productRoutes from './server/routes/productRoutes.ts';
import publicRoutes from './server/routes/publicRoutes.ts';
import userRoutes from './server/routes/userRoutes.ts';
import wishlistRoutes from './server/routes/wishlistRoutes.ts';

export async function createServer() {
  // Ensure database schema & seed exist on startup
  runMigrations();
  seedDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      xFrameOptions: false,
    })
  );

  if (env.corsOrigin) {
    app.use(
      cors({
        origin: env.corsOrigin.split(',').map((s) => s.trim()),
        credentials: true,
      })
    );
  }

  // Raw body for payment webhook signature verification
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.cookieSecret));
  app.use('/api', generalApiLimiter);
  app.use(csrfProtection);

  // Serve uploaded product images
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  // Unknown API routes return JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (!env.isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

createServer()
  .then((app) => {
    app.listen(env.port, '0.0.0.0', () => {
      console.log(`Petit Atelier server listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
