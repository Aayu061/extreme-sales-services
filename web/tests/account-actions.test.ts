import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: cookies, redirect and the signed PYS client ----
const jar = new Map<string, { value: string; opts?: Record<string, unknown> }>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)!.value } : undefined),
    set: (n: string, value: string, opts?: Record<string, unknown>) => jar.set(n, { value, opts }),
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

import { requestCode, signIn, signOut } from '@/app/(site)/account/actions';
import { PysError } from '@/lib/pys/client';
import { ACCOUNT_COOKIE, getAccountState } from '@/lib/account';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const TOKEN = 'a'.repeat(43);

beforeEach(() => {
  jar.clear();
  pysRequest.mockReset();
});

describe('customer account sign-in (S11)', () => {
  it('a bad email is refused without asking PYS', async () => {
    const s = await requestCode({ step: 'email', email: '' }, fd({ email: 'not-an-email' }));
    expect(s.step).toBe('email');
    expect(s.error).toMatch(/email address/);
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('any valid email gets the same "if it has an account" answer (no account enumeration)', async () => {
    pysRequest.mockResolvedValue({ sent: true });
    const s = await requestCode({ step: 'email', email: '' }, fd({ email: ' Asha@Example.com ' }));
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/code', { body: { email: 'asha@example.com' } });
    expect(s).toMatchObject({ step: 'code', email: 'asha@example.com' });
    expect(s.message).toMatch(/^If asha@example\.com has an account with us/);
  });

  it('a wrong or expired code shows a clear message and sets no cookie', async () => {
    pysRequest.mockRejectedValue(new PysError(401, 'CODE_REJECTED', 'x'));
    const s = await signIn({ step: 'code', email: 'asha@example.com' }, fd({ email: 'asha@example.com', code: '123456' }));
    expect(s.error).toMatch(/not right or has expired/);
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });

  it('a code that is not 6 digits is refused without asking PYS', async () => {
    const s = await signIn({ step: 'code', email: 'a@b.co' }, fd({ email: 'a@b.co', code: '12ab' }));
    expect(s.error).toMatch(/6-digit/);
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('the right code stores the session in an httpOnly cookie and opens the account', async () => {
    pysRequest.mockResolvedValue({ token: TOKEN, expiresAt: '2026-12-25T00:00:00Z' });
    const err = await signIn({ step: 'code', email: 'asha@example.com' }, fd({ email: 'asha@example.com', code: '123 456' })).catch((e) => e);
    expect(err).toBeInstanceOf(Redirect);
    expect(err.to).toBe('/account');
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/sign-in', { body: { email: 'asha@example.com', code: '123456' } });
    const c = jar.get(ACCOUNT_COOKIE)!;
    expect(c.value).toBe(TOKEN);
    expect(c.opts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('sign-out ends the session at PYS and removes the cookie', async () => {
    jar.set(ACCOUNT_COOKIE, { value: TOKEN });
    pysRequest.mockResolvedValue({ signedOut: true });
    await signOut().catch(() => undefined);
    expect(pysRequest).toHaveBeenCalledWith('POST', '/portal/sign-out', { headers: { 'X-PYS-Customer-Session': TOKEN } });
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });
});

describe('customer accounts switched off in PYS (PORTAL_ENABLED kill switch)', () => {
  const off = () => new PysError(503, 'PORTAL_OFF', 'off');

  it('asking for a code says login is not available (not a generic failure)', async () => {
    pysRequest.mockRejectedValue(off());
    const s = await requestCode({ step: 'email', email: '' }, fd({ email: 'asha@example.com' }));
    expect(s).toMatchObject({ step: 'email' });
    expect(s.error).toMatch(/not available right now/);
  });

  it('signing in says login is not available and sets no cookie', async () => {
    pysRequest.mockRejectedValue(off());
    const s = await signIn({ step: 'code', email: 'asha@example.com' }, fd({ email: 'asha@example.com', code: '123456' }));
    expect(s.error).toMatch(/not available right now/);
    expect(jar.has(ACCOUNT_COOKIE)).toBe(false);
  });

  it('/account state: off when PYS answers PORTAL_OFF or has no portal routes (404)', async () => {
    pysRequest.mockRejectedValueOnce(off());
    expect(await getAccountState()).toEqual({ kind: 'off' });
    pysRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'x'));
    expect(await getAccountState()).toEqual({ kind: 'off' });
    expect(pysRequest).toHaveBeenCalledWith('GET', '/portal/status');
  });

  it('/account state: off even with an old cookie (the session is not used)', async () => {
    jar.set(ACCOUNT_COOKIE, { value: TOKEN });
    pysRequest.mockRejectedValue(off());
    expect(await getAccountState()).toEqual({ kind: 'off' });
  });

  it('/account state: signed out when on and no cookie; ended session falls back to sign-in', async () => {
    pysRequest.mockResolvedValue({ enabled: true });
    expect(await getAccountState()).toEqual({ kind: 'signed-out' });
    jar.set(ACCOUNT_COOKIE, { value: TOKEN });
    pysRequest.mockReset();
    pysRequest.mockRejectedValueOnce(new PysError(401, 'SESSION_ENDED', 'x')).mockResolvedValueOnce({ enabled: true });
    expect(await getAccountState()).toEqual({ kind: 'signed-out' });
  });

  it('/account state: signed in returns the overview; other PYS failures are thrown (error box)', async () => {
    jar.set(ACCOUNT_COOKIE, { value: TOKEN });
    const data = { customer: { name: 'Asha' }, acs: [], amc: [], requests: [] };
    pysRequest.mockResolvedValueOnce(data);
    expect(await getAccountState()).toEqual({ kind: 'signed-in', data });
    pysRequest.mockRejectedValueOnce(new PysError(500, 'INTERNAL', 'x'));
    await expect(getAccountState()).rejects.toBeInstanceOf(PysError);
  });
});
