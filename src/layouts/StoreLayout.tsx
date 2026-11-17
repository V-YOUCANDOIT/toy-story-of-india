import React, { useState } from 'react';
import {
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CartDrawer } from '../components/CartDrawer';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useWishlist } from '../contexts/WishlistContext';
import { api } from '../services/api';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { cart, setDrawerOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [bannerVisible, setBannerVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/shop');
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribing(true);
    try {
      const res = await api.post<{ message: string }>('/api/newsletter', {
        email: newsletterEmail.trim(),
      });
      showToast(res.message, 'success');
      setNewsletterEmail('');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not subscribe at this moment.',
        'error'
      );
    } finally {
      setSubscribing(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm tracking-wide transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b ${
      isActive
        ? 'text-[#30251F] border-[#30251F] font-medium'
        : 'text-[#30251F]/75 border-transparent hover:text-[#30251F] hover:border-[#30251F]/30'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#30251F]">
      {/* Slim Dismissible Announcement Bar */}
      {bannerVisible && (
        <div className="bg-[#30251F] text-[#FAF7F2] text-xs px-4 py-2 flex items-center justify-center relative">
          <p className="text-center tracking-wide pr-6">
            Complimentary linen gift wrapping &amp; shipping on orders over $150
          </p>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FAF7F2]/70 hover:text-[#FAF7F2] p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Header — Clean Three-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#30251F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 -ml-2 text-[#30251F]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link
              to="/"
              className="font-serif-editorial text-2xl sm:text-[26px] font-semibold tracking-tight text-[#30251F] whitespace-nowrap shrink-0"
            >
              Petit Atelier
            </Link>
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/shop" className={navLinkClass}>
              Shop All
            </NavLink>
            <NavLink to="/category/wooden-toys" className={navLinkClass}>
              Wooden Toys
            </NavLink>
            <NavLink to="/category/educational-toys" className={navLinkClass}>
              Educational
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              Our Story
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
          </nav>

          {/* Zone 3: Functional Utility Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Toggle search"
              className="p-2 rounded-md text-[#30251F]/80 hover:text-[#30251F] hover:bg-[#F0E8DD]/70 transition-colors"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </button>

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative p-2 rounded-md text-[#30251F]/80 hover:text-[#30251F] hover:bg-[#F0E8DD]/70 transition-colors"
            >
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.6} />
              {wishlistItems.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C58F91] text-[#30251F] text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                aria-label="Admin Dashboard"
                title="Administrator Dashboard"
                className="p-2 rounded-md text-[#49372F] hover:bg-[#F0E8DD]/70 transition-colors"
              >
                <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={1.7} />
              </Link>
            )}

            <Link
              to={user ? '/account' : '/login'}
              aria-label={user ? 'My Account' : 'Sign In'}
              className="p-2 rounded-md text-[#30251F]/80 hover:text-[#30251F] hover:bg-[#F0E8DD]/70 transition-colors"
            >
              <UserIcon className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open shopping bag"
              className="relative inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-md bg-[#49372F] text-[#FAF7F2] hover:bg-[#30251F] transition-colors text-xs font-medium whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={1.6} />
              <span className="tabular-nums">{cart.item_count}</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#30251F]/10 bg-[#FAF7F2] px-4 py-3">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-2xl mx-auto flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#30251F]/50 shrink-0" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wooden railways, Montessori blocks, organic plushies…"
                className="w-full bg-transparent text-sm text-[#30251F] placeholder:text-[#30251F]/45 focus:outline-none py-1.5"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F] transition-colors whitespace-nowrap shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#30251F]/10 bg-[#FAF7F2] px-6 py-5 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pb-3 border-b border-[#30251F]/10">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search toys…"
                className="flex-1 bg-[#F0E8DD]/70 rounded-md px-3 py-2 text-sm text-[#30251F] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium"
              >
                Go
              </button>
            </form>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Shop All Toys
              </Link>
              <Link to="/category/wooden-toys" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Wooden Toys
              </Link>
              <Link to="/category/educational-toys" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Educational Toys
              </Link>
              <Link to="/category/soft-toys-plushies" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Soft Toys
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                About Us
              </Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Contact Us
              </Link>
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                My Orders
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="py-1.5 font-semibold text-[#49372F]">
                  Admin Studio
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* Editorial Footer */}
      <footer className="bg-[#F0E8DD] border-t border-[#30251F]/10 text-[#30251F] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Brand Column */}
            <div className="md:col-span-4 space-y-4">
              <Link
                to="/"
                className="font-serif-editorial text-3xl font-semibold text-[#30251F] inline-block"
              >
                Petit Atelier
              </Link>
              <p className="text-sm text-[#30251F]/75 leading-relaxed max-w-sm">
                Thoughtfully curated heirloom toys, Montessori learning objects, and organic keepsakes crafted to honor childhood wonder.
              </p>
              <p className="text-xs text-[#30251F]/55">
                418 Mercer Street, New York · Concierge Mon–Sat
              </p>
            </div>

            {/* Shop Links */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/60">
                Collections
              </h3>
              <ul className="space-y-2 text-sm text-[#30251F]/80">
                <li>
                  <Link to="/shop" className="hover:text-[#30251F] transition-colors">
                    Shop All Toys
                  </Link>
                </li>
                <li>
                  <Link to="/category/educational-toys" className="hover:text-[#30251F] transition-colors">
                    Educational Toys
                  </Link>
                </li>
                <li>
                  <Link to="/category/building-blocks" className="hover:text-[#30251F] transition-colors">
                    Building Blocks
                  </Link>
                </li>
                <li>
                  <Link to="/category/soft-toys-plushies" className="hover:text-[#30251F] transition-colors">
                    Soft Toys &amp; Plushies
                  </Link>
                </li>
                <li>
                  <Link to="/category/wooden-toys" className="hover:text-[#30251F] transition-colors">
                    Wooden Toys
                  </Link>
                </li>
              </ul>
            </div>

            {/* Client Care */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/60">
                Atelier
              </h3>
              <ul className="space-y-2 text-sm text-[#30251F]/80">
                <li>
                  <Link to="/about" className="hover:text-[#30251F] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#30251F] transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="hover:text-[#30251F] transition-colors">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-[#30251F] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#30251F] transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/60">
                The Atelier Letter
              </h3>
              <p className="text-sm text-[#30251F]/75 leading-relaxed">
                Seasonal releases, developmental play notes, and small-batch woodcraft arrivals.
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-2 pt-1">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 min-w-0 bg-[#FAF7F2] border border-[#30251F]/15 rounded-md px-3.5 py-2.5 text-sm text-[#30251F] placeholder:text-[#30251F]/40 focus:outline-none focus:border-[#49372F]"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-4 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {subscribing ? 'Joining…' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#30251F]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#30251F]/60">
            <p>© {new Date().getFullYear()} Petit Atelier Toy Merchants. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="hover:text-[#30251F] transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-[#30251F] transition-colors">
                Terms
              </Link>
              <Link to="/cart" className="hover:text-[#30251F] transition-colors">
                Shopping Bag
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
