import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();

  const saved = isSaved(product.id);
  const hasDiscount =
    product.discounted_price !== null && product.discounted_price < product.price;
  const outOfStock = product.stock_quantity <= 0;

  // At most 1 subtle unboxed editorial text indicator
  let subtleLabel = '';
  if (outOfStock) {
    subtleLabel = 'Sold Out';
  } else if (product.stock_quantity <= 5) {
    subtleLabel = `Only ${product.stock_quantity} left`;
  } else if (product.is_bestseller) {
    subtleLabel = 'Bestseller';
  } else if (product.is_new_arrival) {
    subtleLabel = 'New Arrival';
  }

  return (
    <article className="group flex flex-col bg-[#FAF7F2] border border-[#30251F]/10 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-[#F0E8DD] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <SafeImage
            src={product.images[0]}
            alt={product.name}
            fallbackTitle={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#FAF7F2]/90 backdrop-blur-sm border border-[#30251F]/10 flex items-center justify-center text-[#30251F] hover:bg-[#FAF7F2] transition-colors"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              saved ? 'fill-[#C58F91] text-[#C58F91]' : 'text-[#30251F]/70'
            }`}
            strokeWidth={1.6}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-[#30251F]/60 mb-1.5">
          <span className="truncate">
            {product.brand} · {product.age_recommendation}
          </span>
          {subtleLabel && (
            <span
              className={`whitespace-nowrap shrink-0 font-medium ${
                outOfStock
                  ? 'text-[#C58F91]'
                  : product.stock_quantity <= 5
                  ? 'text-[#C58F91]'
                  : 'text-[#929B83]'
              }`}
            >
              {subtleLabel}
            </span>
          )}
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="font-serif-editorial text-xl font-semibold text-[#30251F] leading-snug hover:text-[#49372F] transition-colors line-clamp-2 mb-3"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-3 border-t border-[#30251F]/8 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-semibold text-[#30251F]">
              {formatPrice(hasDiscount ? product.discounted_price! : product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#30251F]/45 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product, 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-[#49372F] text-[#FAF7F2] hover:bg-[#30251F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.7} />
            {outOfStock ? 'Sold Out' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </article>
  );
}
