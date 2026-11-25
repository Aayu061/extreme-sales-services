import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { SignInForm } from '@/components/account/sign-in-form';
import { AccountView } from '@/components/account/account-view';
import { getAccountOverview } from '@/lib/account';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false },
  alternates: { canonical: '/account' },
};

/** Reads the sign-in cookie, so it renders per request (inside Suspense). */
async function AccountArea() {
  let data;
  try {
    data = await getAccountOverview();
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
  return data ? <AccountView data={data} /> : <SignInForm />;
}

export default function AccountPage() {
  return (
    <>
      <PageBanner
        title="Your account"
        intro="Your ACs, AMC and service history in one place."
        crumbs={[{ href: '/account', label: 'Your account' }]}
      />
      <Container className="py-8 sm:py-12">
        <Suspense fallback={<p className="text-muted">Loading your account…</p>}>
          <AccountArea />
        </Suspense>
        <p className="mt-8 text-sm text-muted">
          Website accounts are for our AMC and regular customers. Not set up yet? Ask us when we next visit, or{' '}
          <Link href="/contact" className="font-semibold text-cool underline-offset-4 hover:underline">
            contact us
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
