import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Edit3,
  Eye,
  FolderKanban,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  Upload,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import type { Category, Order, OrderStatus, Product, StoreSettings } from '../types';
import { formatDate, formatPaymentMethod, formatPrice } from '../utils/format';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'settings';

interface DashboardData {
  metrics: {
    total_sales: number;
    total_orders: number;
    pending_orders: number;
    delivered_orders: number;
    total_customers: number;
    total_products: number;
    low_stock_count: number;
  };
  low_stock_products: Array<{
    id: number;
    name: string;
    sku: string;
    stock_quantity: number;
    price: number;
    category_name: string;
  }>;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    final_total: number;
    payment_method: string;
    payment_status: string;
    order_status: OrderStatus;
    created_at: string;
  }>;
  sales_overview: Array<{
    category_name: string;
    revenue: number;
    units_sold: number;
  }>;
}

interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_active: number;
  created_at: string;
  order_count: number;
  total_spent: number;
}

interface InventoryProduct {
  id: number;
  name: string;
  sku: string;
  brand: string;
  stock_quantity: number;
  price: number;
  is_available: number;
  category_name: string;
}

interface InventoryLog {
  id: number;
  product_name: string;
  product_sku: string;
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference_id: string;
  created_at: string;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export function AdminDashboardPage() {
  const { showToast, confirm } = useToast();
  const [tab, setTab] = useState<AdminTab>('overview');

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [inventory, setInventory] = useState<{
    low_stock_threshold: number;
    products: InventoryProduct[];
    logs: InventoryLog[];
  } | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [settings, setSettings] = useState<StoreSettings>({
    cod_enabled: true,
    free_shipping_threshold: 150,
    shipping_fee: 12,
    low_stock_threshold: 5,
    demo_payment_enabled: true,
  });

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    description: '',
    price: '',
    discounted_price: '',
    category_id: '',
    brand: 'Petit Atelier',
    age_recommendation: '3-5 yrs',
    stock_quantity: '10',
    sku: '',
    images: [] as string[],
    imageUrlInput: '',
    specText: 'Material: FSC European Beechwood\nOrigin: Handcrafted',
    is_available: true,
    is_featured: false,
    is_bestseller: false,
    is_new_arrival: true,
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    image_url: '',
    display_order: '0',
    is_active: true,
  });

  const [viewedOrder, setViewedOrder] = useState<Order | null>(null);
  const [viewedCustomer, setViewedCustomer] = useState<{
    customer: AdminCustomer;
    orders: Order[];
  } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [dashRes, prodRes, catRes, ordRes, custRes, invRes, setRes] =
        await Promise.all([
          api.get<DashboardData>('/api/admin/dashboard'),
          api.get<{ products: Product[] }>(
            '/api/products?includeUnavailable=true&limit=100'
          ),
          api.get<{ categories: Category[] }>('/api/categories?all=true'),
          api.get<{ orders: Order[] }>(
            `/api/admin/orders?q=${encodeURIComponent(orderSearch)}&status=${orderFilter}`
          ),
          api.get<{ customers: AdminCustomer[] }>('/api/admin/customers'),
          api.get<{
            low_stock_threshold: number;
            products: InventoryProduct[];
            logs: InventoryLog[];
          }>('/api/admin/inventory'),
          api.get<{ settings: StoreSettings }>('/api/admin/settings'),
        ]);
      setDashboard(dashRes);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
      setOrders(ordRes.orders);
      setCustomers(custRes.customers);
      setInventory(invRes);
      const drafts: Record<number, string> = {};
      invRes.products.forEach((p) => {
        drafts[p.id] = String(p.stock_quantity);
      });
      setStockDrafts(drafts);
      setSettings(setRes.settings);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load admin data',
        'error'
      );
    }
  }, [orderSearch, orderFilter, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      description: '',
      price: '',
      discounted_price: '',
      category_id: String(categories[0]?.id || ''),
      brand: 'Atelier Nord',
      age_recommendation: '3-5 yrs',
      stock_quantity: '15',
      sku: `PA-NEW-${Math.floor(100 + Math.random() * 900)}`,
      images: [],
      imageUrlInput: '',
      specText: 'Material: FSC European Beechwood\nFinish: Natural beeswax',
      is_available: true,
      is_featured: false,
      is_bestseller: false,
      is_new_arrival: true,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    const specsLines = Object.entries(p.specifications || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    setProdForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      discounted_price: p.discounted_price !== null ? String(p.discounted_price) : '',
      category_id: String(p.category_id),
      brand: p.brand,
      age_recommendation: p.age_recommendation,
      stock_quantity: String(p.stock_quantity),
      sku: p.sku,
      images: [...p.images],
      imageUrlInput: '',
      specText: specsLines,
      is_available: p.is_available,
      is_featured: p.is_featured,
      is_bestseller: p.is_bestseller,
      is_new_arrival: p.is_new_arrival,
    });
    setProductModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));
    setUploadingImages(true);
    try {
      const res = await api.post<{ urls: string[] }>('/api/products/upload', formData);
      setProdForm((prev) => ({
        ...prev,
        images: [...prev.images, ...res.urls],
      }));
      showToast(`Uploaded ${res.urls.length} image(s).`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const specifications: Record<string, string> = {};
    prodForm.specText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          specifications[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      });

    const payload = {
      name: prodForm.name,
      description: prodForm.description,
      price: Number(prodForm.price),
      discounted_price: prodForm.discounted_price
        ? Number(prodForm.discounted_price)
        : null,
      category_id: Number(prodForm.category_id),
      brand: prodForm.brand,
      age_recommendation: prodForm.age_recommendation,
      stock_quantity: Number(prodForm.stock_quantity),
      sku: prodForm.sku,
      specifications,
      images: prodForm.images,
      is_available: prodForm.is_available,
      is_featured: prodForm.is_featured,
      is_bestseller: prodForm.is_bestseller,
      is_new_arrival: prodForm.is_new_arrival,
    };

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, payload);
        showToast('Product updated.', 'success');
      } else {
        await api.post('/api/products', payload);
        showToast('New toy added to catalog.', 'success');
      }
      setProductModalOpen(false);
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save product', 'error');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    const ok = await confirm({
      title: `Remove "${p.name}"?`,
      message:
        'Products with existing order history will be archived (marked unavailable); otherwise they will be permanently deleted.',
      confirmLabel: 'Confirm',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await api.delete<{ message: string }>(`/api/products/${p.id}`);
      showToast(res.message, 'info');
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: catForm.name,
      description: catForm.description,
      image_url: catForm.image_url,
      display_order: Number(catForm.display_order) || 0,
      is_active: catForm.is_active,
    };
    try {
      if (editingCat) {
        await api.put(`/api/categories/${editingCat.id}`, payload);
        showToast('Category updated.', 'success');
      } else {
        await api.post('/api/categories', payload);
        showToast('Category created.', 'success');
      }
      setCatModalOpen(false);
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Category save failed', 'error');
    }
  };

  const handleDeleteCategory = async (c: Category) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      message: 'Categories can be deleted when no products remain assigned to them.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/categories/${c.id}`);
      showToast('Category deleted.', 'info');
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { order_status: status });
      showToast(`Order status updated to ${status}.`, 'success');
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const handleViewOrder = async (orderId: number) => {
    try {
      const res = await api.get<{ order: Order }>(`/api/orders/${orderId}`);
      setViewedOrder(res.order);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load order', 'error');
    }
  };

  const handleViewCustomer = async (custId: number) => {
    try {
      const res = await api.get<{ customer: AdminCustomer; orders: Order[] }>(
        `/api/admin/customers/${custId}`
      );
      setViewedCustomer(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load customer', 'error');
    }
  };

  const handleToggleCustomerActive = async (c: AdminCustomer) => {
    try {
      await api.put(`/api/admin/customers/${c.id}/status`, {
        is_active: c.is_active !== 1,
      });
      showToast(
        c.is_active === 1 ? 'Customer suspended.' : 'Customer reactivated.',
        'info'
      );
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleSaveStock = async (productId: number) => {
    const qty = Number(stockDrafts[productId]);
    if (Number.isNaN(qty) || qty < 0) {
      showToast('Enter a valid non-negative stock quantity.', 'error');
      return;
    }
    try {
      await api.put(`/api/admin/inventory/${productId}`, {
        stock_quantity: qty,
        reason: 'admin_manual_adjustment',
      });
      showToast('Inventory updated.', 'success');
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Inventory update failed', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put<{ settings: StoreSettings }>(
        '/api/admin/settings',
        settings
      );
      setSettings(res.settings);
      showToast('Store settings saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Settings save failed', 'error');
    }
  };

  const navTabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Warehouse className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#30251F]">
      {/* Admin Top Header */}
      <header className="bg-[#30251F] text-[#FAF7F2] border-b border-[#49372F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-serif-editorial text-2xl font-semibold">
              Petit Atelier Studio
            </span>
            <span className="hidden sm:inline text-xs uppercase tracking-[0.16em] text-[#FAF7F2]/60">
              Administration
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FAF7F2]/85 hover:text-[#FAF7F2] border border-[#FAF7F2]/25 px-3.5 py-1.5 rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subnav Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-8 border-b border-[#30251F]/10">
          {navTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                tab === t.id
                  ? 'bg-[#49372F] text-[#FAF7F2]'
                  : 'text-[#30251F]/75 hover:bg-[#F0E8DD]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && dashboard && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#F0E8DD]/75 border border-[#30251F]/10 rounded-xl p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60 mb-1">
                  Total Sales
                </p>
                <p className="font-serif-editorial text-3xl font-semibold tabular-nums text-[#30251F]">
                  {formatPrice(dashboard.metrics.total_sales)}
                </p>
              </div>
              <div className="bg-[#F0E8DD]/75 border border-[#30251F]/10 rounded-xl p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60 mb-1">
                  Total Orders
                </p>
                <p className="font-serif-editorial text-3xl font-semibold tabular-nums text-[#30251F]">
                  {dashboard.metrics.total_orders}
                </p>
              </div>
              <div className="bg-[#F0E8DD]/75 border border-[#30251F]/10 rounded-xl p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60 mb-1">
                  Registered Customers
                </p>
                <p className="font-serif-editorial text-3xl font-semibold tabular-nums text-[#30251F]">
                  {dashboard.metrics.total_customers}
                </p>
              </div>
              <div className="bg-[#F0E8DD]/75 border border-[#30251F]/10 rounded-xl p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60 mb-1">
                  Active Products
                </p>
                <p className="font-serif-editorial text-3xl font-semibold tabular-nums text-[#30251F]">
                  {dashboard.metrics.total_products}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Recent Orders */}
              <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                    Recent Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="text-xs text-[#49372F] hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase tracking-wider text-[#30251F]/55 border-b border-[#30251F]/10">
                      <tr>
                        <th className="py-2.5 pr-4">Order</th>
                        <th className="py-2.5 pr-4">Customer</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30251F]/8">
                      {dashboard.recent_orders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 pr-4 font-mono-tabular text-xs">
                            {o.order_number}
                          </td>
                          <td className="py-3 pr-4">{o.customer_name}</td>
                          <td className="py-3 pr-4 text-xs">{o.order_status}</td>
                          <td className="py-3 text-right font-medium tabular-nums">
                            {formatPrice(o.final_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock Alerts + Category Sales */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#FAF7F2] border border-[#C58F91]/50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-[#C58F91]" />
                    <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                      Low Stock Alerts ({dashboard.low_stock_products.length})
                    </h2>
                  </div>
                  {dashboard.low_stock_products.length === 0 ? (
                    <p className="text-xs text-[#30251F]/65">
                      All active items are well stocked.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#30251F]/10 text-sm">
                      {dashboard.low_stock_products.map((lp) => (
                        <li
                          key={lp.id}
                          className="py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{lp.name}</p>
                            <p className="text-xs text-[#30251F]/55 font-mono-tabular">
                              {lp.sku}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#C58F91] tabular-nums shrink-0">
                            {lp.stock_quantity} left
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-6">
                  <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F] mb-3">
                    Sales Overview by Category
                  </h2>
                  <div className="space-y-2.5 text-xs">
                    {dashboard.sales_overview.slice(0, 6).map((row) => (
                      <div
                        key={row.category_name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-[#30251F]/80">{row.category_name}</span>
                        <span className="font-mono-tabular font-medium text-[#30251F]">
                          {formatPrice(row.revenue)} ({row.units_sold} sold)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-editorial text-3xl font-semibold">
                Product Catalogue ({products.length})
              </h2>
              <button
                type="button"
                onClick={openCreateProduct}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F]"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F0E8DD]/70 text-xs uppercase tracking-wider text-[#30251F]/65">
                    <tr>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">SKU</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30251F]/10">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded bg-[#F0E8DD] overflow-hidden shrink-0">
                              <SafeImage
                                src={p.images[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#30251F] truncate max-w-[220px]">
                                {p.name}
                              </p>
                              <p className="text-xs text-[#30251F]/55">
                                {p.brand} · {p.age_recommendation}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-xs">{p.sku}</td>
                        <td className="py-3 px-4 text-xs">{p.category_name}</td>
                        <td className="py-3 px-4 tabular-nums">
                          {formatPrice(p.discounted_price ?? p.price)}
                          {p.discounted_price !== null && (
                            <span className="text-xs text-[#30251F]/45 line-through ml-1.5">
                              {formatPrice(p.price)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          <span
                            className={
                              p.stock_quantity <= settings.low_stock_threshold
                                ? 'text-[#C58F91] font-semibold'
                                : ''
                            }
                          >
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {p.is_available ? 'Active' : 'Unavailable'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            className="p-1.5 text-[#49372F] hover:bg-[#F0E8DD] rounded mr-1"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 text-[#C58F91] hover:bg-[#C58F91]/15 rounded"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-editorial text-3xl font-semibold">
                Categories ({categories.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingCat(null);
                  setCatForm({
                    name: '',
                    description: '',
                    image_url: '',
                    display_order: String(categories.length + 1),
                    is_active: true,
                  });
                  setCatModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F]"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCat(cat);
                            setCatForm({
                              name: cat.name,
                              description: cat.description,
                              image_url: cat.image_url,
                              display_order: String(cat.display_order),
                              is_active: Boolean(cat.is_active),
                            });
                            setCatModalOpen(true);
                          }}
                          className="p-1.5 text-[#49372F] hover:bg-[#F0E8DD] rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-[#C58F91] hover:bg-[#C58F91]/15 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#30251F]/70 leading-relaxed mb-3">
                      {cat.description}
                    </p>
                  </div>
                  <p className="text-xs font-mono-tabular text-[#30251F]/55">
                    /{cat.slug} · {cat.product_count ?? 0} product(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-serif-editorial text-3xl font-semibold">
                Order Management ({orders.length})
              </h2>
              <div className="flex flex-wrap gap-2.5">
                <input
                  type="search"
                  placeholder="Search order #, name, email…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm"
                />
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F0E8DD]/70 text-xs uppercase tracking-wider text-[#30251F]/65">
                    <tr>
                      <th className="py-3.5 px-4">Order #</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30251F]/10">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 px-4 font-mono-tabular text-xs font-medium">
                          {o.order_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{o.customer_name}</p>
                          <p className="text-xs text-[#30251F]/55">{o.customer_email}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#30251F]/70">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <p>{formatPaymentMethod(o.payment_method)}</p>
                          <p className="text-[#30251F]/60 capitalize">
                            {o.payment_status.replace('_', ' ')}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Update status for ${o.order_number}`}
                            value={o.order_status}
                            onChange={(e) =>
                              handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)
                            }
                            className="bg-[#FAF7F2] border border-[#30251F]/20 rounded px-2.5 py-1 text-xs"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {formatPrice(o.final_total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(o.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#49372F] hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <h2 className="font-serif-editorial text-3xl font-semibold">
              Registered Customers ({customers.length})
            </h2>
            <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F0E8DD]/70 text-xs uppercase tracking-wider text-[#30251F]/65">
                    <tr>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Joined</th>
                      <th className="py-3.5 px-4">Orders</th>
                      <th className="py-3.5 px-4">Total Spent</th>
                      <th className="py-3.5 px-4">Access</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30251F]/10">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-[#30251F]/55">{c.email}</p>
                        </td>
                        <td className="py-3 px-4 text-xs">{c.phone}</td>
                        <td className="py-3 px-4 text-xs">{formatDate(c.created_at)}</td>
                        <td className="py-3 px-4 tabular-nums">{c.order_count}</td>
                        <td className="py-3 px-4 tabular-nums font-medium">
                          {formatPrice(c.total_spent)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {c.is_active === 1 ? 'Active' : 'Suspended'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewCustomer(c.id)}
                            className="text-xs font-medium text-[#49372F] hover:underline"
                          >
                            History
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCustomerActive(c)}
                            className="text-xs font-medium text-[#C58F91] hover:underline"
                          >
                            {c.is_active === 1 ? 'Suspend' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === 'inventory' && inventory && (
          <div className="space-y-8">
            <h2 className="font-serif-editorial text-3xl font-semibold">
              Stock &amp; Inventory Control
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F0E8DD]/70 text-xs uppercase tracking-wider text-[#30251F]/65">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Stock Level</th>
                        <th className="py-3 px-4 text-right">Adjust</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30251F]/10">
                      {inventory.products.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-[#30251F]/55">
                              {p.category_name}
                              {p.stock_quantity <= inventory.low_stock_threshold
                                ? ' · Low Stock'
                                : ''}
                            </p>
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-xs">{p.sku}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              value={stockDrafts[p.id] ?? String(p.stock_quantity)}
                              onChange={(e) =>
                                setStockDrafts({
                                  ...stockDrafts,
                                  [p.id]: e.target.value,
                                })
                              }
                              className="w-20 bg-[#FAF7F2] border border-[#30251F]/20 rounded px-2.5 py-1 text-sm tabular-nums"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveStock(p.id)}
                              className="px-3 py-1.5 rounded bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F]"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-6">
                <h3 className="font-serif-editorial text-2xl font-semibold mb-4">
                  Recent Inventory Movements
                </h3>
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 text-xs">
                  {inventory.logs.map((log) => (
                    <div
                      key={log.id}
                      className="pb-2.5 border-b border-[#30251F]/10 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#30251F] truncate">
                          {log.product_name}
                        </p>
                        <p className="text-[#30251F]/60">
                          {log.reason.replace(/_/g, ' ')} · {log.reference_id}
                        </p>
                      </div>
                      <span
                        className={`font-mono-tabular font-semibold shrink-0 ${
                          log.change_amount < 0 ? 'text-[#C58F91]' : 'text-[#929B83]'
                        }`}
                      >
                        {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}{' '}
                        ({log.new_stock})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="max-w-xl bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-7">
            <h2 className="font-serif-editorial text-3xl font-semibold mb-6">
              Storefront &amp; Checkout Policies
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-5 text-sm">
              <label className="flex items-center justify-between p-4 rounded-xl bg-[#F0E8DD]/55 border border-[#30251F]/10">
                <div>
                  <span className="font-medium block">Cash on Delivery (COD)</span>
                  <span className="text-xs text-[#30251F]/65">
                    Allow customers to choose payment upon courier delivery
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cod_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, cod_enabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#49372F]"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-[#F0E8DD]/55 border border-[#30251F]/10">
                <div>
                  <span className="font-medium block">
                    Development Test Payment Mode
                  </span>
                  <span className="text-xs text-[#30251F]/65">
                    Controlled HMAC challenge verification for non-production testing
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.demo_payment_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, demo_payment_enabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#49372F]"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Free Shipping ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.free_shipping_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        free_shipping_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Delivery Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.shipping_fee}
                    onChange={(e) =>
                      setSettings({ ...settings, shipping_fee: Number(e.target.value) })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.low_stock_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        low_stock_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] font-medium hover:bg-[#30251F]"
              >
                Save Store Settings
              </button>
            </form>
          </div>
        )}
      </div>

      {/* PRODUCT CREATE / EDIT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30251F]/50 p-4 overflow-y-auto">
          <div className="bg-[#FAF7F2] border border-[#30251F]/15 rounded-2xl max-w-2xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif-editorial text-3xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Toy'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-2 hover:bg-[#F0E8DD] rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={prodForm.description}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, description: e.target.value })
                  }
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={prodForm.discounted_price}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, discounted_price: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodForm.stock_quantity}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, stock_quantity: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Age Group
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.age_recommendation}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, age_recommendation: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Category
                  </label>
                  <select
                    required
                    value={prodForm.category_id}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, category_id: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Brand / Maker
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Multi-Image Upload + URL List */}
              <div className="space-y-2.5 pt-1">
                <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block">
                  Product Photography ({prodForm.images.length})
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#30251F]/25 text-xs font-medium cursor-pointer hover:bg-[#F0E8DD]">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingImages ? 'Uploading…' : 'Upload Images'}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Or paste image path/URL…"
                    value={prodForm.imageUrlInput}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, imageUrlInput: e.target.value })
                    }
                    className="flex-1 min-w-[180px] bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!prodForm.imageUrlInput.trim()) return;
                      setProdForm((prev) => ({
                        ...prev,
                        images: [...prev.images, prev.imageUrlInput.trim()],
                        imageUrlInput: '',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#F0E8DD] text-xs font-medium"
                  >
                    Add URL
                  </button>
                </div>

                {prodForm.images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {prodForm.images.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative w-20 h-16 rounded-md overflow-hidden border border-[#30251F]/15"
                      >
                        <SafeImage
                          src={url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProdForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute top-0.5 right-0.5 bg-[#30251F]/80 text-[#FAF7F2] rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                  Specifications (Key: Value per line)
                </label>
                <textarea
                  rows={3}
                  value={prodForm.specText}
                  onChange={(e) => setProdForm({ ...prodForm, specText: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-xs font-mono-tabular"
                />
              </div>

              <div className="flex flex-wrap gap-5 pt-1 text-xs">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.is_available}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, is_available: e.target.checked })
                    }
                    className="accent-[#49372F]"
                  />
                  Available for Sale
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.is_featured}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, is_featured: e.target.checked })
                    }
                    className="accent-[#49372F]"
                  />
                  Featured
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.is_bestseller}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, is_bestseller: e.target.checked })
                    }
                    className="accent-[#49372F]"
                  />
                  Bestseller
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.is_new_arrival}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, is_new_arrival: e.target.checked })
                    }
                    className="accent-[#49372F]"
                  />
                  New Arrival
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#30251F]/10">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#30251F]/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] font-medium hover:bg-[#30251F]"
                >
                  {editingProduct ? 'Save Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30251F]/50 p-4">
          <div className="bg-[#FAF7F2] border border-[#30251F]/15 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif-editorial text-2xl font-semibold">
                {editingCat ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="p-1.5 hover:bg-[#F0E8DD] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm({ ...catForm, description: e.target.value })
                  }
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Image Path
                  </label>
                  <input
                    type="text"
                    value={catForm.image_url}
                    onChange={(e) =>
                      setCatForm({ ...catForm, image_url: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#30251F]/70 block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={catForm.display_order}
                    onChange={(e) =>
                      setCatForm({ ...catForm, display_order: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#30251F]/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER MODAL */}
      {viewedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30251F]/50 p-4">
          <div className="bg-[#FAF7F2] border border-[#30251F]/15 rounded-2xl max-w-xl w-full p-6 sm:p-7 max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-2xl font-semibold">
                Order {viewedOrder.order_number}
              </h3>
              <button
                type="button"
                onClick={() => setViewedOrder(null)}
                className="p-1.5 hover:bg-[#F0E8DD] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#30251F]/75 space-y-1">
              <p>
                <strong>Customer:</strong> {viewedOrder.customer_name} (
                {viewedOrder.customer_email})
              </p>
              <p>
                <strong>Ship To:</strong> {viewedOrder.shipping_address_snapshot.line1},{' '}
                {viewedOrder.shipping_address_snapshot.city},{' '}
                {viewedOrder.shipping_address_snapshot.state}{' '}
                {viewedOrder.shipping_address_snapshot.postal_code}
              </p>
              <p>
                <strong>Payment:</strong>{' '}
                {formatPaymentMethod(viewedOrder.payment_method)} ({viewedOrder.payment_status})
              </p>
            </div>
            <div className="divide-y divide-[#30251F]/10 border-y border-[#30251F]/10 text-sm">
              {viewedOrder.items?.map((i) => (
                <div key={i.id} className="py-2.5 flex justify-between">
                  <span>
                    {i.product_name_snapshot} × {i.quantity}
                  </span>
                  <span className="tabular-nums font-medium">
                    {formatPrice(i.line_total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-right font-semibold text-base tabular-nums">
              Total: {formatPrice(viewedOrder.final_total)}
            </div>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER MODAL */}
      {viewedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#30251F]/50 p-4">
          <div className="bg-[#FAF7F2] border border-[#30251F]/15 rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-editorial text-2xl font-semibold">
                {viewedCustomer.customer.name}
              </h3>
              <button
                type="button"
                onClick={() => setViewedCustomer(null)}
                className="p-1.5 hover:bg-[#F0E8DD] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#30251F]/70">
              {viewedCustomer.customer.email} · {viewedCustomer.customer.phone}
            </p>
            <h4 className="text-xs uppercase tracking-wider text-[#30251F]/60 pt-2">
              Order History ({viewedCustomer.orders.length})
            </h4>
            {viewedCustomer.orders.length === 0 ? (
              <p className="text-sm text-[#30251F]/65">No orders placed yet.</p>
            ) : (
              <div className="divide-y divide-[#30251F]/10 text-sm">
                {viewedCustomer.orders.map((o) => (
                  <div key={o.id} className="py-2.5 flex justify-between">
                    <div>
                      <span className="font-mono-tabular text-xs block">
                        {o.order_number}
                      </span>
                      <span className="text-xs text-[#30251F]/60">
                        {formatDate(o.created_at)} · {o.order_status}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatPrice(o.final_total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
