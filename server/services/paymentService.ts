import crypto from 'crypto';
import { env } from '../config/env.ts';
import { getDb } from '../database/connection.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { getStoreSettings } from './settingsService.ts';

export interface PaymentInitiationResult {
  provider: 'cod' | 'demo_online' | 'razorpay';
  order_id: number;
  order_number: string;
  amount: number;
  currency: string;
  provider_order_id: string;
  challenge_signature?: string;
  razorpay_key_id?: string;
  test_mode: boolean;
  status: string;
}

function signDemoPayload(orderId: number, providerOrderId: string, amount: number): string {
  return crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`${orderId}|${providerOrderId}|${amount.toFixed(2)}`)
    .digest('hex');
}

export async function initiatePaymentForOrder(
  orderId: number,
  userId: number
): Promise<PaymentInitiationResult> {
  const db = getDb();
  const settings = getStoreSettings();

  const order = db
    .prepare(
      `SELECT id, order_number, user_id, final_total, payment_method, payment_status, order_status
       FROM orders WHERE id = ?`
    )
    .get(orderId) as
    | {
        id: number;
        order_number: string;
        user_id: number;
        final_total: number;
        payment_method: 'cod' | 'demo_online' | 'razorpay';
        payment_status: string;
        order_status: string;
      }
    | undefined;

  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.user_id !== userId) {
    throw new AppError('Access denied to this order', 403);
  }
  if (order.order_status === 'Cancelled') {
    throw new AppError('Cannot initiate payment for a cancelled order', 400);
  }
  if (order.payment_status === 'paid') {
    throw new AppError('Order is already paid', 400);
  }

  if (order.payment_method === 'cod') {
    if (!settings.cod_enabled) {
      throw new AppError('Cash on Delivery is currently disabled by store administration.', 400);
    }
    const providerOrderId = `cod_${order.order_number}`;
    db.prepare(
      `UPDATE payments
       SET provider_order_id = ?, status = 'pending', updated_at = datetime('now')
       WHERE order_id = ?`
    ).run(providerOrderId, order.id);

    return {
      provider: 'cod',
      order_id: order.id,
      order_number: order.order_number,
      amount: order.final_total,
      currency: 'USD',
      provider_order_id: providerOrderId,
      test_mode: false,
      status: 'pending',
    };
  }

  if (order.payment_method === 'demo_online') {
    if (!env.paymentTestMode || !settings.demo_payment_enabled) {
      throw new AppError(
        'Test payment mode is disabled in this environment.',
        403
      );
    }
    const providerOrderId = `demo_ord_${crypto.randomBytes(8).toString('hex')}`;
    const challengeSignature = signDemoPayload(order.id, providerOrderId, order.final_total);

    db.prepare(
      `UPDATE payments
       SET provider_order_id = ?, status = 'initiated', updated_at = datetime('now')
       WHERE order_id = ?`
    ).run(providerOrderId, order.id);

    db.prepare(
      `UPDATE orders SET payment_status = 'awaiting_verification', updated_at = datetime('now') WHERE id = ?`
    ).run(order.id);

    return {
      provider: 'demo_online',
      order_id: order.id,
      order_number: order.order_number,
      amount: order.final_total,
      currency: 'USD',
      provider_order_id: providerOrderId,
      challenge_signature: challengeSignature,
      test_mode: true,
      status: 'initiated',
    };
  }

  // Razorpay integration-ready flow
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError(
      'Razorpay gateway credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on the server.',
      503
    );
  }

  const authHeader = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
  const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(order.final_total * 100),
      currency: 'USD',
      receipt: order.order_number,
      notes: { order_id: String(order.id) },
    }),
  });

  if (!rzpResp.ok) {
    const errText = await rzpResp.text();
    throw new AppError(`Payment provider error: ${errText}`, 502);
  }

  const rzpOrder = (await rzpResp.json()) as { id: string; status: string };
  db.prepare(
    `UPDATE payments
     SET provider_order_id = ?, status = 'initiated', raw_payload = ?, updated_at = datetime('now')
     WHERE order_id = ?`
  ).run(rzpOrder.id, JSON.stringify(rzpOrder), order.id);

  db.prepare(
    `UPDATE orders SET payment_status = 'awaiting_verification', updated_at = datetime('now') WHERE id = ?`
  ).run(order.id);

  return {
    provider: 'razorpay',
    order_id: order.id,
    order_number: order.order_number,
    amount: order.final_total,
    currency: 'USD',
    provider_order_id: rzpOrder.id,
    razorpay_key_id: env.razorpayKeyId,
    test_mode: false,
    status: 'initiated',
  };
}

