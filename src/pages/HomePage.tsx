import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';
import { SafeImage } from '../components/SafeImage';
import { api } from '../services/api';
import type { Category, Product } from '../types';

const AGE_GROUPS = [
  { label: '0–12 Months', value: '0-12m', note: 'Organic sensory & first rattles' },
  { label: '1–3 Years', value: '1-3 yrs', note: 'Early numeracy & push racers' },
  { label: '3–5 Years', value: '3-5 yrs', note: 'Architectural blocks & pretend play' },
  { label: '6–8 Years', value: '6-8 yrs', note: 'Strategy games & studio art kits' },
  { label: '9+ Years', value: '9+ yrs', note: 'Mechanical clockwork & STEM craft' },
];

const FEATURED_BRANDS = [
  { name: 'Atelier Nord', origin: 'Copenhagen' },
  { name: 'Maison Bois', origin: 'Lyon' },
  { name: 'Loom & Linen', origin: 'Ghent' },
  { name: 'Kleine Welt', origin: 'Munich' },
  { name: 'Oakhaven Craft', origin: 'Vermont' },
  { name: 'Chronos Play', origin: 'Zurich' },
];

const TESTIMONIALS = [
  {
    quote:
      'Every piece feels substantial and calm in our living room. The beechwood blocks have survived three years of daily castle building without a single splinter.',
    author: 'Hannah Lindqvist',
    role: 'Architect & Mother of Two, Brooklyn',
  },
  {
    quote:
      'Colette the linen bunny became an instant bedtime heirloom. Knowing the fabrics and finishes are non-toxic gives us complete peace of mind.',
    author: 'Marcus & Priya Patel',
    role: 'Parents, San Francisco',
  },
  {
    quote:
      'The walnut chess set and botanical puzzle completely replaced screen time on Sunday mornings. Beautifully packaged and delivered swiftly.',
    author: 'Eleanor Vance',
    role: 'Montessori Educator, Boston',
  },
];

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [educationalToys, setEducationalToys] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ categories: Category[] }>('/api/categories'),
      api.get<{ products: Product[] }>('/api/products?bestseller=true&limit=6'),
      api.get<{ products: Product[] }>('/api/products?new_arrival=true&limit=3'),
      api.get<{ products: Product[] }>('/api/products?category=educational-toys&limit=3'),
    ])
      .then(([catRes, bestRes, newRes, eduRes]) => {
        if (!active) return;
        setCategories(catRes.categories);
        setBestsellers(bestRes.products);
        setNewArrivals(newRes.products);
        setEducationalToys(eduRes.products);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* 1. Editorial Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 lg:pt-10 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch bg-[#F0E8DD]/65 border border-[#30251F]/10 rounded-2xl overflow-hidden">
          <div className="lg:col-span-5 p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-[#30251F]/65 mb-4">
              Heirloom Toy Atelier
            </p>
            <h1 className="font-serif-editorial text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-[#30251F] leading-[1.08] mb-5">
              Little Moments. Big Imagination.
            </h1>
            <p className="text-base text-[#30251F]/80 leading-relaxed mb-8 max-w-md">
              Thoughtfully chosen toys that inspire creativity, discovery, and endless possibilities. Crafted in European beechwood, organic Belgian linen, and natural mineral pigments.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors whitespace-nowrap"
              >
                Explore Collection
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop?sort=popularity"
                className="inline-flex items-center px-6 py-3 rounded-md border border-[#30251F]/25 text-sm font-medium text-[#30251F] hover:bg-[#FAF7F2] transition-colors whitespace-nowrap"
              >
                Shop Bestsellers
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 relative min-h-[320px] lg:min-h-[520px]">
            <SafeImage
              src="/src/assets/images/hero_wooden_atelier_1794898610305.jpg"
              alt="Handcrafted wooden blocks, walnut railway train, and linen rabbit in a sunlit nursery"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 2. Featured Collections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
              Curated Worlds
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F]">
              Explore by Collection
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#49372F] hover:text-[#30251F] border-b border-[#49372F]/30 pb-0.5 whitespace-nowrap self-start sm:self-auto"
          >
            View All 12 Categories
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group flex flex-col bg-[#FAF7F2] border border-[#30251F]/10 rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
            >
              <div className="aspect-[4/3] bg-[#F0E8DD] overflow-hidden">
                <SafeImage
                  src={cat.image_url}
                  alt={cat.name}
                  fallbackTitle={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3.5">
                <h3 className="font-serif-editorial text-lg font-semibold text-[#30251F] leading-snug">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#30251F]/55 mt-0.5 tabular-nums">
                  {cat.product_count ?? 0} piece{cat.product_count === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Bestselling Toys */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
              Atelier Favorites
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F]">
              Bestselling Heirloom Toys
            </h2>
          </div>
          <Link
            to="/shop?sort=popularity"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#49372F] hover:text-[#30251F] border-b border-[#49372F]/30 pb-0.5 whitespace-nowrap self-start sm:self-auto"
          >
            Shop All Bestsellers
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <ProductSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Age-Based Discovery Band */}
      <section className="bg-[#F0E8DD]/75 border-y border-[#30251F]/10 py-16 my-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-10">
            <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
              Developmental Stages
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F] mb-3">
              Thoughtfully Matched by Age
            </h2>
            <p className="text-sm text-[#30251F]/75 leading-relaxed">
              Every stage of childhood invites a different cadence of curiosity, from tactile infant rattles to precision clockwork builds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AGE_GROUPS.map((age) => (
              <Link
                key={age.value}
                to={`/shop?age=${encodeURIComponent(age.value)}`}
                className="group bg-[#FAF7F2] border border-[#30251F]/10 rounded-xl p-5 hover:border-[#49372F]/40 hover:-translate-y-0.5 transition-all"
              >
                <span className="font-mono-tabular text-xs text-[#929B83] font-medium block mb-2">
                  Ages {age.value}
                </span>
                <h3 className="font-serif-editorial text-2xl font-semibold text-[#30251F] mb-1.5">
                  {age.label}
                </h3>
                <p className="text-xs text-[#30251F]/65 leading-relaxed mb-4">
                  {age.note}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#49372F] group-hover:translate-x-0.5 transition-transform">
                  Browse Stage <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. New Arrivals & Educational Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-20">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
                Seasonal Studio Releases
              </p>
              <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F]">
                New Arrivals
              </h2>
            </div>
            <Link
              to="/shop?sort=newest"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#49372F] hover:text-[#30251F] border-b border-[#49372F]/30 pb-0.5 whitespace-nowrap self-start sm:self-auto"
            >
              View Latest Additions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Educational Spotlight */}
        {educationalToys.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
                  Montessori &amp; Tactile Learning
                </p>
                <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F]">
                  Educational Foundations
                </h2>
              </div>
              <Link
                to="/category/educational-toys"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#49372F] hover:text-[#30251F] border-b border-[#49372F]/30 pb-0.5 whitespace-nowrap self-start sm:self-auto"
              >
                Explore Educational Toys
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {educationalToys.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. Promotional Craftsmanship Banner + Featured Brands */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-[#30251F]/10 bg-[#30251F] text-[#FAF7F2]">
          <div className="lg:col-span-7 min-h-[280px] lg:min-h-[420px]">
            <SafeImage
              src="/src/assets/images/promo_playroom_craft_1794898614493.jpg"
              alt="Serene sunlit children playroom with wooden toys and oak shelves"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-[#C58F91] mb-3">
              The Petit Atelier Standard
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#FAF7F2] leading-tight mb-4">
              Objects Worth Keeping Long After Childhood
            </h2>
            <p className="text-sm text-[#FAF7F2]/80 leading-relaxed mb-7">
              We partner exclusively with small-workshop timber joiners, organic textile mills, and child development specialists. Every toy is finished with food-grade oils and rigorously certified for safety.
            </p>
            <Link
              to="/about"
              className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#FAF7F2] text-[#30251F] text-sm font-medium hover:bg-[#F0E8DD] transition-colors"
            >
              Read Our Craft Manifesto
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Featured Makers */}
        <div className="mt-14 pt-10 border-t border-[#30251F]/10">
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/55 text-center mb-6">
            Featured Heritage Workshops
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {FEATURED_BRANDS.map((b) => (
              <Link
                key={b.name}
                to={`/shop?brand=${encodeURIComponent(b.name)}`}
                className="py-4 px-3 rounded-lg bg-[#F0E8DD]/55 hover:bg-[#F0E8DD] border border-[#30251F]/8 transition-colors"
              >
                <span className="font-serif-editorial text-xl font-semibold text-[#30251F] block">
                  {b.name}
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#30251F]/55">
                  {b.origin}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            From Families &amp; Educators
          </p>
          <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#30251F]">
            Voices From the Playroom
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.author}
              className="bg-[#FAF7F2] border border-[#30251F]/10 rounded-xl p-7 flex flex-col justify-between"
            >
              <p className="font-serif-editorial text-xl italic text-[#30251F]/90 leading-relaxed mb-6">
                “{t.quote}”
              </p>
              <footer className="pt-4 border-t border-[#30251F]/10">
                <p className="text-sm font-semibold text-[#30251F]">{t.author}</p>
                <p className="text-xs text-[#30251F]/60 mt-0.5">{t.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
