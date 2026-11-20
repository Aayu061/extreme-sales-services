import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PysLink } from '@/components/admin/pys-link';
import { RequestsScreen } from '@/components/admin/requests-view';

export const metadata: Metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * /admin/requests: every website request, filtered and paged, read-only. Approving happens in
 * the PYS Approval Inbox. The filters live in the address, read per request inside <Suspense>.
 */
export default function AdminRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Requests</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Bookings, AC enquiries, messages and dealer interest from the website, newest first (requests waiting for approval: oldest first). To approve
        or reject one, open it in PYS.
      </p>
      <PysLink label="Open the Approval Inbox in PYS">Open the Approval Inbox in PYS</PysLink>
      <div className="mt-6">
        <Suspense
          fallback={
            <p role="status" className="text-muted">
              Loading requests…
            </p>
          }
        >
          <RequestsScreen searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
