import React from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils/format';

export function CartPage() {
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border-b border-[#30251F]/10 pb-6 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            Review Selection
          </p>
          <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
            Shopping Bag ({cart.item_count})
          </h1>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm text-[#49372F] hover:text-[#30251F]"
        >
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>

      {cart.items.length === 0 ? (
        <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-14 text-center">
          <ShoppingBag
            className="w-11 h-11 text-[#30251F]/25 mx-auto mb-4"
            strokeWidth={1.3}
          />
          <h2 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
            Your shopping bag is empty
          </h2>
          <p className="text-sm text-[#30251F]/70 mb-7 max-w-md mx-auto">
            Browse our curated wooden blocks, Montessori abacuses, and organic linen companions to begin your order.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors"
          >
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 divide-y divide-[#30251F]/10 border-t border-b border-[#30251F]/10">
            {cart.items.map((item) => (
              <div
                key={`${item.id}-${item.product_id}`}
                className="py-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
              >
                <Link
                  to={`/product/${item.slug}`}
                  className="w-28 h-24 rounded-xl bg-[#F0E8DD] overflow-hidden border border-[#30251F]/10 shrink-0"
                >
                  <SafeImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#30251F]/55 mb-1">
                    {item.brand} · SKU {item.sku}
                  </p>
                  <Link
                    to={`/product/${item.slug}`}
                    className="font-serif-editorial text-2xl font-semibold text-[#30251F] hover:text-[#49372F] block truncate"
                  >
                    {item.name}
                  </Link>
                  <div className="flex items-baseline gap-2 mt-1 tabular-nums text-sm">
                    <span className="font-medium text-[#30251F]">
                      {formatPrice(item.effective_price)}
                    </span>
                    {item.discounted_price !== null &&
                      item.discounted_price < item.price && (
                        <span className="text-xs text-[#30251F]/45 line-through">
                          {formatPrice(item.price)}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-5 self-end sm:self-center">
                  <div className="inline-flex items-center border border-[#30251F]/20 rounded-md bg-[#FAF7F2]">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.id, item.product_id, item.quantity - 1)
                      }
                      aria-label="Decrease quantity"
                      className="p-2 text-[#30251F]/75 hover:text-[#30251F]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.id, item.product_id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.stock_quantity}
                      aria-label="Increase quantity"
                      className="p-2 text-[#30251F]/75 hover:text-[#30251F] disabled:opacity-35"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right min-w-[82px] tabular-nums">
                    <p className="text-base font-semibold text-[#30251F]">
                      {formatPrice(item.line_total)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id, item.product_id)}
                    aria-label={`Remove ${item.name}`}
                    className="p-2 text-[#30251F]/45 hover:text-[#C58F91] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-4 bg-[#F0E8DD]/75 border border-[#30251F]/10 rounded-2xl p-7 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-[#30251F]/75">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discount_total > 0 && (
                <div className="flex justify-between text-[#929B83] font-medium">
                  <span>Collection Savings</span>
                  <span className="tabular-nums">-{formatPrice(cart.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#30251F]/75">
                <span>Standard Delivery</span>
                <span className="tabular-nums">
                  {cart.delivery_charge === 0
                    ? 'Complimentary'
                    : formatPrice(cart.delivery_charge)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-[#30251F] pt-3 border-t border-[#30251F]/12">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(cart.final_total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-[#30251F]/60 text-center">
              Complimentary gift wrapping and shipping over {formatPrice(cart.free_shipping_threshold)}.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
