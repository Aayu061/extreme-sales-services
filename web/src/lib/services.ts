import type { CatalogService } from '@/lib/pys/types';

/** How services are grouped on /services and in the home X-ray list (design doc §7). */
export const SERVICE_GROUPS = [
  { category: 'CLEANING', label: 'Cleaning' },
  { category: 'GAS', label: 'Gas' },
  { category: 'INSTALLATION', label: 'Installation' },
  { category: 'DIAGNOSIS', label: 'Diagnosis' },
  { category: 'REPAIR', label: 'Repairs', note: 'Priced after the diagnosis visit' },
] as const;

type Groupable = Pick<CatalogService, 'code' | 'category'> & Partial<Pick<CatalogService, 'isPublic' | 'isActive' | 'displayOrder'>>;

export interface ServiceGroup<T> {
  category: string;
  label: string;
  note?: string;
  items: T[];
}

const visible = (s: Groupable) => s.isPublic !== false && s.isActive !== false;

/** Public, active services by group in the agreed order; unknown groups follow under their own name. */
export function groupServices<T extends Groupable>(services: T[]): ServiceGroup<T>[] {
  const sorted = services.filter(visible).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const known = SERVICE_GROUPS.map((g) => ({ ...g, items: sorted.filter((s) => s.category === g.category) }));
  const knownCats = new Set<string>(SERVICE_GROUPS.map((g) => g.category));
  const extraCats = [...new Set(sorted.map((s) => s.category).filter((c) => !knownCats.has(c)))];
  const extra = extraCats.map((c) => ({ category: c, label: c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' '), items: sorted.filter((s) => s.category === c) }));
  return [...known, ...extra].filter((g) => g.items.length > 0);
}

/** Service pages use the lower-case code: /services/svc-jet-wash. */
export const serviceSlug = (code: string) => code.toLowerCase();

export function findService(services: CatalogService[], slug: string): CatalogService | null {
  const code = decodeURIComponent(slug).toUpperCase();
  return services.find((s) => s.code === code && visible(s)) ?? null;
}

/** Other services to suggest: the same kind first, then the rest, in display order. */
export function relatedServices(services: CatalogService[], s: CatalogService, n = 3): CatalogService[] {
  const others = services.filter((x) => x.code !== s.code && visible(x)).sort((a, b) => a.displayOrder - b.displayOrder);
  return [...others.filter((x) => x.category === s.category), ...others.filter((x) => x.category !== s.category)].slice(0, n);
}
