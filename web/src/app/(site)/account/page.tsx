import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import { SignInForm } from '@/components/account/sign-in-form';
import { AccountView } from '@/components/account/account-view';
import { getAccountState, type AccountState } from '@/lib/account';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false },
  alternates: { canonical: '/account' },
};

/** Shown while customer accounts are switched off in PYS (PORTAL_ENABLED), exactly as before S11. */
function ComingSoon() {
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

/** Reads the sign-in cookie, so it renders per request (inside Suspense). */
async function AccountArea() {
  let state: AccountState;
  try {
    state = await getAccountState();
  } catch {
    return (
      <div role="alert" className="glass max-w-xl rounded-3xl p-6 text-ink">
        <p className="font-semibold">We could not load your account right now.</p>
        <p className="mt-2 text-muted">
          Please try again in a minute, or{' '}
          <Link href="/track" className="font-semibold text-cool underline-offset-4 hover:underline">
            track a request
          </Link>{' '}
          with its code.
        </p>
      </div>
    );
  }
  if (state.kind === 'off') return <ComingSoon />;
  return (
    <>
      {state.kind === 'signed-in' ? <AccountView data={state.data} /> : <SignInForm />}
      <p className="mt-8 text-sm text-muted">
        Website accounts are for our AMC and regular customers. Not set up yet? Ask us when we next visit, or{' '}
        <Link href="/contact" className="font-semibold text-cool underline-offset-4 hover:underline">
          contact us
        </Link>
        .
      </p>
    </>
  );
}

export default function AccountPage() {
  return (
    <>
      <PageBanner title="Your account" crumbs={[{ href: '/account', label: 'Your account' }]} />
      <Container className="py-8 sm:py-12">
        <Suspense fallback={<p className="text-muted">Loading your account…</p>}>
          <AccountArea />
        </Suspense>
      </Container>
    </>
  );
}
