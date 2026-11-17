export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  is_active?: number;
}

export interface Address {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: number | boolean;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  discounted_price: number | null;
  category_id: number;
  category_name: string;
  category_slug: string;
  brand: string;
  age_recommendation: string;
  stock_quantity: number;
  sku: string;
  specifications: Record<string, string>;
  images: string[];
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  popularity_score: number;
  created_at: string;
}

export interface CartItem {
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
  items: CartItem[];
  item_count: number;
  subtotal: number;
  discount_total: number;
  delivery_charge: number;
  free_shipping_threshold: number;
  final_total: number;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'cod' | 'demo_online' | 'razorpay';

export type PaymentStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface ShippingAddressSnapshot {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name_snapshot: string;
  product_sku_snapshot: string;
  product_image_snapshot: string;
  unit_price: number;
  unit_discount_price: number | null;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_snapshot: ShippingAddressSnapshot;
  subtotal: number;
  discount_total: number;
  delivery_charge: number;
  final_total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string;
  item_count?: number;
  items?: OrderItem[];
  payment?: {
    id: number;
    provider: string;
    provider_order_id: string;
    provider_payment_id: string;
    amount: number;
    currency: string;
    status: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentConfig {
  cod_enabled: boolean;
  demo_payment_enabled: boolean;
  razorpay_enabled: boolean;
  free_shipping_threshold: number;
  shipping_fee: number;
}

export interface StoreSettings {
  cod_enabled: boolean;
  free_shipping_threshold: number;
  shipping_fee: number;
  low_stock_threshold: number;
  demo_payment_enabled: boolean;
}
