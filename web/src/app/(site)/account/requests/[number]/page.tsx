import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { RequestDetailScreen } from '@/components/account/screens/request-screens';

export const metadata: Metadata = { title: 'Service request', robots: { index: false, follow: false } };

async function Content({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <RequestDetailScreen number={number} />;
}

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return (
    <AccountFrame title="Service request" crumbs={[{ href: '/account/requests', label: 'Service history' }, { href: '/account/requests/[number]', label: 'Request' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content params={params} />
      </Suspense>
    </AccountFrame>
  );
}
