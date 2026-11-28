import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { AcsScreen } from '@/components/account/screens/ac-screens';

export const metadata: Metadata = { title: 'My ACs', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AccountFrame title="My ACs" crumbs={[{ href: '/account/acs', label: 'My ACs' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <AcsScreen />
      </Suspense>
    </AccountFrame>
  );
}
