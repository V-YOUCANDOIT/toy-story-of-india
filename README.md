# Petit Atelier — Heirloom Toy E-Commerce Platform

A full-stack luxury editorial toy e-commerce platform built with React 19, TypeScript, Vite, Tailwind CSS 4, Express, and SQLite (`better-sqlite3`).

---

## Project Structure

```text
/
├── server.ts                  # Unified Express + Vite (dev) / Static (prod) server
├── scripts/
│   ├── setup.ts               # Runs database migrations + idempotent seeding
│   └── seed.ts                # Standalone seed runner
├── server/
│   ├── config/env.ts          # Environment variable configuration
│   ├── database/
│   │   ├── connection.ts      # SQLite connection (WAL + Foreign Keys)
│   │   ├── migrations.ts      # Relational schema & indexes
│   │   └── seed.ts            # Initial admin, 12 categories, 14 products, settings
│   ├── middleware/
│   │   ├── auth.ts            # JWT HTTP-only cookie auth, RBAC, double-submit CSRF
│   │   ├── errorHandler.ts    # Centralized JSON error formatting
│   │   └── rateLimit.ts       # Auth & general API rate limiters
│   ├── routes/
│   │   ├── adminRoutes.ts     # Protected admin analytics, orders, customers, inventory, settings
│   │   ├── authRoutes.ts      # Register, login, logout, me, password reset, CSRF
│   │   ├── cartRoutes.ts      # Persistent cart CRUD + guest cart merge
│   │   ├── categoryRoutes.ts  # Category listing & admin CRUD
│   │   ├── orderRoutes.ts     # Order placement, history, details, cancellation
│   │   ├── paymentRoutes.ts   # Payment config, initiation, HMAC verification, webhooks
│   │   ├── productRoutes.ts   # Search/filter/sort catalog, details, image upload, admin CRUD
│   │   ├── publicRoutes.ts    # Health check, newsletter, contact form
│   │   ├── userRoutes.ts      # Profile & saved delivery addresses
│   │   └── wishlistRoutes.ts  # Saved wishlist items
│   ├── services/
│   │   ├── cartService.ts     # Authoritative backend price, discount & shipping math
│   │   ├── inventoryService.ts# Transactional stock deduction, restoration & audit log
│   │   ├── paymentService.ts  # COD, Demo HMAC Test Mode, and Razorpay provider abstraction
│   │   └── settingsService.ts # Store policy toggles & thresholds
│   └── validators/schemas.ts  # Zod request schemas
└── src/
    ├── components/            # CartDrawer, ProductCard, ProtectedRoute, SafeImage, Skeleton
    ├── contexts/              # AuthContext, CartContext, ToastContext, WishlistContext
    ├── layouts/StoreLayout.tsx# Header, announcement bar, search, drawer, footer
    ├── pages/                 # All 17 storefront pages + AdminDashboardPage
    ├── services/api.ts        # Credentialed fetch wrapper with CSRF injection
    ├── types/index.ts         # Shared TypeScript interfaces
    └── utils/format.ts        # Currency, date, and payment label formatters
```

---

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Initialize and seed the database:**
   ```bash
   npm run setup
   ```
3. **Start the development server (port 3000):**
   ```bash
   npm run dev
   ```

### Production Build & Start

```bash
npm run build
npm run start
```

### Default Seeded Accounts (Development)
- **Administrator:** `admin@petitatelier.com` / `AtelierAdmin2026!` (override via `ADMIN_EMAIL` & `ADMIN_PASSWORD`)
- **Demo Customer:** `claire.bennett@example.com` / `Customer2026!`

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` — Server port (default `3000`)
- `NODE_ENV` — `development` or `production`
- `APP_URL` — Public base URL
- `CORS_ORIGIN` — Comma-separated allowed origins if hosting frontend separately
- `DATABASE_PATH` — SQLite database file path (e.g. `/var/data/petit_atelier.db` on Render)
- `JWT_SECRET` — Strong random secret for signing JWT auth cookies
- `COOKIE_SECRET` — Secret for cookie signing
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — Initial seeded admin credentials
- `PAYMENT_PROVIDER` — `demo` or `razorpay`
- `PAYMENT_TEST_MODE` — `true` to enable controlled test-mode HMAC payment verification
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — Live Razorpay gateway keys

---

## Render Deployment Instructions

1. Create a **New Web Service** connected to your repository.
2. Attach a **Persistent Disk** (e.g. mount path `/var/data`, 1 GB+) so SQLite customer, order, and product records persist across deploys.
3. Set Build Command: `npm install && npm run build`
4. Set Start Command: `npm run start`
5. Configure Environment Variables in Render Dashboard:
   - `NODE_ENV=production`
   - `DATABASE_PATH=/var/data/petit_atelier.db`
   - `JWT_SECRET=<generate-64-char-random-string>`
   - `COOKIE_SECRET=<generate-64-char-random-string>`
   - `ADMIN_EMAIL=<your-admin-email>`
   - `ADMIN_PASSWORD=<your-strong-admin-password>`
   - `PAYMENT_TEST_MODE=false` (set `true` only on staging if testing demo payments)
6. Set Health Check Path to `/api/health`.
