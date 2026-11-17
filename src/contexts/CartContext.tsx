import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CartItem, CartSummary, Product } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const GUEST_CART_KEY = 'petit_atelier_guest_cart';

interface GuestCartEntry {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  cart: CartSummary;
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: number, productId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number, productId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearLocalGuestCart: () => void;
}

const EMPTY_CART: CartSummary = {
  items: [],
  item_count: 0,
  subtotal: 0,
  discount_total: 0,
  delivery_charge: 0,
  free_shipping_threshold: 150,
  final_total: 0,
};

function computeGuestCart(entries: GuestCartEntry[]): CartSummary {
  let subtotal = 0;
  let discountTotal = 0;
  let itemCount = 0;

  const items: CartItem[] = entries.map((e, idx) => {
    const p = e.product;
    const hasDisc = p.discounted_price !== null && p.discounted_price < p.price;
    const effective = hasDisc ? Number(p.discounted_price) : Number(p.price);
    const lineSub = Math.round(p.price * e.quantity * 100) / 100;
    const lineTot = Math.round(effective * e.quantity * 100) / 100;
    const lineDisc = Math.round((lineSub - lineTot) * 100) / 100;

    subtotal += lineSub;
    discountTotal += lineDisc;
    itemCount += e.quantity;

    return {
      id: -(idx + 1),
      product_id: p.id,
      quantity: e.quantity,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      brand: p.brand,
      price: p.price,
      discounted_price: p.discounted_price,
      effective_price: effective,
      line_subtotal: lineSub,
      line_discount: lineDisc,
      line_total: lineTot,
      stock_quantity: p.stock_quantity,
      is_available: p.is_available,
      image: p.images[0] || '',
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  discountTotal = Math.round(discountTotal * 100) / 100;
  const net = Math.round((subtotal - discountTotal) * 100) / 100;
  const delivery = items.length === 0 ? 0 : net >= 150 ? 0 : 12;
  const finalTotal = Math.round((net + delivery) * 100) / 100;

  return {
    items,
    item_count: itemCount,
    subtotal,
    discount_total: discountTotal,
    delivery_charge: delivery,
    free_shipping_threshold: 150,
    final_total: finalTotal,
  };
}

function readGuestCart(): GuestCartEntry[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as GuestCartEntry[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(entries: GuestCartEntry[]): void {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      const guestEntries = readGuestCart();
      setCart(computeGuestCart(guestEntries));
      return;
    }

    setLoading(true);
    try {
      const guestEntries = readGuestCart();
      if (guestEntries.length > 0) {
        const merged = await api.post<{ cart: CartSummary }>('/api/cart/merge', {
          items: guestEntries.map((g) => ({
            product_id: g.product.id,
            quantity: g.quantity,
          })),
        });
        localStorage.removeItem(GUEST_CART_KEY);
        setCart(merged.cart);
      } else {
        const data = await api.get<{ cart: CartSummary }>('/api/cart');
        setCart(data.cart);
      }
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      refreshCart();
    }
  }, [authLoading, refreshCart]);

  const addToCart = async (product: Product, quantity = 1): Promise<boolean> => {
    if (product.stock_quantity <= 0) {
      showToast(`"${product.name}" is currently out of stock.`, 'error');
      return false;
    }

    if (!user) {
      const entries = readGuestCart();
      const idx = entries.findIndex((e) => e.product.id === product.id);
      const nextQty = (idx >= 0 ? entries[idx].quantity : 0) + quantity;
      if (nextQty > product.stock_quantity) {
        showToast(
          `Only ${product.stock_quantity} unit(s) of "${product.name}" available.`,
          'error'
        );
        return false;
      }
      if (idx >= 0) {
        entries[idx] = { product, quantity: nextQty };
      } else {
        entries.push({ product, quantity: nextQty });
      }
      writeGuestCart(entries);
      setCart(computeGuestCart(entries));
      setDrawerOpen(true);
      showToast(`Added "${product.name}" to your bag.`, 'success');
      return true;
    }

    try {
      const data = await api.post<{ cart: CartSummary }>('/api/cart/items', {
        product_id: product.id,
        quantity,
      });
      setCart(data.cart);
      setDrawerOpen(true);
      showToast(`Added "${product.name}" to your bag.`, 'success');
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add item', 'error');
      return false;
    }
  };

  const updateQuantity = async (
    itemId: number,
    productId: number,
    quantity: number
  ) => {
    if (!user) {
      const entries = readGuestCart();
      const idx = entries.findIndex((e) => e.product.id === productId);
      if (idx < 0) return;
      if (quantity <= 0) {
        entries.splice(idx, 1);
      } else if (quantity > entries[idx].product.stock_quantity) {
        showToast(
          `Only ${entries[idx].product.stock_quantity} unit(s) available.`,
          'error'
        );
        return;
      } else {
        entries[idx].quantity = quantity;
      }
      writeGuestCart(entries);
      setCart(computeGuestCart(entries));
      return;
    }

    try {
      const data = await api.put<{ cart: CartSummary }>(`/api/cart/items/${itemId}`, {
        quantity,
      });
      setCart(data.cart);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update quantity', 'error');
    }
  };

  const removeItem = async (itemId: number, productId: number) => {
    if (!user) {
      const entries = readGuestCart().filter((e) => e.product.id !== productId);
      writeGuestCart(entries);
      setCart(computeGuestCart(entries));
      return;
    }

    try {
      const data = await api.delete<{ cart: CartSummary }>(`/api/cart/items/${itemId}`);
      setCart(data.cart);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove item', 'error');
    }
  };

  const clearLocalGuestCart = () => {
    localStorage.removeItem(GUEST_CART_KEY);
    if (!user) setCart(EMPTY_CART);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        drawerOpen,
        setDrawerOpen,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
        clearLocalGuestCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
