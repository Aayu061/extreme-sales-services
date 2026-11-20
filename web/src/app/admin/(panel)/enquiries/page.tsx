import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnquiriesScreen } from '@/components/admin/enquiries-view';

export const metadata: Metadata = { title: 'AC enquiries' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * /admin/enquiries: approved AC enquiries for ESS's ACs. Staff send a price per AC (GST included),
 * then mark each line sold or not taken. Read per request inside <Suspense>.
 */
export default function AdminEnquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">AC enquiries</h1>
      <p className="mt-2 max-w-3xl text-muted">
        AC enquiries approved in PYS. Send the customer a price per AC, GST included: they get an email and see it on the tracking page. Once you
        know the outcome, mark it Sold or Not taken.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <p role="status" className="text-muted">
              Loading AC enquiries…
            </p>
          }
        >
          <EnquiriesScreen searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
