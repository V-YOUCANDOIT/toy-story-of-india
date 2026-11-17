import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || '',
  databasePath:
    process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'petit_atelier.db'),
  jwtSecret:
    process.env.JWT_SECRET || 'petit-atelier-dev-jwt-secret-replace-in-production',
  cookieSecret:
    process.env.COOKIE_SECRET || 'petit-atelier-dev-cookie-secret-replace-in-prod',
  adminName: process.env.ADMIN_NAME || 'Atelier Director',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@petitatelier.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'AtelierAdmin2026!',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'demo',
  paymentTestMode:
    process.env.PAYMENT_TEST_MODE !== undefined
      ? process.env.PAYMENT_TEST_MODE === 'true'
      : process.env.NODE_ENV !== 'production',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
