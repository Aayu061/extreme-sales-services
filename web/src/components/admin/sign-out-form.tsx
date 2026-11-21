import type { ReactNode } from 'react';
import { SIGN_OUT_PATH } from '@/lib/admin/gate';

/**
 * "Sign out" as a plain form post to /admin/sign-out (not a Server Action): the browser loads a
 * whole new page, so no admin screen stays behind in memory, and it works before the page's script
 * has loaded. The button inside must be a submit button.
 */
export function SignOutForm({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <form method="post" action={SIGN_OUT_PATH} className={className}>
      {children}
    </form>
  );
}
