import 'server-only';
import { headers } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { PysError } from '@/lib/pys/client';
import { ADMIN_PATH_HEADER, safeAdminNext } from './gate';
import { AdminAuthError, AdminForbiddenError } from './pys-admin';

/**
 * R7: a session can end, or a role be taken away, while someone is using the admin area (layouts
 * do not run again on every click). Every admin page reads PYS through guardAdmin, so it always
 * ends up on the right page:
 *   - session no longer accepted → /admin/login?expired=1&next=<this admin page>
 *   - no access                  → /admin/no-access
 *   - anything else              → thrown on, for the page to show
 */

/** "/admin/login?expired=1&next=…", coming back only to an admin page. */
export function expiredLoginUrl(currentPath: string | null | undefined): string {
  const next = safeAdminNext(currentPath);
  return `/admin/login?${new URLSearchParams(next ? { expired: '1', next } : { expired: '1' })}`;
}

/**
 * `currentPath` is the admin page being shown, with its query. Leave it out to use the page the
 * proxy saw (header set on every /admin request).
 */
export async function guardAdmin<T>(promise: Promise<T>, currentPath?: string): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof AdminAuthError) {
      redirect(expiredLoginUrl(currentPath ?? (await headers()).get(ADMIN_PATH_HEADER)));
    }
    if (err instanceof AdminForbiddenError) redirect('/admin/no-access');
    throw err;
  }
}

export type AdminLoad<T> = { ok: true; data: T } | { ok: false };

/**
 * guardAdmin for screens that show their own "We couldn't reach PYS" message: an expired session
 * or no access still redirects; any other failure (PYS asleep, network, PYS error) is { ok: false }.
 */
export async function loadAdmin<T>(promise: Promise<T>, currentPath?: string): Promise<AdminLoad<T>> {
  try {
    return { ok: true, data: await guardAdmin(promise, currentPath) };
  } catch (err) {
    unstable_rethrow(err);
    // A render Next stopped itself (dev checks, a navigation away): not a PYS failure, so not ours
    // to report. (pysRequest turns its own time-outs into PysError PYS_UNREACHABLE.)
    if (err instanceof Error && err.name === 'AbortError') throw err;
    // Status and code only: PYS error messages can name a customer.
    console.error('admin read from PYS failed', err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
    return { ok: false };
  }
}
