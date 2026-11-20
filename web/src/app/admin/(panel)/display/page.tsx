import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DisplayScreen } from '@/components/admin/display-view';

export const metadata: Metadata = { title: 'Services shown' };

/**
 * /admin/display (ESS Admin only): which services and AMC plans the website lists, and their
 * order. Who is signed in and PYS's lists are read per request inside <Suspense>.
 */
export default function AdminDisplayPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-muted">
          Loading the services…
        </p>
      }
    >
      <DisplayScreen />
    </Suspense>
  );
}
