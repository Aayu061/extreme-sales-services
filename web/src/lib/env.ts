import 'server-only';
import { z } from 'zod';

/**
 * Server-side settings (Vercel → Project → Settings → Environment Variables).
 * Never prefixed NEXT_PUBLIC_: none of these reach the browser.
 *   PYS_API_URL              PYS API base, e.g. https://place-your-service-api.onrender.com
 *   PYS_INTEGRATION_KEY_ID   ESS key id issued by PYS (same one the old ESS server uses)
 *   PYS_INTEGRATION_SECRET   its secret
 *   SITE_URL                 public address of this website (canonical links, sitemap)
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
    });
  }
  return cached;
}

export function pysLinkConfigured(env: ServerEnv = serverEnv()): boolean {
  return Boolean(env.PYS_INTEGRATION_KEY_ID && env.PYS_INTEGRATION_SECRET);
}
