import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { serverEnv } from '@/lib/env';
import { photoPathFromPys } from '@/lib/product-photo';
import { pysRequest } from '@/lib/pys/client';
import { heroOfferCard, seasonNote, type HeroCard } from '@/lib/season';
import type { BusinessIdentity, Catalog, ContentBlock, HomeHero, Product, ServiceArea } from '@/lib/pys/types';

/**
 * Cached reads from PYS. Each read is kept for 5 minutes and served stale while it refreshes,
 * so pages stay fast even while the PYS server wakes up. PYS also tells us when something
 * changed (POST /api/revalidate → revalidateTag), which refreshes the matching tag straight away.
 * Tags match PYS's ESS_REVALIDATE topics: catalog, products, content, areas.
 */
export const CACHE_TAGS = ['catalog', 'products', 'content', 'areas'] as const;
export type CacheTag = (typeof CACHE_TAGS)[number];

/** stale 5 min · refresh every 5 min · drop after a day without traffic. */
const SITE_DATA_LIFE = { stale: 300, revalidate: 300, expire: 86_400 } as const;

export async function getCatalog(): Promise<Catalog> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('catalog');
  return pysRequest<Catalog>('GET', '/catalog');
}

export async function getProducts(): Promise<Product[]> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('products');
  const { products } = await pysRequest<{ products: Product[] }>('GET', '/products');
  // A photo chosen in the admin area is stored in PYS as a full address; the shop shows it by its
  // site path (see lib/product-photo.ts). Other addresses are left as they are.
  const origins = [serverEnv().SITE_URL];
  return products.map((p) => ({ ...p, imageUrl: photoPathFromPys(p.imageUrl, origins) }));
}

export async function getProduct(id: string): Promise<Product | null> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('products');
  // The product list is already cached; reading from it avoids a second call per product page.
  return (await getProducts()).find((p) => p.id === id) ?? null;
}

export async function getContentBlocks(keys: string[]): Promise<Record<string, ContentBlock>> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('content');
  const query = encodeURIComponent([...keys].sort().join(','));
  return (await pysRequest<{ blocks: Record<string, ContentBlock> }>('GET', `/content?keys=${query}`)).blocks;
}

export async function getServiceAreas(): Promise<ServiceArea[]> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('areas');
  return (await pysRequest<{ areas: ServiceArea[] }>('GET', '/areas')).areas;
}

/** Shown if PYS has no published business details yet (keeps the footer and legal pages complete). */
export const FALLBACK_IDENTITY: BusinessIdentity = {
  legalName: 'Extreme Sales & Services',
  tradeName: 'Extreme Sales & Services',
  proprietorName: null,
  gstin: '27ANTPP9778J1ZO',
  address: 'Shop No. 1, Extreme Sales & Services, near Ashok Nagar Bus Stop, Samrat Ashok Nagar, Govandi, Mumbai, Maharashtra 400043',
  phone: '+91 7977805245',
  whatsapp: '+91 7977805245',
  email: 'extremess0121@gmail.com',
  hours: 'Mon–Sat, 9:00 am – 6:30 pm',
  warrantyDays: 45,
  grievanceOfficer: { name: null, email: 'extremess0121@gmail.com', phone: '+91 7977805245' },
};

export const FALLBACK_HERO: HomeHero = {
  headline: 'What does your AC need?',
  subline: 'Servicing, repairs, AMC plans and new ACs across Mumbai, Thane and Navi Mumbai.',
};

/**
 * The hero's offer card: first live offer, else this month's season note. Cached like the rest so
 * the page can be prerendered; it changes at most 5 minutes after midnight or an admin edit.
 */
export async function getHeroCard(): Promise<HeroCard> {
  'use cache';
  cacheLife(SITE_DATA_LIFE);
  cacheTag('content');
  const now = new Date();
  try {
    const blocks = await getContentBlocks(['home.offers']);
    const items = (blocks['home.offers']?.body as { items?: unknown } | undefined)?.items;
    return heroOfferCard(Array.isArray(items) ? items : [], now);
  } catch {
    return seasonNote(now);
  }
}

export async function getSiteBasics(): Promise<{ identity: BusinessIdentity; hero: HomeHero }> {
  const blocks = await getContentBlocks(['business.identity', 'home.hero']);
  return {
    identity: { ...FALLBACK_IDENTITY, ...((blocks['business.identity']?.body as Partial<BusinessIdentity>) ?? {}) },
    hero: { ...FALLBACK_HERO, ...((blocks['home.hero']?.body as Partial<HomeHero>) ?? {}) },
  };
}
