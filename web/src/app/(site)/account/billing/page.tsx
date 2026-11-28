import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { BillingScreen } from '@/components/account/screens/billing-screens';

export const metadata: Metadata = { title: 'Billing', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AccountFrame title="Billing" crumbs={[{ href: '/account/billing', label: 'Billing' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <BillingScreen />
      </Suspense>
    </AccountFrame>
  );
}
