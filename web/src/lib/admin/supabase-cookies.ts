import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * How the Supabase sign-in cookies are written, by every Supabase client on this site (Server
 * Components, Server Actions and the /admin proxy). The session is the person's PYS account, on the
 * same address as all public pages, and nothing in the browser needs it (sign-in, the reset link
 * and the new password all run on the server), so page scripts can't read it (httpOnly). It is sent
 * only over https on the live site.
 */
export function supabaseCookieOptions(): CookieOptionsWithName {
  return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
}
