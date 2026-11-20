import 'server-only';
import { cache } from 'react';
import { connection } from 'next/server';
import { PysError, pysRequest } from '@/lib/pys/client';
import { getAdminSession } from './session';
import type { AdminMe } from './types';

/**
 * Calls to the PYS ESS admin API (/api/v1/ess/admin). Each call is signed by this server (the
 * PYS client) AND carries the signed-in person's session token, so PYS knows who is acting and
 * checks their role itself. The token is never logged.
 */

/** The session is missing or PYS no longer accepts it: the caller sends the person to /admin/login. */
export class AdminAuthError extends Error {
  constructor(options?: ErrorOptions) {
    super('Please sign in again.', options);
    this.name = 'AdminAuthError';
  }
}

/** The person has no ESS role, or the action is for ESS Admin only. */
export class AdminForbiddenError extends Error {
  constructor(options?: ErrorOptions) {
    super("You don't have access to this.", options);
    this.name = 'AdminForbiddenError';
  }
}

/** PYS refused the input. `fields`: one message per field ("total", "items.2", "body.gstin" …). */
export class AdminValidationError extends Error {
  constructor(
    public readonly fields: Record<string, string>,
    options?: ErrorOptions,
  ) {
    super('Please check the highlighted details.', options);
    this.name = 'AdminValidationError';
  }
}

type Method = Parameters<typeof pysRequest>[0];

/** PYS names list fields like "items.2.displayOrder"; forms show one message per line ("items.2"). */
function fieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const d of details as Array<{ field?: unknown; message?: unknown }>) {
    if (typeof d?.field !== 'string' || typeof d.message !== 'string') continue;
    const m = d.field.match(/^items\.(\d+)\./);
    out[m ? `items.${m[1]}` : d.field] ??= d.message;
  }
  return out;
}

/**
 * `path` is relative to /ess/admin, e.g. adminRequest('GET', '/enquiries'). A refused signature
 * (401 INVALID_SIGNATURE) or scope (403 INSUFFICIENT_SCOPE) is this server's setup, not the
 * person's session, so it stays a PysError instead of sending them to sign in again.
 */
export async function adminRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  // Admin answers belong to one person at one moment: never part of a prerendered page, even
  // when the session check itself does not need the request (sign-in not set up).
  await connection();
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError();
  try {
    return await pysRequest<T>(method, `/admin${path}`, { body, headers: { 'X-PYS-Actor-Token': session.accessToken } });
  } catch (err) {
    if (err instanceof PysError) {
      if (err.status === 401 && err.code !== 'INVALID_SIGNATURE') throw new AdminAuthError({ cause: err });
      if (err.status === 403 && err.code !== 'INSUFFICIENT_SCOPE') throw new AdminForbiddenError({ cause: err });
      if (err.status === 422) throw new AdminValidationError(fieldErrors(err.details), { cause: err });
    }
    throw err;
  }
}

/** Who is signed in and what they may do (asked once per page view). */
export const getMe = cache(async (): Promise<AdminMe> => {
  const me = await adminRequest<AdminMe>('GET', '/me');
  return { roles: me.roles, isPysAdmin: me.isPysAdmin, name: me.name, email: me.email };
});
