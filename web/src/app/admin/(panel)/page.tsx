import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApprovalInboxLink, NewestRequests, OverviewCards } from '@/components/admin/overview-view';
import { Skeleton } from '@/components/ui/skeleton';
import { guardAdmin } from '@/lib/admin/guard';
import { getMe } from '@/lib/admin/pys-admin';

export const metadata: Metadata = { title: 'Overview' };

async function Greeting() {
  const me = await guardAdmin(getMe());
  return <p className="text-muted">Signed in as {me.name ?? me.email ?? 'you'}.</p>;
}

function CardsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading the numbers">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass flex flex-col gap-3 rounded-[24px] p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** /admin: what needs doing today, and the newest requests. PYS data is read per request. */
export default function AdminOverviewPage() {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Overview</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <Suspense fallback={null}>
          <Greeting />
        </Suspense>
        <ApprovalInboxLink />
      </div>

      <div className="mt-6">
        <Suspense fallback={<CardsLoading />}>
          <OverviewCards />
        </Suspense>
      </div>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">Newest requests</h2>
      <Suspense
        fallback={
          <p role="status" className="text-muted">
            Loading requests…
          </p>
        }
      >
        <NewestRequests />
      </Suspense>
    </>
  );
}
