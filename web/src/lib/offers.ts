import type { HomeOffer } from '@/lib/pys/types';

/**
 * The offers worth showing: a title, an optional link that stays inside the site, and not past
 * its last day (India date). Anything malformed from the content block is dropped quietly.
 */
export function activeOffers(items: unknown, now: Date): HomeOffer[] {
  if (!Array.isArray(items)) return [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); // YYYY-MM-DD
  return items.filter((item): item is HomeOffer => {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    if (typeof o.title !== 'string' || !o.title.trim()) return false;
    if (o.href != null && !(typeof o.href === 'string' && o.href.startsWith('/') && !o.href.startsWith('//'))) return false;
    return !(typeof o.endsOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.endsOn) && o.endsOn < today);
  });
}
