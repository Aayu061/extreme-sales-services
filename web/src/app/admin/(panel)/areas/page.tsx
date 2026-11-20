import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AreasScreen } from '@/components/admin/areas-view';

export const metadata: Metadata = { title: 'Pincodes' };

/**
 * /admin/areas (ESS Admin only): the pincode prefixes ESS covers. Who is signed in and PYS's
 * list are read per request inside <Suspense>.
 */
export default function AdminAreasPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-muted">
          Loading the pincodes…
        </p>
      }
    >
      <AreasScreen />
    </Suspense>
  );
}
