import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The signed-in person (Task 1's session). Each test chooses who is signed in.
const order: string[] = [];
const session = vi.fn();
vi.mock('@/lib/admin/session', () => ({
  getAdminSession: () => {
    order.push('session');
    return session();
  },
}));
// connection() is what keeps a page out of the build-time prerender (Cache Components).
vi.mock('next/server', () => ({ connection: async () => void order.push('connection') }));

const setEnv = (vars: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const pysFail = (status: number, code: string, message: string, details?: unknown) =>
  json(status, { success: false, error: { code, message, details } });

async function load() {
  vi.resetModules();
  return import('@/lib/admin/pys-admin');
}

let fetchMock: ReturnType<typeof vi.fn>;
const lastCall = () => fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit & { headers: Record<string, string> }];

beforeEach(() => {
  setEnv({ PYS_API_URL: 'https://pys.test', PYS_INTEGRATION_KEY_ID: 'essweb_test', PYS_INTEGRATION_SECRET: 'secret-123' });
  order.length = 0;
  session.mockReset();
  session.mockResolvedValue({ accessToken: 'token-of-asha', email: 'asha@ess.example', mustChangePassword: false });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminRequest', () => {
  it("sends the person's token with the signed call to /ess/admin and returns the data", async () => {
    const { adminRequest } = await load();
    fetchMock.mockResolvedValue(json(200, { success: true, data: { enquiries: [] } }));
    await expect(adminRequest('GET', '/enquiries')).resolves.toEqual({ enquiries: [] });
    const [url, init] = lastCall();
    expect(url).toBe('https://pys.test/api/v1/ess/admin/enquiries');
    expect(init.method).toBe('GET');
    expect(init.headers['X-PYS-Actor-Token']).toBe('token-of-asha');
    expect(init.headers['X-PYS-Signature']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sends a body as JSON', async () => {
    const { adminRequest } = await load();
    fetchMock.mockResolvedValue(json(200, { success: true, data: { lineId: 'l1', status: 'QUOTED' } }));
    await adminRequest('POST', '/enquiries/l1/quote', { total: 40500, note: null });
    const [, init] = lastCall();
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ total: 40500, note: null });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('asks the person to sign in again when there is no session, without calling PYS', async () => {
    session.mockResolvedValue(null);
    const { adminRequest, AdminAuthError } = await load();
    await expect(adminRequest('GET', '/me')).rejects.toBeInstanceOf(AdminAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for a real request before reading the session, so admin data is never prerendered', async () => {
    session.mockResolvedValue(null);
    const { adminRequest } = await load();
    await adminRequest('GET', '/me').catch(() => undefined);
    expect(order).toEqual(['connection', 'session']);
  });

  it('turns a PYS 401 (session expired) into AdminAuthError', async () => {
    const { adminRequest, AdminAuthError } = await load();
    fetchMock.mockResolvedValue(pysFail(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.'));
    await expect(adminRequest('GET', '/me')).rejects.toBeInstanceOf(AdminAuthError);
  });

  it('turns a PYS 403 (no ESS role, or admin-only) into AdminForbiddenError', async () => {
    const { adminRequest, AdminForbiddenError } = await load();
    fetchMock.mockResolvedValue(pysFail(403, 'FORBIDDEN', 'Only an ESS Admin can do this.'));
    const call = adminRequest('GET', '/users');
    await expect(call).rejects.toBeInstanceOf(AdminForbiddenError);
    await expect(call).rejects.toHaveProperty('message', "You don't have access to this.");
  });

  it("does not blame the person when this site's own key is refused (bad signature or scope)", async () => {
    const { adminRequest, AdminAuthError, AdminForbiddenError } = await load();
    const { PysError } = await import('@/lib/pys/client');

    fetchMock.mockResolvedValueOnce(pysFail(401, 'INVALID_SIGNATURE', 'Request signature is missing or invalid'));
    const badKey = await adminRequest('GET', '/me').catch((e) => e);
    expect(badKey).toBeInstanceOf(PysError);
    expect(badKey).not.toBeInstanceOf(AdminAuthError);

    fetchMock.mockResolvedValueOnce(pysFail(403, 'INSUFFICIENT_SCOPE', 'This client is not allowed to use admin:access'));
    const badScope = await adminRequest('GET', '/me').catch((e) => e);
    expect(badScope).toBeInstanceOf(PysError);
    expect(badScope).not.toBeInstanceOf(AdminForbiddenError);
  });

  it('turns a PYS 422 into AdminValidationError with one message per field (basket lines as items.N)', async () => {
    const { adminRequest, AdminValidationError } = await load();
    fetchMock.mockResolvedValue(
      pysFail(422, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'total', message: 'Enter the price', code: 'custom' },
        { field: 'total', message: 'Number must be at most 10000000', code: 'too_big' },
        { field: 'items.2.displayOrder', message: 'Expected number', code: 'invalid_type' },
        { field: 'body.gstin', message: 'GSTIN is 15 characters', code: 'invalid_string' },
        { message: 'no field' },
      ]),
    );
    const call = adminRequest('POST', '/enquiries/l1/quote', { total: 0 });
    await expect(call).rejects.toBeInstanceOf(AdminValidationError);
    await expect(call).rejects.toHaveProperty('fields', {
      total: 'Enter the price',
      'items.2': 'Expected number',
      'body.gstin': 'GSTIN is 15 characters',
    });
    await expect(call).rejects.toHaveProperty('message', 'Please check the highlighted details.');
  });

  it('passes other PYS errors through unchanged (e.g. 404, 409)', async () => {
    const { adminRequest } = await load();
    const { PysError } = await import('@/lib/pys/client');
    fetchMock.mockResolvedValue(pysFail(409, 'CONFLICT', 'This enquiry is not approved yet or is already closed.'));
    const err = await adminRequest('POST', '/enquiries/l1/close', { result: 'SOLD' }).catch((e) => e);
    expect(err).toBeInstanceOf(PysError);
    expect(err).toMatchObject({ status: 409, message: 'This enquiry is not approved yet or is already closed.' });
  });
});

describe('getMe', () => {
  it('returns the roles, PYS Admin flag, name and email from GET /ess/admin/me (nothing else)', async () => {
    const { getMe } = await load();
    fetchMock.mockResolvedValue(
      json(200, {
        success: true,
        data: { profileId: 'p-1', email: 'asha@ess.example', name: 'Asha Patel', roles: ['ESS_STAFF'], isPysAdmin: false },
      }),
    );
    await expect(getMe()).resolves.toEqual({ roles: ['ESS_STAFF'], isPysAdmin: false, name: 'Asha Patel', email: 'asha@ess.example' });
    expect(lastCall()[0]).toBe('https://pys.test/api/v1/ess/admin/me');
  });
});
