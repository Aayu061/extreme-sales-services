'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { expiredLoginUrl } from '@/lib/admin/guard';
import {
  REQUESTS_SEARCH_COOKIE,
  REQUESTS_SEARCH_COOKIE_PATH,
  REQUESTS_SEARCH_MAX_AGE,
  cleanSearch,
  requestsHref,
  requestsQuery,
} from '@/lib/admin/requests';
import { getAdminSession } from '@/lib/admin/session';

/**
 * The Requests filter form. Status and kind go in the address; the search text (which can be a
 * customer's phone or email) is kept in a short-lived httpOnly cookie instead, so it never lands in
 * the address bar, browser history, hosting logs or a sign-in "next" link.
 * The form posts here directly, so it also works before the page's script has loaded.
 */
export async function searchRequests(formData: FormData): Promise<void> {
  // R7: no session → sign in again (outside any try, so the redirect goes through).
  if (!(await getAdminSession())) redirect(expiredLoginUrl(REQUESTS_SEARCH_COOKIE_PATH));

  const status = formData.get('status');
  const kind = formData.get('kind');
  const q = requestsQuery({
    status: typeof status === 'string' ? status : undefined,
    kind: typeof kind === 'string' ? kind : undefined,
  });
  const search = cleanSearch(formData.get('search'));

  const jar = await cookies();
  if (search) {
    jar.set(REQUESTS_SEARCH_COOKIE, search, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: REQUESTS_SEARCH_COOKIE_PATH,
      maxAge: REQUESTS_SEARCH_MAX_AGE,
    });
  } else {
    jar.delete({ name: REQUESTS_SEARCH_COOKIE, path: REQUESTS_SEARCH_COOKIE_PATH });
  }
  redirect(requestsHref(q));
}

/** "Clear filters": forgets the search too (a plain link could not). */
export async function clearRequestsFilters(): Promise<void> {
  (await cookies()).delete({ name: REQUESTS_SEARCH_COOKIE, path: REQUESTS_SEARCH_COOKIE_PATH });
  if (!(await getAdminSession())) redirect(expiredLoginUrl(REQUESTS_SEARCH_COOKIE_PATH));
  redirect(REQUESTS_SEARCH_COOKIE_PATH);
}
