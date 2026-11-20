import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContentListScreen } from '@/components/admin/content-view';

export const metadata: Metadata = { title: 'Website text' };

/**
 * /admin/content: the website text and business details, each with its version, when it was last
 * published and whether a saved draft is waiting (read per request inside <Suspense>).
 */
export default function AdminContentPage() {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Website text</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Change the text on the website and the business details. Save a draft first; an ESS Admin publishes it to the live website.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <p role="status" className="text-muted">
              Loading the website text…
            </p>
          }
        >
          <ContentListScreen />
        </Suspense>
      </div>
    </>
  );
}
