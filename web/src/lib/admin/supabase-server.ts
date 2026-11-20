import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/env';

/**
 * Supabase client for Server Components and Server Actions, using the visitor's sign-in cookies.
 * Uses only the public URL and publishable key. Returns null while sign-in isn't set up.
 */
export async function createSupabaseServer() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called while a Server Component renders, where cookies can't be written. The proxy
          // refreshes the session on every /admin request, so nothing is lost.
        }
      },
    },
  });
}
