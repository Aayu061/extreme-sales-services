import Link from 'next/link';
import { SignOutForm } from '@/components/admin/sign-out-form';
import { Button, buttonStyles } from '@/components/ui/button';

/**
 * "You don't have access to this". Without any ESS role the person only gets Sign out (no menu);
 * inside the admin area (a screen for ESS Admin only) they get a way back to the overview.
 * `reason` replaces the standard sentence for an ESS Staff member on an ESS Admin screen.
 */
export function NoAccess({ hasRole, reason }: { hasRole: boolean; reason?: string }) {
  return (
    <div className="glass-strong mx-auto max-w-xl rounded-[30px] p-6 text-ink sm:p-8">
      <h1 className="text-2xl font-bold">You don&apos;t have access to this</h1>
      <p className="mt-2 text-muted">
        {reason ??
          (hasRole
            ? 'This screen is only for an ESS Admin. Ask an ESS Admin if you need it.'
            : 'You are signed in, but this account has no access to the ESS admin area. Ask an ESS Admin to give you access.')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {hasRole ? (
          <Link href="/admin" className={buttonStyles({ size: 'md' })}>
            Go to the overview
          </Link>
        ) : (
          <SignOutForm>
            <Button type="submit" size="md">
              Sign out
            </Button>
          </SignOutForm>
        )}
      </div>
    </div>
  );
}
