'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
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

/** A chip that toggles one value on and off. */
function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors',
        pressed ? 'border border-cool bg-cool text-white dark:text-[#0b0a1f]' : 'border border-line bg-surface/70 text-ink hover:border-cool hover:text-cool',
      )}
    >
      {children}
    </button>
  );
}

/** One row of a single-choice list (brand, price), with an optional count. */
function Choice({ checked, onClick, label, count }: { checked: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      // A brand with no AC for the other filters would only lead to an empty list.
      disabled={!checked && count === 0}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        checked ? 'bg-cool/12 font-semibold text-ink' : 'text-ink enabled:hover:bg-cool/8',
      )}
    >
      <span className={cn('inline-flex size-5 shrink-0 items-center justify-center rounded-full border', checked ? 'border-cool bg-cool text-white dark:text-[#0b0a1f]' : 'border-line')}>
        {checked && <Check aria-hidden="true" size={13} strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="tabular text-xs text-muted">{count}</span>}
    </button>
  );
}

function Section({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-4 first-of-type:border-0 first-of-type:pt-0">
      <legend className="mb-2.5 text-xs font-bold tracking-wide text-muted">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** Shop list with a filter panel. The filters live in the address (?type=split&brand=Daikin…). */
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
  const clearAll = () => go({ ...DEFAULT_FILTERS, sort: filters.sort });

  // Active filters as removable pills.
  const pills: Array<{ label: string; clear: () => void }> = [];
  if (filters.type) pills.push({ label: TYPES.find((t) => t.value === filters.type)!.label, clear: () => set('type', null) });
  if (filters.ton) pills.push({ label: TONS.find((t) => t.value === filters.ton)!.label, clear: () => set('ton', null) });
  if (filters.brand) pills.push({ label: filters.brand, clear: () => set('brand', null) });
  if (filters.star) pills.push({ label: `${filters.star} star`, clear: () => set('star', null) });
  if (filters.max) pills.push({ label: `Up to ${formatInr(filters.max)}`, clear: () => set('max', null) });

  // Brand counts follow the other filters, so a choice never leads to an empty list unexpectedly.
  const brandCount = (b: string | null) => filterProducts(products, { ...filters, brand: b }).length;

  const panel = (
    <section aria-label="Filters" className="glass rounded-3xl p-5 text-ink">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg">
          <SlidersHorizontal aria-hidden="true" size={18} /> Filters
        </h2>
        {pills.length > 0 && (
          <button type="button" onClick={clearAll} className="min-h-11 rounded-full px-2 text-sm font-semibold text-cool hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="space-y-4">
        <Section legend="Type">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <Toggle key={t.value} pressed={filters.type === t.value} onClick={() => toggle('type', t.value)}>
                {t.label}
              </Toggle>
            ))}
          </div>
        </Section>
        <Section legend="Size">
          <div className="flex flex-wrap gap-2">
            {TONS.map((t) => (
              <Toggle key={t.value} pressed={filters.ton === t.value} onClick={() => toggle('ton', t.value)}>
                {t.label}
              </Toggle>
            ))}
          </div>
        </Section>
        <Section legend="Brand">
          <div className="space-y-0.5">
            <div role="radiogroup" aria-label="Brand choice">
              <Choice checked={!filters.brand} onClick={() => set('brand', null)} label="All brands" count={brandCount(null)} />
              {facets.brands.map((b) => (
                <Choice key={b} checked={filters.brand === b} onClick={() => set('brand', b)} label={b} count={brandCount(b)} />
              ))}
            </div>
          </div>
        </Section>
        <Section legend="Star rating">
          <div className="flex flex-wrap gap-2">
            {STARS.map((s) => (
              <Toggle key={s} pressed={filters.star === s} onClick={() => toggle('star', s)}>
                {s} star
              </Toggle>
            ))}
          </div>
        </Section>
        <Section legend="Price">
          <div>
            <div role="radiogroup" aria-label="Price choice">
              <Choice checked={!filters.max} onClick={() => set('max', null)} label="Any price" />
              {facets.maxPrices.map((m) => (
                <Choice key={m} checked={filters.max === m} onClick={() => set('max', m)} label={`Up to ${formatInr(m)}`} />
              ))}
            </div>
          </div>
        </Section>
      </div>
    </section>
  );

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
      <aside className="max-lg:hidden lg:sticky lg:top-28">{panel}</aside>

      <div>
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-ink">
          <p className="tabular font-semibold" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'AC' : 'ACs'}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSheet(true)} aria-expanded={sheet} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold lg:hidden">
              <SlidersHorizontal aria-hidden="true" size={18} /> Filters{pills.length > 0 ? ` (${pills.length})` : ''}
            </button>
            <label htmlFor="shop-sort" className="text-sm text-muted max-sm:sr-only">
              Sort
            </label>
            <select
              id="shop-sort"
              value={filters.sort}
              onChange={(e) => set('sort', e.target.value as ShopFilters['sort'])}
              className="min-h-11 rounded-full border border-line bg-surface/70 px-3 text-sm font-semibold text-ink"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {pills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
            {pills.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={p.clear}
                  aria-label={`Remove filter: ${p.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-cool/12 px-3 text-sm font-semibold text-ink hover:bg-cool/20"
                >
                  {p.label} <X aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {sheet && (
          <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-[60] flex items-end bg-black/40 lg:hidden" onClick={() => setSheet(false)}>
            <div className="pop-in max-h-[85dvh] w-full overflow-y-auto rounded-t-[30px] bg-page p-3" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex justify-end">
                <button type="button" aria-label="Close filters" onClick={() => setSheet(false)} className="neu-raised inline-flex size-11 items-center justify-center rounded-full">
                  <X aria-hidden="true" size={20} />
                </button>
              </div>
              {panel}
              <button type="button" onClick={() => setSheet(false)} className="mt-3 min-h-12 w-full rounded-full bg-taxi font-bold text-taxi-ink">
                Show {shown.length} {shown.length === 1 ? 'AC' : 'ACs'}
              </button>
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
          <>
            {/* Heading for screen readers so the AC cards (h3) sit under an h2 on every screen size */}
            <h2 className="sr-only">ACs for sale</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
