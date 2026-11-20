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
