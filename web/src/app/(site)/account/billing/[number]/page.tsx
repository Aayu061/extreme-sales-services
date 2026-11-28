import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { BillScreen } from '@/components/account/screens/billing-screens';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };
// A private page for one customer and one id that cannot be known at build time: it may block (the site header reads the address).
export const instant = false;

async function Content({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <BillScreen number={number} />;
}

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return (
    <AccountFrame title="Invoice" crumbs={[{ href: '/account/billing', label: 'Billing' }, { href: '/account/billing/[number]', label: 'Invoice' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content params={params} />
      </Suspense>
    </AccountFrame>
  );
}
