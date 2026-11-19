import { getCatalog, getProducts } from '@/lib/data';
import type { KnownPages } from '@/lib/known-pages';
import { serviceSlug } from '@/lib/services';

/**
 * The list of real service and AC page addresses, for the Proxy's 404 check. Built from the same
 * cached reads as the pages. 503 when PYS cannot be reached: the Proxy then lets pages through.
 */
export async function GET(): Promise<Response> {
  try {
    const [catalog, products] = await Promise.all([getCatalog(), getProducts()]);
    const body: KnownPages = {
      services: catalog.services.filter((s) => s.isPublic && s.isActive).map((s) => serviceSlug(s.code)),
      products: products.map((p) => p.id),
    };
    return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
