import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ContentEditScreen } from '@/components/admin/content-view';

export const metadata: Metadata = { title: 'Edit website text' };

type Params = Promise<{ key: string }>;

/**
 * /admin/content/<key>: one block's editor (e.g. /admin/content/home.hero). The block is read per
 * request inside <Suspense>; a key not edited here shows the admin "not found".
 */
export default function AdminEditContentPage({ params }: { params: Params }) {
  return (
    <>
      <Link href="/admin/content" className="inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline">
        All website text
      </Link>
      <Suspense
        fallback={
          <p role="status" className="text-muted">
            Loading the text…
          </p>
        }
      >
        <ContentEditScreen params={params} />
      </Suspense>
    </>
  );
}
