import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { RequestsScreen, requestFilter } from '@/components/account/screens/request-screens';

export const metadata: Metadata = { title: 'Service history', robots: { index: false, follow: false } };

type Search = Promise<{ filter?: string | string[] }>;

async function Content({ searchParams }: { searchParams: Search }) {
  const { filter } = await searchParams;
  return <RequestsScreen filter={requestFilter(filter)} />;
}

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <AccountFrame title="Service history" crumbs={[{ href: '/account/requests', label: 'Service history' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AccountFrame>
  );
}
