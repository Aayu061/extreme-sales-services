'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';
import { DEFAULT_FILTERS, filterProducts, parseShopFilters, shopFacets, shopQuery, type ShopFilters } from '@/lib/shop';
import type { Product } from '@/lib/pys/types';
import { ProductCard } from './product-card';

const TYPES = [
  { value: 'split', label: 'Split' },
  { value: 'window', label: 'Window' },
  { value: 'cassette', label: 'Cassette' },
  { value: 'tower', label: 'Floor-standing' },
] as const;
const TONS = [
  { value: 'upto1', label: 'Up to 1 ton' },
  { value: '1.5', label: '1.5 ton' },
  { value: '2plus', label: '2 ton and above' },
] as const;
const STARS = [3, 4, 5] as const;

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors',
        pressed ? 'border border-cool bg-cool text-white dark:text-[#0b0a1f]' : 'glass text-ink hover:text-cool',
      )}
    >
      {children}
    </button>
  );
}

const selectClass = 'glass min-h-11 rounded-full px-4 text-sm font-semibold text-ink';

/** Shop list with filters. The filters live in the address (?type=split&brand=Daikin…). */
export function ShopBrowser({ products }: { products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const facets = useMemo(() => shopFacets(products), [products]);
  const filters = parseShopFilters(new URLSearchParams(params.toString()), facets.brands);
  const shown = filterProducts(products, filters);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  const go = (next: ShopFilters) => {
    const q = shopQuery(next);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const set = <K extends keyof ShopFilters>(key: K, value: ShopFilters[K]) => go({ ...filters, [key]: value });
  const toggle = <K extends keyof ShopFilters>(key: K, value: ShopFilters[K]) => set(key, filters[key] === value ? DEFAULT_FILTERS[key] : value);
  const active = shopQuery({ ...filters, sort: 'featured' }) !== '';

  const controls = (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="AC type" className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Toggle key={t.value} pressed={filters.type === t.value} onClick={() => toggle('type', t.value)}>
            {t.label}
          </Toggle>
        ))}
      </div>
      <div role="group" aria-label="Size" className="flex flex-wrap gap-2">
        {TONS.map((t) => (
          <Toggle key={t.value} pressed={filters.ton === t.value} onClick={() => toggle('ton', t.value)}>
            {t.label}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="shop-brand">
          Brand
        </label>
        <select id="shop-brand" className={selectClass} value={filters.brand ?? ''} onChange={(e) => set('brand', e.target.value || null)}>
          <option value="">All brands</option>
          {facets.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="shop-star">
          Star rating
        </label>
        <select id="shop-star" className={selectClass} value={filters.star ?? ''} onChange={(e) => set('star', (Number(e.target.value) || null) as ShopFilters['star'])}>
          <option value="">Any star rating</option>
          {STARS.map((s) => (
            <option key={s} value={s}>
              {s} star
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="shop-max">
          Highest price
        </label>
        <select id="shop-max" className={selectClass} value={filters.max ?? ''} onChange={(e) => set('max', Number(e.target.value) || null)}>
          <option value="">Any price</option>
          {facets.maxPrices.map((m) => (
            <option key={m} value={m}>
              Up to {formatInr(m)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="shop-sort">
          Sort
        </label>
        <select id="shop-sort" className={selectClass} value={filters.sort} onChange={(e) => set('sort', e.target.value as ShopFilters['sort'])}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <div className="max-md:hidden">{controls}</div>
      <div className="flex items-center justify-between gap-3 md:mt-6">
        <p className="tabular font-semibold" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'AC' : 'ACs'}
        </p>
        <div className="flex gap-2">
          {active && shown.length > 0 && (
            <button type="button" onClick={() => go(DEFAULT_FILTERS)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-cool hover:underline max-md:hidden">
              Clear filters
            </button>
          )}
          <button type="button" onClick={() => setSheet(true)} aria-expanded={sheet} className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink md:hidden">
            <SlidersHorizontal aria-hidden="true" size={18} /> Filters
          </button>
        </div>
      </div>

      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-40 flex items-end bg-black/40 md:hidden" onClick={() => setSheet(false)}>
          <div className="glass-strong pop-in max-h-[85dvh] w-full overflow-y-auto rounded-t-[30px] p-5 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xl font-extrabold">Filters</p>
              <button type="button" aria-label="Close filters" onClick={() => setSheet(false)} className="neu-raised inline-flex size-11 items-center justify-center rounded-full">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            {controls}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => go(DEFAULT_FILTERS)} className="min-h-12 flex-1 rounded-full font-semibold text-cool">
                Clear all
              </button>
              <button type="button" onClick={() => setSheet(false)} className="min-h-12 flex-1 rounded-full bg-taxi font-bold text-taxi-ink">
                Show {shown.length} {shown.length === 1 ? 'AC' : 'ACs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-8 text-center text-ink">
          <p className="text-xl font-extrabold">No ACs match these filters</p>
          <p className="mt-2 text-muted">Try fewer filters, or ask us: we can source most models.</p>
          <button type="button" onClick={() => go(DEFAULT_FILTERS)} className="mt-4 min-h-12 rounded-full bg-taxi px-6 font-bold text-taxi-ink">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
