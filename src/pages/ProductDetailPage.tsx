import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { api } from '../services/api';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedImg, setSelectedImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError('');
    setSelectedImg(0);
    setQuantity(1);

    api
      .get<{ product: Product; related: Product[] }>(`/api/products/${id}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setRelated(res.related);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Product could not be found.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          <div className="lg:col-span-7 aspect-[4/3] bg-[#F0E8DD] rounded-2xl" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-4 w-32 bg-[#F0E8DD] rounded" />
            <div className="h-10 w-3/4 bg-[#F0E8DD] rounded" />
            <div className="h-6 w-24 bg-[#F0E8DD] rounded" />
            <div className="h-32 w-full bg-[#F0E8DD] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="font-serif-editorial text-4xl text-[#30251F] mb-3">
          Piece Unavailable
        </h1>
        <p className="text-sm text-[#30251F]/70 mb-6">{error}</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Catalogue
        </Link>
      </div>
    );
  }

  const saved = isSaved(product.id);
  const hasDiscount =
    product.discounted_price !== null && product.discounted_price < product.price;
  const effectivePrice = hasDiscount ? product.discounted_price! : product.price;
  const outOfStock = product.stock_quantity <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#30251F]/60 mb-8">
        <Link to="/" className="hover:text-[#30251F]">
          Home
        </Link>
        <span>/</span>
        <Link to={`/category/${product.category_slug}`} className="hover:text-[#30251F]">
          {product.category_name}
        </Link>
        <span>/</span>
        <span className="text-[#30251F] truncate">{product.name}</span>
      </nav>

      {/* Main Split: Sticky Gallery Left, Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[4/3] bg-[#F0E8DD] rounded-2xl overflow-hidden border border-[#30251F]/10">
            <SafeImage
              src={product.images[selectedImg] || product.images[0]}
              alt={product.name}
              fallbackTitle={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImg(idx)}
                  className={`aspect-[4/3] rounded-lg overflow-hidden border transition-all ${
                    selectedImg === idx
                      ? 'border-[#49372F] ring-1 ring-[#49372F]'
                      : 'border-[#30251F]/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={imgUrl}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
              {product.brand} · {product.category_name} · Ages {product.age_recommendation}
            </p>
            <h1 className="font-serif-editorial text-4xl sm:text-[2.6rem] font-semibold text-[#30251F] leading-tight mb-4">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-semibold text-[#30251F]">
                {formatPrice(effectivePrice)}
              </span>
              {hasDiscount && (
                <span className="text-base text-[#30251F]/45 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
              <span
                className={`text-xs font-medium ml-auto ${
                  outOfStock
                    ? 'text-[#C58F91]'
                    : product.stock_quantity <= 5
                    ? 'text-[#C58F91]'
                    : 'text-[#929B83]'
                }`}
              >
                {outOfStock
                  ? 'Currently Out of Stock'
                  : product.stock_quantity <= 5
                  ? `Low Stock · ${product.stock_quantity} remaining`
                  : `In Stock · ${product.stock_quantity} ready to ship`}
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#30251F]/80 leading-relaxed border-t border-[#30251F]/10 pt-5">
            {product.description}
          </p>

          {/* Quantity + Add to Bag */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#30251F]/20 rounded-md bg-[#FAF7F2]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={outOfStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="p-3 text-[#30251F] disabled:opacity-35 hover:bg-[#F0E8DD] transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock_quantity, q + 1))
                  }
                  disabled={outOfStock || quantity >= product.stock_quantity}
                  aria-label="Increase quantity"
                  className="p-3 text-[#30251F] disabled:opacity-35 hover:bg-[#F0E8DD] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(product, quantity)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                {outOfStock ? 'Out of Stock' : 'Add to Shopping Bag'}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                className="p-3 rounded-md border border-[#30251F]/20 hover:bg-[#F0E8DD] transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${
                    saved ? 'fill-[#C58F91] text-[#C58F91]' : 'text-[#30251F]'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Atelier Assurances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#30251F]/10 text-xs text-[#30251F]/75">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#929B83] shrink-0 mt-0.5" />
              <span>Complimentary gift wrapping &amp; shipping over $150</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#929B83] shrink-0 mt-0.5" />
              <span>EN71 &amp; ASTM F963 certified child-safe finishes</span>
            </div>
          </div>

          {/* Specifications Table */}
          <div className="pt-5 border-t border-[#30251F]/10">
            <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 mb-3">
              Specifications &amp; Provenance
            </h2>
            <dl className="divide-y divide-[#30251F]/10 text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#30251F]/60">SKU</dt>
                <dd className="font-mono-tabular text-[#30251F]">{product.sku}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#30251F]/60">Recommended Age</dt>
                <dd className="text-[#30251F]">{product.age_recommendation}</dd>
              </div>
              {Object.entries(product.specifications || {}).map(([key, val]) => (
                <div key={key} className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#30251F]/60">{key}</dt>
                  <dd className="text-[#30251F] text-right">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 pt-14 border-t border-[#30251F]/10">
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            Complementary Pieces
          </p>
          <h2 className="font-serif-editorial text-3xl font-semibold text-[#30251F] mb-8">
            You May Also Treasure
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
