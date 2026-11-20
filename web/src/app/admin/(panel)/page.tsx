import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getMe } from '@/lib/admin/pys-admin';

export const metadata: Metadata = { title: 'Overview' };

async function Greeting() {
  const me = await getMe();
  return <p className="mt-2 text-muted">Signed in as {me.name ?? me.email ?? 'you'}.</p>;
}

/** /admin. Placeholder until the overview cards arrive (Task 3). */
export default function AdminOverviewPage() {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Overview</h1>
      <Suspense fallback={null}>
        <Greeting />
      </Suspense>
    </>
  );
}
