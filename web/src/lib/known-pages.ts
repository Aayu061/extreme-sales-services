/**
 * Which service and AC page addresses exist, so the Proxy can answer a real 404 for a mistyped
 * one before the page starts streaming (with Cache Components a page always starts with 200).
 */
export interface KnownPages {
  /** Lower-case service codes, as used in /services/[code]. */
  services: string[];
  /** AC (product) ids, as used in /shop/[id]. */
  products: string[];
}

const DETAIL = /^\/(services|shop)\/([^/]+)$/;

/** True only for a /services/x or /shop/x address that is not in the list. */
export function isUnknownDetail(pathname: string, known: KnownPages): boolean {
  const m = DETAIL.exec(pathname);
  if (!m) return false;
  let slug: string;
  try {
    slug = decodeURIComponent(m[2]);
  } catch {
    return false; // a broken address is left to the page itself
  }
  return m[1] === 'services' ? !known.services.includes(slug.toLowerCase()) : !known.products.includes(slug);
}
