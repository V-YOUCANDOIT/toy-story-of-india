import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';
import { api } from '../services/api';
import type { Category, Product } from '../types';

export function ShopPage() {
  const { slug: routeCategorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = searchParams.get('q') || '';
  const selectedCategory = routeCategorySlug || searchParams.get('category') || 'all';
  const selectedBrand = searchParams.get('brand') || 'all';
  const selectedAge = searchParams.get('age') || 'all';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'popularity';
  const page = Number(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    Promise.all([
      api.get<{ categories: Category[] }>('/api/categories'),
      api.get<{ brands: string[]; ages: string[] }>('/api/products/meta/filters'),
    ]).then(([cRes, fRes]) => {
      setCategories(cRes.categories);
      setBrands(fRes.brands);
      setAges(fRes.ages);
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedBrand !== 'all') params.set('brand', selectedBrand);
    if (selectedAge !== 'all') params.set('age', selectedAge);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '9');

    api
      .get<{
        products: Product[];
        pagination: { total: number; page: number; total_pages: number };
      }>(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setProducts(res.products);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.total_pages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [q, selectedCategory, selectedBrand, selectedAge, minPrice, maxPrice, sort, page]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const resetAllFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const pageTitle = activeCategoryObj
    ? activeCategoryObj.name
    : q
    ? `Search Results for “${q}”`
    : 'All Heirloom Toys';

  const pageSubtitle = activeCategoryObj
    ? activeCategoryObj.description
    : 'Thoughtfully crafted objects designed to nurture curiosity, dexterity, and imaginative storytelling.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="border-b border-[#30251F]/10 pb-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            Petit Atelier Catalogue
          </p>
          <h1 className="font-serif-editorial text-4xl sm:text-5xl font-semibold text-[#30251F] mb-3">
            {pageTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#30251F]/75 leading-relaxed">
            {pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[#30251F]/60 tabular-nums">
            {total} item{total === 1 ? '' : 's'}
          </span>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm text-[#30251F] focus:outline-none focus:border-[#49372F]"
          >
            <option value="popularity">Sort: Most Popular</option>
            <option value="newest">Sort: Newest Arrivals</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
          </select>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#30251F]/20 text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Filters */}
        <aside
          className={`lg:col-span-3 space-y-7 ${
            filtersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Search box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFilter('q', searchInput.trim());
            }}
            className="space-y-2"
          >
            <label className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 block">
              Search Catalogue
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#30251F]/45 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Keyword or SKU…"
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F]"
              >
                Go
              </button>
            </div>
          </form>

          {/* Category Filter */}
          {!routeCategorySlug && (
            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 mb-3">
                Category
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => updateFilter('category', 'all')}
                  className={`w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors flex items-center justify-between ${
                    selectedCategory === 'all'
                      ? 'bg-[#F0E8DD] font-medium text-[#30251F]'
                      : 'text-[#30251F]/75 hover:bg-[#F0E8DD]/50'
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateFilter('category', cat.slug)}
                    className={`w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors flex items-center justify-between ${
                      selectedCategory === cat.slug
                        ? 'bg-[#F0E8DD] font-medium text-[#30251F]'
                        : 'text-[#30251F]/75 hover:bg-[#F0E8DD]/50'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-xs text-[#30251F]/45 tabular-nums ml-2">
                      {cat.product_count ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Age Filter */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 mb-3">
              Age Recommendation
            </h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => updateFilter('age', 'all')}
                className={`w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors ${
                  selectedAge === 'all'
                    ? 'bg-[#F0E8DD] font-medium text-[#30251F]'
                    : 'text-[#30251F]/75 hover:bg-[#F0E8DD]/50'
                }`}
              >
                All Ages
              </button>
              {ages.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => updateFilter('age', age)}
                  className={`w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors ${
                    selectedAge === age
                      ? 'bg-[#F0E8DD] font-medium text-[#30251F]'
                      : 'text-[#30251F]/75 hover:bg-[#F0E8DD]/50'
                  }`}
                >
                  Ages {age}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 mb-3">
              Maker / Brand
            </h3>
            <select
              aria-label="Filter by brand"
              value={selectedBrand}
              onChange={(e) => updateFilter('brand', e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm text-[#30251F] focus:outline-none focus:border-[#49372F]"
            >
              <option value="all">All Workshops</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#30251F]/65 mb-3">
              Price Range (USD)
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                min="0"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#49372F]"
              />
              <input
                type="number"
                min="0"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#49372F]"
              />
            </div>
          </div>

          {(q || selectedBrand !== 'all' || selectedAge !== 'all' || minPrice || maxPrice || (!routeCategorySlug && selectedCategory !== 'all')) && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C58F91] hover:text-[#30251F] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <ProductSkeleton count={6} />
          ) : products.length === 0 ? (
            <div className="bg-[#F0E8DD]/55 border border-[#30251F]/10 rounded-2xl p-12 text-center">
              <h2 className="font-serif-editorial text-3xl text-[#30251F] mb-2">
                No matching pieces found
              </h2>
              <p className="text-sm text-[#30251F]/70 mb-6 max-w-md mx-auto">
                Try adjusting your age range, workshop brand, or price filters to discover other handcrafted toys.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-[#30251F]/10 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set('page', String(page - 1));
                      setSearchParams(next);
                    }}
                    className="px-4 py-2 rounded-md border border-[#30251F]/20 text-sm disabled:opacity-40 hover:bg-[#F0E8DD] transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 text-sm text-[#30251F]/75 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set('page', String(page + 1));
                      setSearchParams(next);
                    }}
                    className="px-4 py-2 rounded-md border border-[#30251F]/20 text-sm disabled:opacity-40 hover:bg-[#F0E8DD] transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
