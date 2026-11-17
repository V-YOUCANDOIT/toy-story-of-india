import React from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';

export function WishlistPage() {
  const { user } = useAuth();
  const { items, loading } = useWishlist();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border-b border-[#30251F]/10 pb-6 mb-10">
        <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
          Saved Pieces
        </p>
        <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
          Your Wishlist
        </h1>
      </div>

      {!user ? (
        <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-14 text-center">
          <Heart className="w-10 h-10 text-[#C58F91] mx-auto mb-4" strokeWidth={1.4} />
          <h2 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
            Sign in to view your saved pieces
          </h2>
          <p className="text-sm text-[#30251F]/70 mb-7 max-w-md mx-auto">
            Your wishlist is saved securely to your Petit Atelier account across all devices.
          </p>
          <Link
            to="/login?redirect=/wishlist"
            className="inline-flex px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors"
          >
            Sign In
          </Link>
        </div>
      ) : loading ? (
        <p className="text-sm text-[#30251F]/60 py-12">Loading your saved toys…</p>
      ) : items.length === 0 ? (
        <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-14 text-center">
          <Heart className="w-10 h-10 text-[#30251F]/25 mx-auto mb-4" strokeWidth={1.3} />
          <h2 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-sm text-[#30251F]/70 mb-7 max-w-md mx-auto">
            Select the heart icon on any toy to keep track of birthday wishes and nursery essentials.
          </p>
          <Link
            to="/shop"
            className="inline-flex px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors"
          >
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
