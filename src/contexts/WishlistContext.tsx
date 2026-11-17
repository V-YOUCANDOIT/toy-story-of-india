import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Product } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextValue {
  items: Product[];
  loading: boolean;
  isSaved: (productId: number) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ items: Product[] }>('/api/wishlist');
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      refreshWishlist();
    }
  }, [authLoading, refreshWishlist]);

  const isSaved = useCallback(
    (productId: number) => items.some((i) => i.id === productId),
    [items]
  );

  const toggleWishlist = async (product: Product) => {
    if (!user) {
      showToast('Please sign in to save toys to your wishlist.', 'info');
      return;
    }

    const currentlySaved = isSaved(product.id);
    try {
      if (currentlySaved) {
        await api.delete(`/api/wishlist/${product.id}`);
        setItems((prev) => prev.filter((i) => i.id !== product.id));
        showToast(`Removed "${product.name}" from your wishlist.`, 'info');
      } else {
        await api.post('/api/wishlist', { product_id: product.id });
        setItems((prev) => [product, ...prev]);
        showToast(`Saved "${product.name}" to your wishlist.`, 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update wishlist', 'error');
    }
  };

  return (
    <WishlistContext.Provider
      value={{ items, loading, isSaved, toggleWishlist, refreshWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