export function verifyPaymentForOrder(params: {
  orderId: number;
  userId: number;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
  simulatedOutcome?: 'success' | 'fail';
}): { payment_status: string; order_status: string; order_number: string } {
  const db = getDb();
  const settings = getStoreSettings();

  const order = db
    .prepare(
      `SELECT id, order_number, user_id, final_total, payment_method, payment_status, order_status
       FROM orders WHERE id = ?`
    )
    .get(params.orderId) as
    | {
        id: number;
        order_number: string;
        user_id: number;
        final_total: number;
        payment_method: 'cod' | 'demo_online' | 'razorpay';
        payment_status: string;
        order_status: string;
      }
    | undefined;

  if (!order) throw new AppError('Order not found', 404);
  if (order.user_id !== params.userId) throw new AppError('Access denied', 403);

  const paymentRow = db
    .prepare('SELECT id, provider_order_id FROM payments WHERE order_id = ?')
    .get(order.id) as { id: number; provider_order_id: string } | undefined;

  if (!paymentRow || paymentRow.provider_order_id !== params.providerOrderId) {
    throw new AppError('Payment order reference mismatch', 400);
  }

  if (order.payment_method === 'cod') {
    throw new AppError('Cash on Delivery orders cannot be verified via online verification.', 400);
  }

  if (order.payment_method === 'demo_online') {
    if (!env.paymentTestMode || !settings.demo_payment_enabled) {
      throw new AppError('Test payment mode is disabled.', 403);
    }

    // Verify server-issued cryptographic challenge signature so arbitrary client calls cannot forge paid state
    const expectedSig = signDemoPayload(order.id, params.providerOrderId, order.final_total);
    const sigBuf = Buffer.from(params.providerSignature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new AppError('Invalid cryptographic payment challenge signature', 400);
    }

    const isSuccess = params.simulatedOutcome !== 'fail';
    const nextPayStatus = isSuccess ? 'paid' : 'failed';
    const nextOrderStatus = isSuccess
      ? order.order_status === 'Pending'
        ? 'Confirmed'
        : order.order_status
      : order.order_status;

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE payments
         SET provider_payment_id = ?, provider_signature = ?, status = ?, raw_payload = ?, updated_at = datetime('now')
         WHERE order_id = ?`
      ).run(
        params.providerPaymentId,
        params.providerSignature,
        nextPayStatus,
        JSON.stringify({ mode: 'demo_test', outcome: nextPayStatus }),
        order.id
      );

      db.prepare(
        `UPDATE orders SET payment_status = ?, order_status = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(nextPayStatus, nextOrderStatus, order.id);
    });
    tx();

    return {
      payment_status: nextPayStatus,
      order_status: nextOrderStatus,
      order_number: order.order_number,
    };
  }

  // Razorpay HMAC-SHA256 verification
  if (!env.razorpayKeySecret) {
    throw new AppError('Razorpay secret not configured', 503);
  }

  const expectedRzpSig = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${params.providerOrderId}|${params.providerPaymentId}`)
    .digest('hex');

  const sigBuf = Buffer.from(params.providerSignature);
  const expBuf = Buffer.from(expectedRzpSig);
  const isAuthentic =
    sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  if (!isAuthentic) {
    db.prepare(
      `UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE order_id = ?`
    ).run(order.id);
    db.prepare(
      `UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ?`
    ).run(order.id);
    throw new AppError('Payment signature verification failed', 400);
  }

  const nextOrderStatus = order.order_status === 'Pending' ? 'Confirmed' : order.order_status;
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE payments
       SET provider_payment_id = ?, provider_signature = ?, status = 'paid', updated_at = datetime('now')
       WHERE order_id = ?`
    ).run(params.providerPaymentId, params.providerSignature, order.id);
    db.prepare(
      `UPDATE orders SET payment_status = 'paid', order_status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(nextOrderStatus, order.id);
  });
  tx();

  return {
    payment_status: 'paid',
    order_status: nextOrderStatus,
    order_number: order.order_number,
  };
}

export function handleRazorpayWebhook(rawBody: string, signatureHeader: string): void {
  if (!env.razorpayWebhookSecret) {
    throw new AppError('RAZORPAY_WEBHOOK_SECRET is not configured', 503);
  }

  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signatureHeader || '');
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };

  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity?.order_id) return;

  const db = getDb();
  const paymentRow = db
    .prepare('SELECT order_id FROM payments WHERE provider_order_id = ?')
    .get(paymentEntity.order_id) as { order_id: number } | undefined;

  if (!paymentRow) return;

  if (event.event === 'payment.captured') {
    db.transaction(() => {
      db.prepare(
        `UPDATE payments SET provider_payment_id = ?, status = 'paid', raw_payload = ?, updated_at = datetime('now') WHERE order_id = ?`
      ).run(paymentEntity.id, rawBody, paymentRow.order_id);
      db.prepare(
        `UPDATE orders SET payment_status = 'paid', order_status = CASE WHEN order_status = 'Pending' THEN 'Confirmed' ELSE order_status END, updated_at = datetime('now') WHERE id = ?`
      ).run(paymentRow.order_id);
    })();
  } else if (event.event === 'payment.failed') {
    db.transaction(() => {
      db.prepare(
        `UPDATE payments SET provider_payment_id = ?, status = 'failed', raw_payload = ?, updated_at = datetime('now') WHERE order_id = ?`
      ).run(paymentEntity.id, rawBody, paymentRow.order_id);
      db.prepare(
        `UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ?`
      ).run(paymentRow.order_id);
    })();
  }
}
