import { kindOf, type AcKind } from '@/lib/ac-kind';
import type { Product } from '@/lib/pys/types';

/** Shop filters, kept in the address bar so a filtered list can be shared or bookmarked. */
export interface ShopFilters {
  type: AcKind | null;
  ton: 'upto1' | '1.5' | '2plus' | null;
  brand: string | null;
  star: 3 | 4 | 5 | null;
  max: number | null;
  sort: 'featured' | 'price-asc' | 'price-desc';
}

export const DEFAULT_FILTERS: ShopFilters = { type: null, ton: null, brand: null, star: null, max: null, sort: 'featured' };

const KINDS: readonly AcKind[] = ['split', 'window', 'cassette', 'tower'];
const TONS = ['upto1', '1.5', '2plus'] as const;
const SORTS = ['featured', 'price-asc', 'price-desc'] as const;
export const PRICE_STEPS = [30000, 40000, 50000, 75000, 100000] as const;

export function parseShopFilters(p: URLSearchParams, brands: string[]): ShopFilters {
  const type = p.get('type');
  const ton = p.get('ton');
  const brand = p.get('brand')?.trim().toLowerCase();
  const star = Number(p.get('star'));
  const max = Number(p.get('max'));
  const sort = p.get('sort');
  return {
    type: KINDS.includes(type as AcKind) ? (type as AcKind) : null,
    ton: TONS.includes(ton as (typeof TONS)[number]) ? (ton as ShopFilters['ton']) : null,
    brand: brand ? (brands.find((b) => b.toLowerCase() === brand) ?? null) : null,
    star: star === 3 || star === 4 || star === 5 ? star : null,
    max: Number.isInteger(max) && max > 0 ? max : null,
    sort: SORTS.includes(sort as ShopFilters['sort']) ? (sort as ShopFilters['sort']) : 'featured',
  };
}

export function shopQuery(f: ShopFilters): string {
  const q = new URLSearchParams();
  if (f.type) q.set('type', f.type);
  if (f.ton) q.set('ton', f.ton);
  if (f.brand) q.set('brand', f.brand);
  if (f.star) q.set('star', String(f.star));
  if (f.max) q.set('max', String(f.max));
  if (f.sort !== 'featured') q.set('sort', f.sort);
  return q.toString();
}

/** First number in the tonnage text when it is in tons ("1.5 TR" → 1.5); CFM/HP ratings → null. */
export function tonnageOf(p: Pick<Product, 'tonnage'>): number | null {
  const m = p.tonnage?.match(/(\d+(?:\.\d+)?)\s*(?:tr|ton)/i);
  return m ? Number(m[1]) : null;
}

export function starOf(p: Pick<Product, 'starRating' | 'name'>): number | null {
  const m = (p.starRating ?? '').match(/([1-5])\s*-?\s*star/i) ?? p.name.match(/([1-5])\s*-?\s*star/i);
  return m ? Number(m[1]) : null;
}

function tonBucket(t: number | null): ShopFilters['ton'] {
  if (t === null) return null;
  if (t <= 1) return 'upto1';
  if (t <= 1.5) return '1.5';
  return '2plus';
}

export function filterProducts(products: Product[], f: ShopFilters): Product[] {
  const out = products.filter(
    (p) =>
      (!f.type || kindOf(p.name) === f.type) &&
      (!f.ton || tonBucket(tonnageOf(p)) === f.ton) &&
      (!f.brand || p.brand === f.brand) &&
      (!f.star || starOf(p) === f.star) &&
      (!f.max || (typeof p.price === 'number' && p.price <= f.max)),
  );
  if (f.sort === 'featured') return out.sort((a, b) => a.displayOrder - b.displayOrder);
  const dir = f.sort === 'price-asc' ? 1 : -1;
  return out.sort((a, b) => {
    if (a.price === null) return b.price === null ? 0 : 1;
    if (b.price === null) return -1;
    return (a.price - b.price) * dir;
  });
}

export function shopFacets(products: Product[]): { brands: string[]; maxPrices: number[] } {
  const brands = [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))].sort((a, b) => a.localeCompare(b));
  const top = Math.max(0, ...products.map((p) => p.price ?? 0));
  return { brands, maxPrices: PRICE_STEPS.filter((s) => s < top) };
}
