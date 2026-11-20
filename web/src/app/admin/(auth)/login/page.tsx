import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/auth-forms';
import { devLoginEnabled } from '@/lib/admin/dev-login';
import { safeAdminNext } from '@/lib/admin/gate';
import { supabaseConfig } from '@/lib/env';

export const metadata: Metadata = { title: 'Sign in' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function LoginWithNext({ searchParams, devLogin, configured }: { searchParams: SearchParams; devLogin: boolean; configured: boolean }) {
  const { next, expired } = await searchParams;
  return (
    <LoginForm
      devLogin={devLogin}
      configured={configured}
      next={safeAdminNext(Array.isArray(next) ? next[0] : next)}
      expired={(Array.isArray(expired) ? expired[0] : expired) === '1'}
    />
  );
}

export default function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  // Worked out on the server: the test sign-in can never be offered on the live site.
  const devLogin = devLoginEnabled();
  const configured = supabaseConfig() !== null;
  return (
    <Suspense fallback={<LoginForm devLogin={devLogin} configured={configured} next={null} />}>
      <LoginWithNext searchParams={searchParams} devLogin={devLogin} configured={configured} />
    </Suspense>
  );
}
