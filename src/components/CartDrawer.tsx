import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils/format';
import { SafeImage } from './SafeImage';

export function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (!drawerOpen) return null;

  const netSubtotal = Math.max(0, cart.subtotal - cart.discount_total);
  const freeThreshold = cart.free_shipping_threshold || 150;
  const remainingForFree = Math.max(0, freeThreshold - netSubtotal);
  const progressPct = Math.min(100, (netSubtotal / freeThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#30251F]/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <aside
        aria-label="Shopping Bag"
        className="relative z-10 w-full max-w-md bg-[#FAF7F2] h-full shadow-2xl border-l border-[#30251F]/12 flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#30251F]/10">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#49372F]" strokeWidth={1.6} />
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
              Your Bag ({cart.item_count})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close bag drawer"
            className="p-2 rounded-md text-[#30251F]/70 hover:text-[#30251F] hover:bg-[#F0E8DD] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping progress */}
        {cart.items.length > 0 && (
          <div className="px-6 py-3 bg-[#F0E8DD]/70 border-b border-[#30251F]/10">
            <p className="text-xs text-[#30251F]/80 mb-1.5">
              {remainingForFree === 0
                ? 'Complimentary gift wrapping & standard shipping unlocked.'
                : `Add ${formatPrice(remainingForFree)} more for complimentary shipping.`}
            </p>
            <div className="h-1.5 w-full bg-[#30251F]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#929B83] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cart.items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag
                className="w-10 h-10 text-[#30251F]/25 mx-auto mb-4"
                strokeWidth={1.3}
              />
              <p className="font-serif-editorial text-2xl text-[#30251F] mb-2">
                Your bag is currently empty
              </p>
              <p className="text-sm text-[#30251F]/65 mb-6 max-w-xs mx-auto">
                Explore heirloom wooden toys, Montessori blocks, and linen companions crafted for quiet wonder.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={`${item.id}-${item.product_id}`}
                className="flex gap-4 pb-5 border-b border-[#30251F]/10 last:border-b-0"
              >
                <Link
                  to={`/product/${item.slug}`}
                  onClick={() => setDrawerOpen(false)}
                  className="w-20 h-20 rounded-lg bg-[#F0E8DD] overflow-hidden shrink-0 border border-[#30251F]/8"
                >
                  <SafeImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setDrawerOpen(false)}
                      className="font-serif-editorial text-lg font-semibold text-[#30251F] leading-snug hover:text-[#49372F] truncate"
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id, item.product_id)}
                      aria-label={`Remove ${item.name}`}
                      className="text-[#30251F]/45 hover:text-[#C58F91] p-1 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#30251F]/60 mb-2">
                    {item.brand} · {formatPrice(item.effective_price)} each
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#30251F]/15 rounded-md bg-[#FAF7F2]">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.product_id, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="p-1.5 text-[#30251F]/70 hover:text-[#30251F] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.product_id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock_quantity}
                        aria-label="Increase quantity"
                        className="p-1.5 text-[#30251F]/70 hover:text-[#30251F] disabled:opacity-35 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-semibold tabular-nums text-[#30251F]">
                      {formatPrice(item.line_total)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="p-6 bg-[#F0E8DD]/60 border-t border-[#30251F]/10 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#30251F]/75">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discount_total > 0 && (
                <div className="flex justify-between text-[#929B83] font-medium">
                  <span>Savings</span>
                  <span className="tabular-nums">-{formatPrice(cart.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#30251F]/75">
                <span>Delivery</span>
                <span className="tabular-nums">
                  {cart.delivery_charge === 0
                    ? 'Complimentary'
                    : formatPrice(cart.delivery_charge)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#30251F] pt-2 border-t border-[#30251F]/10">
                <span>Estimated Total</span>
                <span className="tabular-nums">{formatPrice(cart.final_total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/cart');
                }}
                className="px-4 py-2.5 rounded-md border border-[#30251F]/25 text-sm font-medium text-[#30251F] hover:bg-[#F0E8DD] transition-colors whitespace-nowrap"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors whitespace-nowrap"
              >
                Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
