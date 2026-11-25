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
  amc: Array<{ contractNumber: string; plan: string | null; status: string; startDate: string | null; endDate: string | null; totalVisits: number | null; acCount: number }>;
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

/** The signed-in customer's own details, or null when not signed in (or the session has ended). */
export async function getAccountOverview(): Promise<AccountOverview | null> {
  const token = await accountToken();
  if (!token) return null;
  try {
    return await pysRequest<AccountOverview>('GET', '/portal/me', { headers: { 'X-PYS-Customer-Session': token } });
  } catch (err) {
    if (err instanceof PysError && err.status === 401) return null;
    throw err;
  }
}
