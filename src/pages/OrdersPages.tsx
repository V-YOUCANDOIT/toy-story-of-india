import React, { useEffect, useState } from 'react';
import { ArrowLeft, Package, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';
import {
  formatDate,
  formatPaymentMethod,
  formatPaymentStatus,
  formatPrice,
} from '../utils/format';

const TRACKING_STEPS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/api/orders')
      .then((res) => setOrders(res.orders))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border-b border-[#30251F]/10 pb-6 mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            Order History
          </p>
          <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
            My Orders
          </h1>
        </div>
        <Link to="/account" className="text-sm text-[#49372F] hover:underline">
          Back to Account
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#30251F]/60 py-10">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-[#30251F]/30 mx-auto mb-3" />
          <h2 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
            No orders placed yet
          </h2>
          <p className="text-sm text-[#30251F]/70 mb-6">
            Your future Petit Atelier deliveries and receipts will appear here.
          </p>
          <Link
            to="/shop"
            className="inline-flex px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium"
          >
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-[#FAF7F2] border border-[#30251F]/12 rounded-xl p-6 hover:border-[#49372F]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 text-xs text-[#30251F]/60 mb-1">
                    <span className="font-mono-tabular font-medium text-[#30251F]">
                      {order.order_number}
                    </span>
                    <span>·</span>
                    <span>{formatDate(order.created_at)}</span>
                    <span>·</span>
                    <span>
                      {order.item_count} item{order.item_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-sm text-[#30251F]/80">
                    {formatPaymentMethod(order.payment_method)} ·{' '}
                    <span
                      className={
                        order.payment_status === 'paid'
                          ? 'text-[#929B83] font-medium'
                          : order.payment_status === 'failed'
                          ? 'text-[#C58F91] font-medium'
                          : ''
                      }
                    >
                      {formatPaymentStatus(order.payment_status)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <span
                    className={`text-xs font-medium uppercase tracking-wider ${
                      order.order_status === 'Cancelled'
                        ? 'text-[#C58F91]'
                        : order.order_status === 'Delivered'
                        ? 'text-[#929B83]'
                        : 'text-[#49372F]'
                    }`}
                  >
                    {order.order_status}
                  </span>
                  <span className="text-base font-semibold tabular-nums text-[#30251F]">
                    {formatPrice(order.final_total)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast, confirm } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = () => {
    if (!id) return;
    setLoading(true);
    api
      .get<{ order: Order }>(`/api/orders/${id}`)
      .then((res) => setOrder(res.order))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Unable to load order')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const ok = await confirm({
      title: `Cancel Order ${order.order_number}?`,
      message:
        'This will cancel your shipment and immediately return reserved items to studio inventory.',
      confirmLabel: 'Cancel Order',
      destructive: true,
    });
    if (!ok) return;

    setCancelling(true);
    try {
      const res = await api.put<{ order: Order }>(`/api/orders/${order.id}/cancel`);
      setOrder(res.order);
      showToast(`Order ${order.order_number} has been cancelled.`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cancellation failed', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-[#30251F]/65">
        Loading order details…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShieldAlert className="w-10 h-10 text-[#C58F91] mx-auto mb-3" />
        <h1 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
          Order Not Accessible
        </h1>
        <p className="text-sm text-[#30251F]/70 mb-6">{error}</p>
        <Link to="/orders" className="text-sm font-medium text-[#49372F] underline">
          Return to My Orders
        </Link>
      </div>
    );
  }

  const canCancel = ['Pending', 'Confirmed'].includes(order.order_status);
  const currentStepIdx = TRACKING_STEPS.indexOf(order.order_status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#30251F]/10 pb-6">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs text-[#30251F]/65 hover:text-[#30251F] mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Orders
          </Link>
          <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
            Order <span className="font-mono-tabular text-3xl">{order.order_number}</span>
          </h1>
          <p className="text-xs text-[#30251F]/60 mt-1">
            Placed on {formatDate(order.created_at)} ·{' '}
            {formatPaymentMethod(order.payment_method)} ·{' '}
            {formatPaymentStatus(order.payment_status)}
          </p>
        </div>

        {canCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancelOrder}
            className="px-4 py-2 rounded-md border border-[#C58F91] text-xs font-medium text-[#30251F] hover:bg-[#C58F91]/15 transition-colors self-start sm:self-auto"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>

      {/* Status Timeline */}
      {order.order_status === 'Cancelled' ? (
        <div className="bg-[#C58F91]/15 border border-[#C58F91] rounded-xl p-5 text-sm text-[#30251F]">
          This order was cancelled. Reserved inventory has been restored.
        </div>
      ) : (
        <div className="bg-[#F0E8DD]/65 border border-[#30251F]/10 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60 mb-4">
            Fulfillment Progress
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {TRACKING_STEPS.map((st, idx) => {
              const reached = idx <= currentStepIdx;
              return (
                <div key={st} className="space-y-2">
                  <div
                    className={`h-1.5 rounded-full ${
                      reached ? 'bg-[#929B83]' : 'bg-[#30251F]/12'
                    }`}
                  />
                  <p
                    className={`text-xs ${
                      reached ? 'font-semibold text-[#30251F]' : 'text-[#30251F]/45'
                    }`}
                  >
                    {st}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items + Address + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
            Ordered Pieces
          </h2>
          <div className="divide-y divide-[#30251F]/10 border-y border-[#30251F]/10">
            {order.items?.map((item) => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-[#F0E8DD] overflow-hidden border border-[#30251F]/10 shrink-0">
                  <SafeImage
                    src={item.product_image_snapshot}
                    alt={item.product_name_snapshot}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif-editorial text-xl font-semibold text-[#30251F] truncate">
                    {item.product_name_snapshot}
                  </p>
                  <p className="text-xs text-[#30251F]/60 font-mono-tabular">
                    SKU {item.product_sku_snapshot} · Qty {item.quantity} ×{' '}
                    {formatPrice(item.unit_discount_price ?? item.unit_price)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#30251F]">
                  {formatPrice(item.line_total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-xl p-5 space-y-2 text-sm">
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/60">
              Delivery Address
            </h3>
            <p className="font-medium text-[#30251F]">
              {order.shipping_address_snapshot.full_name}
            </p>
            <p className="text-xs text-[#30251F]/75 leading-relaxed">
              {order.shipping_address_snapshot.line1}
              {order.shipping_address_snapshot.line2
                ? `, ${order.shipping_address_snapshot.line2}`
                : ''}
              <br />
              {order.shipping_address_snapshot.city},{' '}
              {order.shipping_address_snapshot.state}{' '}
              {order.shipping_address_snapshot.postal_code}
              <br />
              {order.shipping_address_snapshot.country}
              <br />
              {order.shipping_address_snapshot.phone}
            </p>
          </div>

          <div className="bg-[#F0E8DD]/65 border border-[#30251F]/10 rounded-xl p-5 space-y-2 text-sm">
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/60 mb-2">
              Receipt Breakdown
            </h3>
            <div className="flex justify-between text-[#30251F]/75">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-[#929B83]">
                <span>Discounts</span>
                <span className="tabular-nums">-{formatPrice(order.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#30251F]/75">
              <span>Delivery</span>
              <span className="tabular-nums">
                {order.delivery_charge === 0
                  ? 'Complimentary'
                  : formatPrice(order.delivery_charge)}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base text-[#30251F] pt-2 border-t border-[#30251F]/10">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.final_total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
