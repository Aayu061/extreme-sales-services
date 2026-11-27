import 'server-only';
import { cookies } from 'next/headers';
import { PysError, pysRequest } from '@/lib/pys/client';
import type { CustomerStatus } from '@/lib/pys/types';

/**
 * S11 customer accounts. The session token from PYS lives only in an httpOnly cookie on this site and travels to PYS in
 * X-PYS-Customer-Session on signed server-to-server calls. It is never shown, logged or sent to the browser's scripts.
 */
export const ACCOUNT_COOKIE = 'ess_account';
export const ACCOUNT_MAX_AGE_S = 30 * 24 * 60 * 60;

export interface AccountOverview {
  customer: { name: string; companyName: string | null; email: string | null; phone: string | null; city: string | null };
  acs: Array<{ tag: string | null; brand: string | null; model: string | null; type: string | null; tons: number | null; room: string | null; warrantyUntil: string | null }>;
  amc: Array<{
    contractNumber: string;
    plan: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    totalVisits: number | null;
    /** Visits done so far. Optional: an older PYS answer does not send it. */
    visitsUsed?: number;
    /** Visits still to come, or null when the contract has no fixed number. Optional like visitsUsed. */
    visitsLeft?: number | null;
    acCount: number;
  }>;
  requests: Array<{
    requestNumber: string;
    type: string | null;
    createdAt: string;
    status: Pick<CustomerStatus, 'code' | 'label' | 'step' | 'tone'>;
    visit: { date: string; startTime: string | null; technicianFirstName: string | null } | null;
  }>;
}

export async function accountToken(): Promise<string | null> {
  const v = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  return v && /^[A-Za-z0-9_-]{40,60}$/.test(v) ? v : null;
}

/**
 * PYS has customer accounts switched off (PORTAL_ENABLED is not 'true' → 503 PORTAL_OFF), or does not have the
 * portal routes at all yet (404). Either way this site shows its "coming soon" page.
 */
export function isPortalOff(err: unknown): boolean {
  return err instanceof PysError && ((err.status === 503 && err.code === 'PORTAL_OFF') || err.status === 404);
}

export type AccountState = { kind: 'off' } | { kind: 'signed-out' } | { kind: 'signed-in'; data: AccountOverview };

/**
 * What /account should show. Signed in → the customer's own details. Not signed in (or the session has ended) →
 * the sign-in form, but only after PYS confirms accounts are switched on. Other failures are thrown.
 */
export async function getAccountState(): Promise<AccountState> {
  const token = await accountToken();
  try {
    if (token) {
      try {
        const data = await pysRequest<AccountOverview>('GET', '/portal/me', { headers: { 'X-PYS-Customer-Session': token } });
        return { kind: 'signed-in', data };
      } catch (err) {
        if (!(err instanceof PysError && err.status === 401)) throw err;
      }
    }
    await pysRequest('GET', '/portal/status');
    return { kind: 'signed-out' };
  } catch (err) {
    if (isPortalOff(err)) return { kind: 'off' };
    throw err;
  }
}
