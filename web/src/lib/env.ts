import 'server-only';
import { z } from 'zod';

/**
 * Server-side settings (Vercel → Project → Settings → Environment Variables).
 * Secret, never prefixed NEXT_PUBLIC_ (they never reach the browser):
 *   PYS_API_URL              PYS API base, e.g. https://place-your-service-api.onrender.com
 *   PYS_INTEGRATION_KEY_ID   ESS key id issued by PYS (same one the old ESS server uses)
 *   PYS_INTEGRATION_SECRET   its secret
 *   SITE_URL                 public address of this website (canonical links, sitemap)
 * Public (safe to be seen; this site only reads them on the server). Admin sign-in uses the same
 * Supabase accounts as PYS. Never put the Supabase service role key here.
 *   NEXT_PUBLIC_SUPABASE_URL       the PYS Supabase project address
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  its publishable (anon) key
 * Both optional: without them the admin sign-in page says sign-in isn't set up yet.
 */
const schema = z.object({
  PYS_API_URL: z
    .string()
    .url()
    .default('https://place-your-service-api.onrender.com')
    .transform((v) => v.replace(/\/+$/, '').replace(/\/api\/v1$/i, '')),
  PYS_INTEGRATION_KEY_ID: z.string().trim().optional(),
  PYS_INTEGRATION_SECRET: z.string().optional(),
  SITE_URL: z
    .string()
    .url()
    .default('https://extreme-sales-services.vercel.app')
    .transform((v) => v.replace(/\/+$/, '')),
  // Fail soft: a mistyped Supabase value only switches the admin sign-in off ("not set up yet"),
  // it never stops the public pages (which all read serverEnv()) from opening.
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .catch(undefined)
    .transform((v) => v?.replace(/\/+$/, '')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().optional().catch(undefined),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const blank = (v: string | undefined) => (v && v.trim() ? v : undefined);
    cached = schema.parse({
      PYS_API_URL: blank(process.env.PYS_API_URL),
      PYS_INTEGRATION_KEY_ID: blank(process.env.PYS_INTEGRATION_KEY_ID),
      PYS_INTEGRATION_SECRET: blank(process.env.PYS_INTEGRATION_SECRET),
      SITE_URL: blank(process.env.SITE_URL),
      NEXT_PUBLIC_SUPABASE_URL: blank(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: blank(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
  }
  return cached;
}

export function pysLinkConfigured(env: ServerEnv = serverEnv()): boolean {
  return Boolean(env.PYS_INTEGRATION_KEY_ID && env.PYS_INTEGRATION_SECRET);
}

/** Supabase address + publishable key for admin sign-in, or null while they are not set. */
export function supabaseConfig(env: ServerEnv = serverEnv()): { url: string; anonKey: string } | null {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}
