import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  phone: z.string().trim().min(6, 'Please enter a valid phone number').max(25),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(25),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default('Home'),
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(25),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional().default(''),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(1).max(80),
  postal_code: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(80).default('United States'),
  is_default: z.boolean().optional().default(false),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().max(500).optional().default(''),
  image_url: z.string().trim().max(500).optional().default(''),
  display_order: z.coerce.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().trim().min(10).max(4000),
  price: z.coerce.number().positive('Price must be greater than zero'),
  discounted_price: z
    .union([z.coerce.number().positive(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  category_id: z.coerce.number().int().positive(),
  brand: z.string().trim().min(1).max(80),
  age_recommendation: z.string().trim().min(1).max(40),
  stock_quantity: z.coerce.number().int().min(0),
  sku: z.string().trim().min(2).max(60),
  specifications: z.record(z.string(), z.string()).optional().default({}),
  images: z.array(z.string().trim().min(1)).optional().default([]),
  is_available: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  is_bestseller: z.boolean().optional().default(false),
  is_new_arrival: z.boolean().optional().default(false),
});

export const cartItemAddSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(99),
});

export const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email().toLowerCase(),
  customer_phone: z.string().trim().min(6).max(25),
  shipping_address: z.object({
    full_name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(6).max(25),
    line1: z.string().trim().min(3).max(160),
    line2: z.string().trim().max(160).optional().default(''),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(1).max(80),
    postal_code: z.string().trim().min(3).max(20),
    country: z.string().trim().min(2).max(80).default('United States'),
  }),
  payment_method: z.enum(['cod', 'demo_online', 'razorpay']),
  notes: z.string().trim().max(500).optional().default(''),
});

export const paymentCreateSchema = z.object({
  order_id: z.coerce.number().int().positive(),
});

export const paymentVerifySchema = z.object({
  order_id: z.coerce.number().int().positive(),
  provider_order_id: z.string().min(1),
  provider_payment_id: z.string().min(1),
  provider_signature: z.string().min(1),
  simulated_outcome: z.enum(['success', 'fail']).optional(),
});

export const orderStatusUpdateSchema = z.object({
  order_status: z.enum([
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
  ]),
});

export const inventoryAdjustSchema = z.object({
  stock_quantity: z.coerce.number().int().min(0),
  reason: z.string().trim().min(2).max(120).optional().default('admin_adjustment'),
});

export const storeSettingsSchema = z.object({
  cod_enabled: z.boolean().optional(),
  free_shipping_threshold: z.coerce.number().min(0).optional(),
  shipping_fee: z.coerce.number().min(0).optional(),
  low_stock_threshold: z.coerce.number().int().min(1).optional(),
  demo_payment_enabled: z.boolean().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').toLowerCase(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(2000),
});
