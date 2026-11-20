import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: redirect() throws like Next does; the proxy passes the admin path in a header ----

class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  // Like the real one: Next's own redirect/notFound errors go on, everything else is left alone.
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));

let requestHeaders = new Headers();
vi.mock('next/headers', () => ({ headers: async () => requestHeaders, cookies: async () => ({ get: () => undefined, getAll: () => [] }) }));

import { ADMIN_PATH_HEADER, adminPathOf, isUnknownAdminPage } from '@/lib/admin/gate';
import { expiredLoginUrl, guardAdmin, loadAdmin } from '@/lib/admin/guard';
import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';

async function redirectOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof Redirected) return e.url;
    throw e;
  }
  throw new Error('expected a redirect');
}

beforeEach(() => {
  requestHeaders = new Headers();
});

describe('guardAdmin', () => {
  it('passes the answer through', async () => {
    expect(await guardAdmin(Promise.resolve({ total: 3 }), '/admin/requests')).toEqual({ total: 3 });
  });

  it('sends an expired session to sign in again, coming back to the same admin page', async () => {
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminAuthError()), '/admin/requests?status=APPROVED&page=2'))).toBe(
      '/admin/login?expired=1&next=%2Fadmin%2Frequests%3Fstatus%3DAPPROVED%26page%3D2',
    );
  });

  it('reads the current admin page from the proxy header when no path is given', async () => {
    requestHeaders.set(ADMIN_PATH_HEADER, '/admin/enquiries');
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminAuthError())))).toBe('/admin/login?expired=1&next=%2Fadmin%2Fenquiries');
  });

  it('never comes back to a page outside /admin (or with no known page)', async () => {
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminAuthError()), 'https://evil.example/admin'))).toBe('/admin/login?expired=1');
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminAuthError()), '/shop'))).toBe('/admin/login?expired=1');
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminAuthError())))).toBe('/admin/login?expired=1');
    expect(expiredLoginUrl('/admin/login')).toBe('/admin/login?expired=1');
  });

  it('sends someone without access to the no-access page', async () => {
    expect(await redirectOf(guardAdmin(Promise.reject(new AdminForbiddenError()), '/admin/users'))).toBe('/admin/no-access');
  });

  it('leaves every other error to the page (PYS down, bad signature, bad input)', async () => {
    const down = new PysError(503, 'HTTP_503', 'PYS answered 503');
    await expect(guardAdmin(Promise.reject(down), '/admin')).rejects.toBe(down);
    const badKey = new PysError(401, 'INVALID_SIGNATURE', 'Request signature is missing or invalid');
    await expect(guardAdmin(Promise.reject(badKey), '/admin')).rejects.toBe(badKey);
    const invalid = new AdminValidationError({ total: 'Too big' });
    await expect(guardAdmin(Promise.reject(invalid), '/admin')).rejects.toBe(invalid);
  });
});

describe('loadAdmin', () => {
  it('gives the data, or { ok: false } when PYS cannot be reached (logging no customer details)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadAdmin(Promise.resolve([1, 2]), '/admin')).toEqual({ ok: true, data: [1, 2] });
    expect(await loadAdmin(Promise.reject(new PysError(0, 'NETWORK_ERROR', 'fetch failed')), '/admin')).toEqual({ ok: false });
    expect(await loadAdmin(Promise.reject(new TypeError('fetch failed')), '/admin')).toEqual({ ok: false });
    expect(await loadAdmin(Promise.reject(new PysError(404, 'NOT_FOUND', 'No request for Priya Shah')), '/admin')).toEqual({ ok: false });
    expect(log.mock.calls.flat().join(' ')).not.toContain('Priya');
    log.mockRestore();
  });

  it('leaves a render that Next stopped itself to Next (no "PYS failed" message)', async () => {
    const aborted = new DOMException('This operation was aborted', 'AbortError');
    await expect(loadAdmin(Promise.reject(aborted), '/admin')).rejects.toBe(aborted);
  });

  it('still redirects for an expired session or no access', async () => {
    expect(await redirectOf(loadAdmin(Promise.reject(new AdminAuthError()), '/admin/requests'))).toBe('/admin/login?expired=1&next=%2Fadmin%2Frequests');
    expect(await redirectOf(loadAdmin(Promise.reject(new AdminForbiddenError()), '/admin/requests'))).toBe('/admin/no-access');
  });
});

describe('admin pages that do not exist', () => {
  it('knows the admin screens by their first part', () => {
    for (const path of ['/admin', '/admin/', '/admin/requests', '/admin/enquiries', '/admin/products/abc', '/admin/no-access', '/admin/login', '/admin/reset', '/admin/change-password', '/admin/users']) {
      expect(isUnknownAdminPage(path), path).toBe(false);
    }
    for (const path of ['/admin/does-not-exist', '/admin/Requests', '/admin/requestsx', '/admin/x/requests']) {
      expect(isUnknownAdminPage(path), path).toBe(true);
    }
    expect(isUnknownAdminPage('/shop/x')).toBe(false);
  });

  it('keeps the path and query of the page, without the router-only _rsc value or a search', () => {
    expect(adminPathOf(new URL('https://ess.example/admin/requests?status=APPROVED&_rsc=abc'))).toBe('/admin/requests?status=APPROVED');
    expect(adminPathOf(new URL('https://ess.example/admin?_rsc=1'))).toBe('/admin');
    // A search can be a customer's phone or email: never passed on (next=, Try again links).
    expect(adminPathOf(new URL('https://ess.example/admin/requests?search=9820012345&kind=BASKET'))).toBe('/admin/requests?kind=BASKET');
  });
});

describe('proxy for admin pages (test admin, mock PYS)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PYS_API_URL', 'http://localhost:4010');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const call = async (path: string, cookie?: string) => {
    const { NextRequest } = await import('next/server');
    const { proxy } = await import('@/proxy');
    return proxy(new NextRequest(`https://ess.example${path}`, { headers: cookie ? { cookie } : {} }));
  };
  const SIGNED_IN = 'ess-admin-dev=dev-admin-token';

  it('answers 404 for an admin page that does not exist (signed in), never cached', async () => {
    const res = await call('/admin/does-not-exist', SIGNED_IN);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('opens real admin pages as usual and tells them which page they are', async () => {
    const res = await call('/admin/requests?kind=BASKET', SIGNED_IN);
    expect(res.status).toBe(200);
    expect(res.headers.get(`x-middleware-request-${ADMIN_PATH_HEADER}`)).toBe('/admin/requests?kind=BASKET');
  });

  it('does not trust a page header sent by the browser', async () => {
    const { NextRequest } = await import('next/server');
    const { proxy } = await import('@/proxy');
    const res = await proxy(new NextRequest('https://ess.example/admin', { headers: { cookie: SIGNED_IN, [ADMIN_PATH_HEADER]: 'https://evil.example' } }));
    expect(res.headers.get(`x-middleware-request-${ADMIN_PATH_HEADER}`)).toBe('/admin');
  });

  it('drops a search from an old admin link straight away (it can be a phone or email)', async () => {
    const res = await call('/admin/requests?kind=BASKET&search=9820012345', SIGNED_IN);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ess.example/admin/requests?kind=BASKET');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const signedOut = await call('/admin/requests?search=priya%40example.com');
    expect(signedOut.headers.get('location')).toBe('https://ess.example/admin/requests');
  });

  it('still sends a signed-out visitor to sign in first', async () => {
    const res = await call('/admin/does-not-exist');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ess.example/admin/login?next=%2Fadmin%2Fdoes-not-exist');
  });
});
