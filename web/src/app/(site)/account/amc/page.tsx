import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { AmcListScreen } from '@/components/account/screens/amc-screens';

export const metadata: Metadata = { title: 'Your AMC', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AccountFrame title="Your AMC" crumbs={[{ href: '/account/amc', label: 'AMC' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <AmcListScreen />
      </Suspense>
    </AccountFrame>
  );
}
