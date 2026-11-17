import { getDb } from './connection.ts';

interface Migration {
  id: string;
  up: (db: ReturnType<typeof getDb>) => void;
}

const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL DEFAULT '',
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
          is_active INTEGER NOT NULL DEFAULT 1,
          reset_token_hash TEXT,
          reset_token_expires TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE TABLE IF NOT EXISTS addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label TEXT NOT NULL DEFAULT 'Home',
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          line1 TEXT NOT NULL,
          line2 TEXT NOT NULL DEFAULT '',
          city TEXT NOT NULL,
          state TEXT NOT NULL,
          postal_code TEXT NOT NULL,
          country TEXT NOT NULL DEFAULT 'United States',
          is_default INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
          image_url TEXT NOT NULL DEFAULT '',
          display_order INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL,
          price REAL NOT NULL CHECK(price >= 0),
          discounted_price REAL CHECK(discounted_price IS NULL OR discounted_price >= 0),
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          brand TEXT NOT NULL DEFAULT 'Petit Atelier',
          age_recommendation TEXT NOT NULL DEFAULT '3-5 yrs',
          stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
          sku TEXT NOT NULL UNIQUE,
          specifications TEXT NOT NULL DEFAULT '{}',
          images TEXT NOT NULL DEFAULT '[]',
          is_available INTEGER NOT NULL DEFAULT 1,
          is_featured INTEGER NOT NULL DEFAULT 0,
          is_bestseller INTEGER NOT NULL DEFAULT 0,
          is_new_arrival INTEGER NOT NULL DEFAULT 0,
          popularity_score INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
        CREATE INDEX IF NOT EXISTS idx_products_age ON products(age_recommendation);
        CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_bestseller, is_new_arrival);

        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL CHECK(quantity > 0),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, product_id)
        );

        CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

        CREATE TABLE IF NOT EXISTS wishlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, product_id)
        );

        CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          shipping_address_snapshot TEXT NOT NULL,
          subtotal REAL NOT NULL CHECK(subtotal >= 0),
          discount_total REAL NOT NULL DEFAULT 0 CHECK(discount_total >= 0),
          delivery_charge REAL NOT NULL DEFAULT 0 CHECK(delivery_charge >= 0),
          final_total REAL NOT NULL CHECK(final_total >= 0),
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cod', 'demo_online', 'razorpay')),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'awaiting_verification', 'paid', 'failed', 'refunded')),
          order_status TEXT NOT NULL DEFAULT 'Pending' CHECK(order_status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled')),
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          product_name_snapshot TEXT NOT NULL,
          product_sku_snapshot TEXT NOT NULL,
          product_image_snapshot TEXT NOT NULL DEFAULT '',
          unit_price REAL NOT NULL,
          unit_discount_price REAL,
          quantity INTEGER NOT NULL CHECK(quantity > 0),
          line_total REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          provider TEXT NOT NULL CHECK(provider IN ('cod', 'demo_online', 'razorpay')),
          provider_order_id TEXT NOT NULL DEFAULT '',
          provider_payment_id TEXT NOT NULL DEFAULT '',
          provider_signature TEXT NOT NULL DEFAULT '',
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          status TEXT NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated', 'pending', 'paid', 'failed', 'refunded')),
          raw_payload TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id);

        CREATE TABLE IF NOT EXISTS inventory_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          change_amount INTEGER NOT NULL,
          previous_stock INTEGER NOT NULL,
          new_stock INTEGER NOT NULL,
          reason TEXT NOT NULL,
          reference_id TEXT NOT NULL DEFAULT '',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);

        CREATE TABLE IF NOT EXISTS store_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS contact_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
];

export function runMigrations(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedStmt = db.prepare('SELECT id FROM _migrations WHERE id = ?');
  const insertStmt = db.prepare('INSERT INTO _migrations (id) VALUES (?)');

  const applyAll = db.transaction(() => {
    for (const migration of migrations) {
      const exists = appliedStmt.get(migration.id);
      if (!exists) {
        migration.up(db);
        insertStmt.run(migration.id);
      }
    }
  });

  applyAll();
}
