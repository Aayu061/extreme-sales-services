import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { AmcDetailScreen } from '@/components/account/screens/amc-screens';

export const metadata: Metadata = { title: 'AMC contract', robots: { index: false, follow: false } };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AmcDetailScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AccountFrame title="AMC contract" crumbs={[{ href: '/account/amc', label: 'AMC' }, { href: '/account/amc/[id]', label: 'Contract' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content params={params} />
      </Suspense>
    </AccountFrame>
  );
}
