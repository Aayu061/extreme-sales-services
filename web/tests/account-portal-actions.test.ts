import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: cookies, redirect and the signed PYS client (as in account-actions.test.ts) ----
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => jar.set(n, v),
    delete: (n: string) => jar.delete(n),
  }),
}));
class Redirect extends Error {
  constructor(public to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Redirect(to); } }));
const pysRequest = vi.fn();
vi.mock('@/lib/pys/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pys/client')>()),
  pysRequest: (...a: unknown[]) => pysRequest(...a),
}));

import { forgetEndedSession, renewAmc, requestProfileChange, signOutAll } from '@/app/(site)/account/actions';
import { PysError } from '@/lib/pys/client';
import { ACCOUNT_COOKIE, isPortalRef, portalGet, portalPath } from '@/lib/account';

const TOKEN = 'b'.repeat(43);
const SESSION = { 'X-PYS-Customer-Session': TOKEN };
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const idle = { status: 'idle' as const };

beforeEach(() => {
  jar.clear();
  jar.set(ACCOUNT_COOKIE, TOKEN);
  pysRequest.mockReset();
});

describe('portalGet (S11b): the customer comes only from the session cookie', () => {
  it('ok, with the session header', async () => {
    pysRequest.mockResolvedValue({ acs: [] });
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'ok', data: { acs: [] } });
    expect(pysRequest).toHaveBeenCalledWith('GET', '/portal/acs', { headers: SESSION });
  });

  it('401 → signed out (ended); 503 PORTAL_OFF → off; 404 → not found on detail pages, off on lists; else error', async () => {
    pysRequest.mockRejectedValueOnce(new PysError(401, 'SESSION_ENDED', 'x'));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'signed-out', ended: true });
    pysRequest.mockRejectedValueOnce(new PysError(503, 'PORTAL_OFF', 'x'));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'off' });
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x'));
    expect(await portalGet('/portal/acs/x', { detail: true })).toEqual({ kind: 'not-found' });
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x'));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'off' }); // a PYS without the portal routes
    // A portal route's own 404 on a list page is an error, not "coming soon"; on a detail page still "not found".
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x', { portal: true }));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'error' });
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x', { portal: true }));
    expect(await portalGet('/portal/acs/x', { detail: true })).toEqual({ kind: 'not-found' });
    pysRequest.mockRejectedValueOnce(new PysError(503, 'PYS_UNREACHABLE', 'x'));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'error' });
  });

  it('no cookie: only /portal/status is asked; off or signed out', async () => {
    jar.clear();
    pysRequest.mockResolvedValueOnce({ enabled: true });
    expect(await portalGet('/portal/acs/x', { detail: true })).toEqual({ kind: 'signed-out', ended: false });
    pysRequest.mockRejectedValueOnce(new PysError(503, 'PORTAL_OFF', 'x'));
    expect(await portalGet('/portal/acs/x', { detail: true })).toEqual({ kind: 'off' });
    pysRequest.mockRejectedValueOnce(new PysError(500, 'INTERNAL', 'x'));
    expect(await portalGet('/portal/acs')).toEqual({ kind: 'error' });
    expect(pysRequest.mock.calls.every(([, p]) => p === '/portal/status')).toBe(true);
  });

  it('only sane ids reach PYS, encoded', () => {
    expect(isPortalRef('SR-2026-0042')).toBe(true);
    expect(isPortalRef('INV/2026/9')).toBe(true);
    expect(isPortalRef('../me')).toBe(false);
    expect(isPortalRef('a b')).toBe(false);
    expect(isPortalRef('')).toBe(false);
    expect(isPortalRef('x'.repeat(81))).toBe(false);
    expect(portalPath('/portal/billing', 'INV/2026/9')).toBe('/portal/billing/INV%2F2026%2F9');
  });
});

