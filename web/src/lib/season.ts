import type { HomeOffer } from '@/lib/pys/types';

/** What the hero's offer card shows: an offer published in ESS admin, or this month's tip. */
export interface HeroCard {
  kind: 'offer' | 'season';
  title: string;
  text: string;
  href: string | null;
  linkLabel: string;
}

/**
 * The offers worth showing: a title, an optional link that stays inside the site, and not past
 * its last day (India date). Anything malformed from the content block is dropped quietly.
 */
export function activeOffers(items: unknown, now: Date): HomeOffer[] {
  if (!Array.isArray(items)) return [];
  const today = indiaDate(now);
  return items.filter((item): item is HomeOffer => {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    if (typeof o.title !== 'string' || !o.title.trim()) return false;
    if (o.href != null && !(typeof o.href === 'string' && o.href.startsWith('/') && !o.href.startsWith('//'))) return false;
    return !(typeof o.endsOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.endsOn) && o.endsOn < today);
  });
}

/** "YYYY-MM-DD" in Mumbai. */
export function indiaDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** Site copy, not offers: no prices or discounts. Changes by itself with the Mumbai season. */
export function seasonNote(now: Date): HeroCard {
  const month = Number(indiaDate(now).slice(5, 7));
  if (month >= 3 && month <= 5) {
    return { kind: 'season', title: 'Pre-summer service', text: 'Get your AC cleaned before the heat arrives.', href: '/services/svc-jet-wash', linkLabel: 'See jet wash' };
  }
  if (month >= 6 && month <= 9) {
    return { kind: 'season', title: 'Monsoon AC care', text: 'A foam wash clears the musty monsoon smell.', href: '/services/svc-foam', linkLabel: 'See foam wash' };
  }
  if (month === 10) {
    return { kind: 'season', title: 'October heat', text: "Check your AC's gas before the heat peaks.", href: '/services/svc-gas', linkLabel: 'See gas check' };
  }
  return { kind: 'season', title: 'Plan the year', text: 'An AMC covers your regular service visits.', href: '/amc', linkLabel: 'Compare AMC plans' };
}

/** First live offer from ESS admin, otherwise the season note. */
export function heroOfferCard(offers: HomeOffer[], now: Date): HeroCard {
  const [offer] = activeOffers(offers, now);
  if (!offer) return seasonNote(now);
  return {
    kind: 'offer',
    title: offer.title,
    text: offer.text ?? '',
    href: offer.href ?? null,
    linkLabel: offer.linkLabel || 'See the offer',
  };
}
