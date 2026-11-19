import type { MetadataRoute } from 'next';
import { getCatalog, getProducts } from '@/lib/data';
import { serverEnv } from '@/lib/env';
import { serviceSlug } from '@/lib/services';

const STATIC = ['/', '/services', '/amc', '/shop', '/track', '/contact', '/sell', '/legal/privacy', '/legal/terms'];

/** Every public page; service and AC pages come from the live catalog (static pages only if PYS is down). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = serverEnv().SITE_URL;
  const [catalog, products] = await Promise.all([getCatalog().catch(() => null), getProducts().catch(() => [])]);
  const services = (catalog?.services ?? []).filter((s) => s.isPublic && s.isActive).map((s) => `/services/${serviceSlug(s.code)}`);
  const acs = products.map((p) => `/shop/${encodeURIComponent(p.id)}`);
  return [...STATIC, ...services, ...acs].map((path) => ({ url: `${site}${path === '/' ? '' : path}` }));
}