describe('renewAmc', () => {
  it('sends the renewal request for the session customer and shows the reference', async () => {
    pysRequest.mockResolvedValue({ requested: true, reference: 'WEB-123' });
    const s = await renewAmc(idle, fd({ contractId: 'amc1', note: ' Please call after 6 ' }));
    expect(s).toEqual({ status: 'done', reference: 'WEB-123' });
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/amc/amc1/renew', { headers: SESSION, body: { note: 'Please call after 6' } });
  });

  it('an already-open request says so instead of "sent"', async () => {
    pysRequest.mockResolvedValue({ requested: true, reference: 'WEB-OLD', alreadyRequested: true });
    expect(await renewAmc(idle, fd({ contractId: 'amc1' }))).toEqual({ status: 'done', reference: 'WEB-OLD', already: true });
  });

  it('not renewable (409) and refused input (400) get their own words, keeping the note', async () => {
    pysRequest.mockRejectedValueOnce(new PysError(409, 'NOT_RENEWABLE', 'x'));
    expect(await renewAmc(idle, fd({ contractId: 'amc1', note: 'mine' }))).toMatchObject({
      status: 'error',
      error: expect.stringMatching(/cannot be renewed online/),
      value: 'mine',
    });
    pysRequest.mockRejectedValueOnce(new PysError(400, 'INVALID_INPUT', 'x'));
    expect(await renewAmc(idle, fd({ contractId: 'amc1', note: 'mine' }))).toMatchObject({
      status: 'error',
      error: expect.stringMatching(/check the note/),
      value: 'mine',
    });
  });

  it('without a note sends an empty body', async () => {
    pysRequest.mockResolvedValue({ requested: true, reference: 'WEB-123' });
    await renewAmc(idle, fd({ contractId: 'amc1' }));
    expect(pysRequest.mock.calls[0][2].body).toEqual({});
  });

  it('refuses a long note or a bad id without asking PYS', async () => {
    expect((await renewAmc(idle, fd({ contractId: 'amc1', note: 'x'.repeat(501) }))).error).toMatch(/500 characters/);
    expect((await renewAmc(idle, fd({ contractId: '../../x' }))).status).toBe('error');
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('ended session, not found, off and other failures read clearly', async () => {
    pysRequest.mockRejectedValueOnce(new PysError(401, 'SESSION_ENDED', 'x'));
    expect((await renewAmc(idle, fd({ contractId: 'amc1' }))).error).toMatch(/session has ended/);
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x'));
    expect((await renewAmc(idle, fd({ contractId: 'amc1' }))).error).toMatch(/could not find this contract/);
    pysRequest.mockRejectedValueOnce(new PysError(503, 'PORTAL_OFF', 'x'));
    expect((await renewAmc(idle, fd({ contractId: 'amc1' }))).error).toMatch(/not available right now/);
    pysRequest.mockRejectedValueOnce(new PysError(500, 'INTERNAL', 'x'));
    const s = await renewAmc(idle, fd({ contractId: 'amc1', note: 'keep me' }));
    expect(s).toMatchObject({ status: 'error', value: 'keep me' });
  });

  it('no cookie: not sent', async () => {
    jar.clear();
    expect((await renewAmc(idle, fd({ contractId: 'amc1' }))).error).toMatch(/session has ended/);
    expect(pysRequest).not.toHaveBeenCalled();
  });
});

describe('requestProfileChange', () => {
  it('needs 5 to 1000 characters (checked before PYS)', async () => {
    expect(await requestProfileChange(idle, fd({ message: ' abc ' }))).toMatchObject({ status: 'error', value: 'abc' });
    expect((await requestProfileChange(idle, fd({ message: 'x'.repeat(1001) }))).error).toMatch(/1000 characters/);
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('sends the message and shows the reference', async () => {
    pysRequest.mockResolvedValue({ requested: true, reference: 'WEB-9' });
    const s = await requestProfileChange(idle, fd({ message: 'New phone 98200 00000' }));
    expect(s).toEqual({ status: 'done', reference: 'WEB-9' });
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/profile/change-request', { headers: SESSION, body: { message: 'New phone 98200 00000' } });
  });

  it('429 RATE_LIMITED → five a day message, keeping the text', async () => {
    pysRequest.mockRejectedValue(new PysError(429, 'RATE_LIMITED', 'x'));
    const s = await requestProfileChange(idle, fd({ message: 'New phone 98200 00000' }));
    expect(s.error).toMatch(/5 change requests today/);
    expect(s.value).toBe('New phone 98200 00000');
  });

  it('ended session', async () => {
    pysRequest.mockRejectedValue(new PysError(401, 'SESSION_ENDED', 'x'));
    expect((await requestProfileChange(idle, fd({ message: 'New phone please' }))).error).toMatch(/session has ended/);
  });
});

describe('signOutAll', () => {
  it('ends every session at PYS, clears the cookie and goes to /account', async () => {
    pysRequest.mockResolvedValue({ signedOut: true });
    const err = await signOutAll().catch((e) => e);
    expect(err).toBeInstanceOf(Redirect);
    expect(err.to).toBe('/account');
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/sign-out-all', { headers: SESSION });
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });

  it('an already ended session still clears the cookie', async () => {
    pysRequest.mockRejectedValue(new PysError(401, 'SESSION_ENDED', 'x'));
    await signOutAll().catch(() => undefined);
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });

  it('if PYS fails, says so and keeps this device signed in (the others may still be too)', async () => {
    pysRequest.mockRejectedValue(new PysError(503, 'PYS_UNREACHABLE', 'x'));
    const s = await signOutAll();
    expect(s.error).toMatch(/could not sign out your other devices/);
    expect(jar.has(ACCOUNT_COOKIE)).toBe(true);
  });
});

describe('forgetEndedSession', () => {
  it('removes the cookie only when PYS confirms the session has ended', async () => {
    pysRequest.mockResolvedValueOnce({ customer: {} });
    await forgetEndedSession();
    expect(jar.has(ACCOUNT_COOKIE)).toBe(true);
    pysRequest.mockRejectedValueOnce(new PysError(503, 'PYS_UNREACHABLE', 'x'));
    await forgetEndedSession();
    expect(jar.has(ACCOUNT_COOKIE)).toBe(true);
    pysRequest.mockRejectedValueOnce(new PysError(401, 'SESSION_ENDED', 'x'));
    await forgetEndedSession();
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });
});
