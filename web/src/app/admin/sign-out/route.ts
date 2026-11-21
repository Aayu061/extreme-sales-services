import { cookies } from 'next/headers';
import { DEV_TOKEN_COOKIE } from '@/lib/admin/dev-login';
import { REQUESTS_SEARCH_COOKIE, REQUESTS_SEARCH_COOKIE_PATH } from '@/lib/admin/requests';
import { createSupabaseServer } from '@/lib/admin/supabase-server';

/**
 * "Sign out" (a plain `<form method="post" action="/admin/sign-out">`, see SignOutForm). Ends the
 * Supabase session on this device only ("local": the owner's PYS sign-ins elsewhere stay), the
 * test session, and the remembered Requests search (it can be a customer's phone or email). It
 * answers 303 to the sign-in page, so the browser loads a whole new page: no admin screen (AC
 * enquiries with phone numbers…) stays behind, hidden, in the page's memory for Back to show.
 * A plain form post also works before the page's script has loaded. Never cached.
 */
export async function POST(): Promise<Response> {
  const supabase = await createSupabaseServer();
  if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  const jar = await cookies();
  jar.delete(DEV_TOKEN_COOKIE);
  jar.delete({ name: REQUESTS_SEARCH_COOKIE, path: REQUESTS_SEARCH_COOKIE_PATH });
  return new Response(null, { status: 303, headers: { Location: '/admin/login', 'Cache-Control': 'no-store' } });
}
