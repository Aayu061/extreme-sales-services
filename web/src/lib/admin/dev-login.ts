import 'server-only';
import { serverEnv } from '@/lib/env';

/**
 * Test sign-in for a PC running the mock PYS (dev/mock-pys.mjs). The fixed tokens below are only
 * accepted by the mock; real PYS rejects them. Switched on only outside production AND when this
 * site talks to a PYS on this computer, so it can never work on the live site.
 */
export const DEV_TOKEN_COOKIE = 'ess-admin-dev';
export const DEV_TOKENS = { admin: 'dev-admin-token', staff: 'dev-staff-token' } as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function devLoginAllowed(env: { NODE_ENV?: string; PYS_API_URL: string }): boolean {
  if (env.NODE_ENV === 'production') return false;
  try {
    return LOCAL_HOSTS.has(new URL(env.PYS_API_URL).hostname);
  } catch {
    return false;
  }
}

/** devLoginAllowed for this running site. */
export function devLoginEnabled(): boolean {
  return devLoginAllowed({ NODE_ENV: process.env.NODE_ENV, PYS_API_URL: serverEnv().PYS_API_URL });
}

export function isDevToken(value: string | undefined): value is (typeof DEV_TOKENS)[keyof typeof DEV_TOKENS] {
  return value === DEV_TOKENS.admin || value === DEV_TOKENS.staff;
}
