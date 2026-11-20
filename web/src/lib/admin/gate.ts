import { ADMIN_NAV } from './nav';

/**
 * Who may open which /admin page (used by the proxy before any admin page renders).
 * Pure: no cookies or network here, so the rules are easy to test.
 */

/** Pages anyone can open: signing in and asking for a password reset link. */
const OPEN_PAGES = ['/admin/login', '/admin/reset'];
export const CHANGE_PASSWORD_PAGE = '/admin/change-password';

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * A "go here after signing in" address, only if it is an /admin page on this site. Anything else
 * (another site, a public page, the sign-in page itself) is dropped.
 */
export function safeAdminNext(next: unknown): string | null {
  if (typeof next !== 'string' || !isAdminPath(next) || next.includes('\\')) return null;
  if (OPEN_PAGES.includes(next.split('?')[0])) return null;
  return next;
}

export function adminGate(pathname: string, hasSession: boolean, mustChangePassword = false): { redirect: string } | null {
  if (!isAdminPath(pathname) || OPEN_PAGES.includes(pathname)) return null;
  if (!hasSession) {
    const next = safeAdminNext(pathname);
    return { redirect: next ? `/admin/login?${new URLSearchParams({ next })}` : '/admin/login' };
  }
  // A first sign-in (or an account an admin just made) must choose its own password first.
  if (mustChangePassword && pathname !== CHANGE_PASSWORD_PAGE) return { redirect: CHANGE_PASSWORD_PAGE };
  return null;
}

/**
 * The proxy puts the admin page being opened (path + query) in this request header, so a page or
 * the panel layout can send an expired session back to the same page after signing in again.
 * The proxy always overwrites it; whatever it holds still goes through safeAdminNext.
 */
export const ADMIN_PATH_HEADER = 'x-ess-admin-path';

/**
 * "/admin/requests?status=APPROVED": the router's own _rsc value left out, and any "search" (it can
 * be a customer's phone or email, so it is never passed on in next= or Try again links).
 */
export function adminPathOf(url: URL): string {
  const params = new URLSearchParams(url.search);
  params.delete('_rsc');
  params.delete('search');
  const query = params.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

/** The first part after /admin of every admin page: the menu's screens plus the pages outside it. */
const ADMIN_SECTIONS = new Set([
  ...ADMIN_NAV.map((item) => item.href.split('/')[2]).filter(Boolean),
  'no-access',
  ...OPEN_PAGES.map((p) => p.split('/')[2]),
  CHANGE_PASSWORD_PAGE.split('/')[2],
]);

/**
 * True for an /admin address that no admin screen has (/admin/does-not-exist), so the proxy can
 * answer 404 before the page starts streaming (with Cache Components a page always starts with
 * 200). Deeper unknown addresses on a real screen (/admin/products/x) are left to that screen.
 */
export function isUnknownAdminPage(pathname: string): boolean {
  if (!pathname.startsWith('/admin/')) return false;
  const section = pathname.split('/')[2];
  return section !== '' && !ADMIN_SECTIONS.has(section);
}
