import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { AcDetailScreen } from '@/components/account/screens/ac-screens';

export const metadata: Metadata = { title: 'AC details', robots: { index: false, follow: false } };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AcDetailScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AccountFrame title="AC details" crumbs={[{ href: '/account/acs', label: 'My ACs' }, { href: '/account/acs/[id]', label: 'AC details' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content params={params} />
      </Suspense>
    </AccountFrame>
  );
}
