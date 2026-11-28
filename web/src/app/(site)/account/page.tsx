import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { OverviewScreen } from '@/components/account/screens/overview-screen';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
  alternates: { canonical: '/account' },
};

/** Sign-in when signed out, "coming soon" while accounts are off, the overview when signed in (per request). */
export default function AccountPage() {
  return (
    <AccountFrame title="Your account" crumbs={[]}>
      <Suspense fallback={<AccountSkeleton />}>
        <OverviewScreen />
      </Suspense>
    </AccountFrame>
  );
}
