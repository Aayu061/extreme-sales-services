/**
 * S07: the one place admin screens send someone whose session ended or who has no access.
 * Every admin screen used to build these addresses itself; they now all call these helpers.
 */

/** The sign-in page, flagged "session ended", coming back to `next` (this site's own admin address only). */
export function signInAgainHref(next: string): string {
  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  return `/admin/login?${new URLSearchParams({ expired: '1', next: safeNext })}`;
}

export const NO_ACCESS_HREF = '/admin/no-access';

/** The page the person is on now (path + query), to come back to after signing in again. */
export function currentAdminPath(): string {
  return typeof window === 'undefined' ? '/admin' : `${window.location.pathname}${window.location.search}`;
}

type Replace = { replace: (href: string) => void };

export function sendToSignInAgain(router: Replace, next: string = currentAdminPath()): void {
  router.replace(signInAgainHref(next));
}

export function sendToNoAccess(router: Replace): void {
  router.replace(NO_ACCESS_HREF);
}

/**
 * For an action's answer: an ended session goes to sign in again, missing access to the no-access page.
 * Returns which happened ('signIn' | 'noAccess'), or null when neither applies.
 */
export function handleAdminAccess(
  router: Replace,
  state: { authError?: boolean; forbidden?: boolean },
  next?: string,
): 'signIn' | 'noAccess' | null {
  if (state.authError) {
    sendToSignInAgain(router, next);
    return 'signIn';
  }
  if (state.forbidden) {
    sendToNoAccess(router);
    return 'noAccess';
  }
  return null;
}
