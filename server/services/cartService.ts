import { getDb } from '../database/connection.ts';
import { getStoreSettings } from './settingsService.ts';

export interface CartItemView {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  price: number;
  discounted_price: number | null;
  effective_price: number;
  line_subtotal: number;
  line_discount: number;
  line_total: number;
  stock_quantity: number;
  is_available: boolean;
  image: string;
}

export interface CartSummary {
  items: CartItemView[];
  item_count: number;
  subtotal: number;
  discount_total: number;
  delivery_charge: number;
  free_shipping_threshold: number;
  final_total: number;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateUserCart(userId: number): CartSummary {
  const db = getDb();
  const settings = getStoreSettings();

  const rows = db
    .prepare(
      `SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
        p.slug,
        p.sku,
        p.brand,
        p.price,
        p.discounted_price,
        p.stock_quantity,
        p.is_available,
        p.images
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC`
    )
    .all(userId) as Array<{
    id: number;
    product_id: number;
    quantity: number;
    name: string;
    slug: string;
    sku: string;
    brand: string;
    price: number;
    discounted_price: number | null;
    stock_quantity: number;
    is_available: number;
    images: string;
  }>;

  let subtotal = 0;
  let discountTotal = 0;
  let itemCount = 0;

  const items: CartItemView[] = rows.map((r) => {
    const imgs = JSON.parse(r.images || '[]') as string[];
    const hasDiscount =
      r.discounted_price !== null && r.discounted_price < r.price;
    const effective = hasDiscount ? Number(r.discounted_price) : Number(r.price);
    const lineSub = roundMoney(Number(r.price) * r.quantity);
    const lineTot = roundMoney(effective * r.quantity);
    const lineDisc = roundMoney(lineSub - lineTot);

    subtotal += lineSub;
    discountTotal += lineDisc;
    itemCount += r.quantity;

    return {
      id: r.id,
      product_id: r.product_id,
      quantity: r.quantity,
      name: r.name,
      slug: r.slug,
      sku: r.sku,
      brand: r.brand,
      price: Number(r.price),
      discounted_price: r.discounted_price !== null ? Number(r.discounted_price) : null,
      effective_price: effective,
      line_subtotal: lineSub,
      line_discount: lineDisc,
      line_total: lineTot,
      stock_quantity: r.stock_quantity,
      is_available: r.is_available === 1,
      image: imgs[0] || '',
    };
  });

  subtotal = roundMoney(subtotal);
  discountTotal = roundMoney(discountTotal);
  const netItemsTotal = roundMoney(subtotal - discountTotal);
  const deliveryCharge =
    items.length === 0
      ? 0
      : netItemsTotal >= settings.free_shipping_threshold
      ? 0
      : settings.shipping_fee;
  const finalTotal = roundMoney(netItemsTotal + deliveryCharge);

  return {
    items,
    item_count: itemCount,
    subtotal,
    discount_total: discountTotal,
    delivery_charge: roundMoney(deliveryCharge),
    free_shipping_threshold: settings.free_shipping_threshold,
    final_total: finalTotal,
  };
}
