import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { ReportScreen } from '@/components/account/screens/report-screen';

export const metadata: Metadata = { title: 'Service report', robots: { index: false, follow: false } };
// A private page for one customer and one id that cannot be known at build time: it may block (the site header reads the address).
export const instant = false;

async function Content({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <ReportScreen number={number} />;
}

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return (
    <AccountFrame title="Service report" crumbs={[{ href: '/account/requests', label: 'Service history' }, { href: '/account/requests/[number]', label: 'Report' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content params={params} />
      </Suspense>
    </AccountFrame>
  );
}
