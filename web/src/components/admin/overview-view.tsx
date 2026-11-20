import Link from 'next/link';
import type { ReactNode } from 'react';
import { loadAdmin } from '@/lib/admin/guard';
import { adminRequest } from '@/lib/admin/pys-admin';
import { leadsPath, waitingForPrice } from '@/lib/admin/requests';
import type { AdminEnquiryLine, AdminLeadsPage, AdminOverview } from '@/lib/admin/types';
import { PysLink, PysUnreachable } from './pys-link';
import { RequestsTable } from './requests-table';

const NEWEST = 5;

/** Where requests are approved (always shown, even when PYS is slow to answer). */
export function ApprovalInboxLink() {
  return <PysLink label="Open the Approval Inbox in PYS">Open the Approval Inbox in PYS</PysLink>;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass flex flex-col gap-2 rounded-[24px] p-5 text-ink">
      <h2 className="text-base font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

const Big = ({ children }: { children: ReactNode }) => <p className="text-4xl font-bold tabular-nums">{children}</p>;

/** The four numbers at the top of the overview (rendered per request, inside <Suspense>). */
export async function OverviewCards() {
  const [overview, enquiries] = await Promise.all([
    loadAdmin(adminRequest<AdminOverview>('GET', '/overview')),
    loadAdmin(adminRequest<{ enquiries: AdminEnquiryLine[] }>('GET', '/enquiries')),
  ]);
  if (!overview.ok || !enquiries.ok) return <PysUnreachable retryHref="/admin" />;

  const { requests, products } = overview.data;
  const hidden = Math.max(0, products.total - products.published);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card title="Waiting for approval">
        <Big>{requests.pendingReview}</Big>
        {requests.sellerInterestPending > 0 && (
          <p className="text-sm text-muted">
            {requests.sellerInterestPending === 1 ? '1 of them is' : `${requests.sellerInterestPending} of them are`} dealer interest
          </p>
        )}
      </Card>
      <Card title="Last 24 hours">
        <Big>{requests.last24Hours}</Big>
        <p className="text-sm text-muted">New requests from the website</p>
      </Card>
      <Card title="AC enquiries waiting for your price">
        <Big>{waitingForPrice(enquiries.data.enquiries)}</Big>
        <Link href="/admin/enquiries" className="inline-flex min-h-11 items-center self-start font-semibold text-cool underline-offset-4 hover:underline">
          Go to AC enquiries
        </Link>
      </Card>
      <Card title="Products shown / hidden">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p>
            <span className="text-4xl font-bold tabular-nums">{products.published}</span> <span className="text-muted">shown</span>
          </p>
          <p>
            <span className="text-4xl font-bold tabular-nums">{hidden}</span> <span className="text-muted">hidden</span>
          </p>
        </div>
      </Card>
    </div>
  );
}

/** The newest requests (rendered per request, inside <Suspense>). */
export async function NewestRequests() {
  const result = await loadAdmin(adminRequest<AdminLeadsPage>('GET', leadsPath({ page: 1 }, NEWEST)));
  if (!result.ok) return <PysUnreachable retryHref="/admin" />;
  const { items } = result.data;
  return (
    <>
      {items.length === 0 ? (
        <p className="glass rounded-[24px] p-5 text-ink">No requests yet. Bookings, AC enquiries and messages from the website will show here.</p>
      ) : (
        <RequestsTable items={items} />
      )}
      <Link href="/admin/requests" className="mt-3 inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline">
        See all requests
      </Link>
    </>
  );
}
