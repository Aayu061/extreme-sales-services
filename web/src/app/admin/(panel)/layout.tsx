import { Suspense } from 'react';
import { AdminPanel } from '@/components/admin/admin-panel';

/** Shown while PYS answers (it can take up to a minute to wake up). */
function PanelLoading() {
  return (
    <div className="min-h-dvh lg:flex">
      <div className="p-3 lg:h-dvh lg:w-72 lg:shrink-0 lg:p-4">
        <div className="glass-strong h-[76px] rounded-[24px] lg:h-full" />
      </div>
      <main id="main" className="min-w-0 flex-1 px-4 pt-2 pb-12 lg:px-8 lg:pt-8">
        <p role="status" className="text-muted">
          Loading the admin area…
        </p>
      </main>
    </div>
  );
}

/**
 * Every signed-in admin screen (R1: sign-in pages are in (auth) and do not get this). Who the
 * person is depends on the request, so it is read inside <Suspense> and never prerendered.
 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PanelLoading />}>
      <AdminPanel>{children}</AdminPanel>
    </Suspense>
  );
}
