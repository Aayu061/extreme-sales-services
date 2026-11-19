import { NextResponse, type NextRequest } from 'next/server';
import { isUnknownDetail, type KnownPages } from '@/lib/known-pages';

/**
 * Real 404 for mistyped service and AC addresses (/services/x, /shop/x). With Cache Components a
 * page starts streaming with status 200 before it can call notFound(), so the check happens here,
 * before the page. The list of real addresses comes from /api/known-pages (kept for a minute in
 * this process as a best-effort speed-up). If the list cannot be loaded, the page opens as usual.
 */
const TTL_MS = 60_000;
let cache: { at: number; pages: KnownPages } | null = null;

async function knownPages(origin: string): Promise<KnownPages | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.pages;
  try {
    const res = await fetch(`${origin}/api/known-pages`, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const pages = (await res.json()) as KnownPages;
    if (!Array.isArray(pages.services) || !Array.isArray(pages.products)) return null;
    cache = { at: Date.now(), pages };
    return pages;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pages = await knownPages(request.nextUrl.origin);
  if (pages && isUnknownDetail(request.nextUrl.pathname, pages)) {
    // No route matches this path, so Next.js answers with the site's not-found page and a 404.
    return NextResponse.rewrite(new URL('/_page-not-found', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/services/:code', '/shop/:id'],
};
