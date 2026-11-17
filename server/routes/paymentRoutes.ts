import { Router } from 'express';
import { env } from '../config/env.ts';
import { authenticate } from '../middleware/auth.ts';
import {
  handleRazorpayWebhook,
  initiatePaymentForOrder,
  verifyPaymentForOrder,
} from '../services/paymentService.ts';
import { getStoreSettings } from '../services/settingsService.ts';
import { paymentCreateSchema, paymentVerifySchema } from '../validators/schemas.ts';

const router = Router();

router.get('/config', (_req, res) => {
  const settings = getStoreSettings();
  res.json({
    cod_enabled: settings.cod_enabled,
    demo_payment_enabled: env.paymentTestMode && settings.demo_payment_enabled,
    razorpay_enabled: Boolean(env.razorpayKeyId && env.razorpayKeySecret),
    free_shipping_threshold: settings.free_shipping_threshold,
    shipping_fee: settings.shipping_fee,
  });
});

router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { order_id } = paymentCreateSchema.parse(req.body);
    const result = await initiatePaymentForOrder(order_id, req.user!.id);
    res.json({ payment: result });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', authenticate, (req, res, next) => {
  try {
    const data = paymentVerifySchema.parse(req.body);
    const result = verifyPaymentForOrder({
      orderId: data.order_id,
      userId: req.user!.id,
      providerOrderId: data.provider_order_id,
      providerPaymentId: data.provider_payment_id,
      providerSignature: data.provider_signature,
      simulatedOutcome: data.simulated_outcome,
    });
    res.json({ verification: result });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', (req, res, next) => {
  try {
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    handleRazorpayWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
