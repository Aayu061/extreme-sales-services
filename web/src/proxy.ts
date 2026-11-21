import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isUnknownDetail, type KnownPages } from '@/lib/known-pages';
import { ADMIN_PATH_HEADER, SIGN_OUT_PATH, adminGate, adminPathOf, isAdminPath } from '@/lib/admin/gate';
import { DEV_TOKEN_COOKIE, devLoginEnabled, isDevToken } from '@/lib/admin/dev-login';
import { supabaseCookieOptions } from '@/lib/admin/supabase-cookies';
import { supabaseConfig } from '@/lib/env';

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

/**
 * /admin: refresh the Supabase session (new cookies go on the response), then let the person in,
 * send them to sign in, or keep a first sign-in on "Choose a new password". An address with no
 * admin screen is let through like any other (after the sign-in check): the admin "not found"
 * page shows, with status 200 (R13: Next ignores a status on a let-through proxy answer, and with
 * Cache Components the page has started streaming before notFound(); it is signed-in only and
 * noindex, so this is accepted). The emailed reset link
 * (/admin/reset?code=…) is swapped for a session here. Admin answers are never cached.
 * Server Actions check the session again themselves; this is only the first gate.
 */
async function adminProxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;
  // A search (old link) can be a customer's phone or email: take it out of the address at once.
  // The Requests search is kept in a cookie instead (see actions/requests.ts).
  if (searchParams.has('search')) {
    const clean = NextResponse.redirect(new URL(adminPathOf(request.nextUrl), request.url));
    clean.headers.set('Cache-Control', 'no-store');
    return clean;
  }
  // Signing out needs no session check, and must not refresh the session: a refreshed cookie on
  // this answer could land after the sign-out's own "delete" and keep the person signed in.
  if (pathname === SIGN_OUT_PATH) {
    const through = NextResponse.next();
    through.headers.set('Cache-Control', 'no-store');
    return through;
  }
  // Which admin page this is, for "sign in again, then come back here" (never the browser's own value).
  request.headers.set(ADMIN_PATH_HEADER, adminPathOf(request.nextUrl));
  let response = NextResponse.next({ request });
  let hasSession = false;
  let mustChangePassword = false;
  let destination: string | null = null;

  if (devLoginEnabled() && isDevToken(request.cookies.get(DEV_TOKEN_COOKIE)?.value)) {
    hasSession = true;
  } else {
    const config = supabaseConfig();
    if (config) {
      const supabase = createServerClient(config.url, config.anonKey, {
        cookieOptions: supabaseCookieOptions(),
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(list, headers) {
            for (const { name, value } of list) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of list) response.cookies.set(name, value, options);
            for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
          },
        },
      });

      const code = pathname === '/admin/reset' ? searchParams.get('code') : null;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        destination = error ? '/admin/reset?link=expired' : '/admin/change-password';
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        hasSession = Boolean(user);
        mustChangePassword = user?.user_metadata?.must_change_password === true;
      }
    }
  }

  destination ??= adminGate(pathname, hasSession, mustChangePassword)?.redirect ?? null;
  if (destination) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    response = redirect;
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function proxy(request: NextRequest) {
  if (isAdminPath(request.nextUrl.pathname)) return adminProxy(request);

  const pages = await knownPages(request.nextUrl.origin);
  if (pages && isUnknownDetail(request.nextUrl.pathname, pages)) {
    // No route matches this path, so Next.js answers with the site's not-found page and a 404.
    return NextResponse.rewrite(new URL('/_page-not-found', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/services/:code', '/shop/:id', '/admin/:path*'],
};
