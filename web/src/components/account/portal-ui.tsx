import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageBanner, type Crumb } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SignInForm } from '@/components/account/sign-in-form';
import { ForgetEndedSession } from '@/components/account/forget-ended-session';
import { cn } from '@/lib/cn';
import type { PortalResult } from '@/lib/account';
import { accountHref } from '@/lib/portal-links';

/** S11b: shared building blocks of the signed-in account pages (server components; no customer data in scripts). */

export type AccountTab = 'overview' | 'acs' | 'amc' | 'requests' | 'billing' | 'profile';
const TABS: ReadonlyArray<{ id: AccountTab; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: accountHref.overview() },
  { id: 'acs', label: 'My ACs', href: accountHref.acs() },
  { id: 'amc', label: 'AMC', href: accountHref.amcList() },
  { id: 'requests', label: 'Service history', href: accountHref.requests() },
  { id: 'billing', label: 'Billing', href: accountHref.billing() },
  { id: 'profile', label: 'Profile', href: accountHref.profile() },
];

/** The account tab bar: a row of chips that scrolls sideways on phones (the page itself never does). */
export function AccountTabs({ current }: { current: AccountTab }) {
  return (
    <nav aria-label="Your account" className="no-print -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 py-1">
        {TABS.map((t) => {
          const active = t.id === current;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-base whitespace-nowrap transition-colors duration-150',
                  active ? 'border-cyan bg-cyan-wash font-semibold text-navy' : 'border-line bg-paper text-navy hover:border-cyan',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A titled glass card. `id` labels the region for screen readers. */
export function Panel({ id, title, children, className, action }: { id: string; title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('glass rounded-3xl p-5 text-ink sm:p-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-xl sm:text-2xl">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Label / value pairs (specs, dates). Empty values are left out. */
export function InfoList({ items, className }: { items: Array<[string, ReactNode | null | undefined]>; className?: string }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!shown.length) return null;
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="break-words font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** An empty list that says what happens next, with one helpful action. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="glass rounded-3xl p-6 text-ink sm:p-8">
      <p className="text-xl font-extrabold">{title}</p>
      {children && <p className="mt-2 text-muted">{children}</p>}
      {action && (
        <Link href={action.href} className={`${buttonStyles({ size: 'md' })} mt-5`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export const linkClass = 'font-semibold text-cool underline-offset-4 hover:underline';

/** Shown while customer accounts are switched off in PYS (PORTAL_ENABLED), exactly as before S11. */
export function ComingSoon() {
  return (
    <div className="glass max-w-2xl rounded-3xl p-6 text-ink sm:p-8">
      <h2 className="text-2xl">Customer login is coming soon</h2>
      <p className="mt-3 text-muted">Until then you can track any request with its tracking code and mobile number.</p>
      <Link href="/track" className={`${buttonStyles({ size: 'md' })} mt-5`}>
        Track a request
      </Link>
    </div>
  );
}

/** PYS could not answer (it may be waking up on its free server) or something else went wrong. */
export function AccountError() {
  return (
    <div role="alert" className="glass max-w-xl rounded-3xl p-6 text-ink">
      <p className="font-semibold">We could not load your account right now.</p>
      <p className="mt-2 text-muted">
        Our system may be waking up, which can take up to a minute. Please refresh the page, or{' '}
        <Link href="/track" className={linkClass}>
          track a request
        </Link>{' '}
        with its code.
      </p>
    </div>
  );
}

/** Below the sign-in form: who accounts are for. */
export function AccountFootnote() {
  return (
    <p className="mt-8 text-sm text-muted">
      Website accounts are for our AMC and regular customers. Not set up yet? Ask us when we next visit, or{' '}
      <Link href="/contact" className={linkClass}>
        contact us
      </Link>
      .
    </p>
  );
}

/** Everything an account page shows when it has no data to show: sign-in, coming soon or the error box. */
export function PortalFallback({ result }: { result: Exclude<PortalResult<unknown>, { kind: 'ok' }> }) {
  if (result.kind === 'off') return <ComingSoon />;
  if (result.kind === 'error' || result.kind === 'not-found') return <AccountError />;
  return (
    <>
      {result.ended && (
        <>
          <ForgetEndedSession />
          <p role="status" className="mb-4 max-w-xl rounded-2xl bg-cyan-wash px-4 py-3 text-ink">
            You have been signed out. Please sign in again to see your account.
          </p>
        </>
      )}
      <SignInForm />
      <AccountFootnote />
    </>
  );
}

/** The shape of an account page while PYS answers. */
export function AccountSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
      <p className="mt-4 text-sm text-muted">Loading your account… this can take up to a minute if our system is waking up.</p>
    </div>
  );
}

/** "Back to My ACs" style link above a detail page. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="no-print mb-4">
      <Link href={href} className={linkClass}>
        <span aria-hidden="true">← </span>
        {children}
      </Link>
    </p>
  );
}

/** Every account page: the banner (static, shown at once) and the page's content below it. */
export function AccountFrame({ title, crumbs = [], children }: { title: string; crumbs?: Crumb[]; children: ReactNode }) {
  return (
    <>
      <PageBanner title={title} crumbs={[{ href: '/account', label: 'Your account' }, ...crumbs]} />
      <Container className="py-8 sm:py-12">{children}</Container>
    </>
  );
}
