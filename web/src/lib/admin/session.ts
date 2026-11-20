import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { DEV_TOKEN_COOKIE, devLoginEnabled, isDevToken } from './dev-login';
import { createSupabaseServer } from './supabase-server';

export interface AdminSession {
  /** Sent to PYS as X-PYS-Actor-Token. Never shown or logged. */
  accessToken: string;
  email: string | null;
  mustChangePassword: boolean;
}

/**
 * The signed-in person, or null. The user is checked with Supabase (getUser), not just read from
 * the cookie; the access token comes from the (refreshed) session. One check per request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (devLoginEnabled()) {
    const token = (await cookies()).get(DEV_TOKEN_COOKIE)?.value;
    if (isDevToken(token)) return { accessToken: token, email: null, mustChangePassword: false };
  }

  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    email: user.email ?? null,
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
});
