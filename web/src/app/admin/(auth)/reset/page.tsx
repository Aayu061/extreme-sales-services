import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetRequestForm } from '@/components/admin/auth-forms';
import { supabaseConfig } from '@/lib/env';

export const metadata: Metadata = { title: 'Reset your password' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Ask for a reset link. The emailed link comes back here with ?code=…; the proxy swaps that code
 * for a session and opens /admin/change-password. A bad or old link lands here with ?link=expired
 * (or Supabase's own ?error=…).
 */
async function ResetWithNotice({ searchParams, configured }: { searchParams: SearchParams; configured: boolean }) {
  const { link, error } = await searchParams;
  return <ResetRequestForm configured={configured} expired={link === 'expired' || Boolean(error)} />;
}

export default function AdminResetPage({ searchParams }: { searchParams: SearchParams }) {
  const configured = supabaseConfig() !== null;
  return (
    <Suspense fallback={<ResetRequestForm configured={configured} expired={false} />}>
      <ResetWithNotice searchParams={searchParams} configured={configured} />
    </Suspense>
  );
}
