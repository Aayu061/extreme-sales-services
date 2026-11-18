import { describe, it, expect, vi, beforeEach } from 'vitest';

const setEnv = (vars: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};

async function loadClient() {
  vi.resetModules();
  return import('@/lib/pys/client');
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('PYS client', () => {
  beforeEach(() => {
    setEnv({ PYS_API_URL: 'https://pys.test/api/v1/', PYS_INTEGRATION_KEY_ID: 'essweb_test', PYS_INTEGRATION_SECRET: 'secret-123' });
    vi.useRealTimers();
  });

  it('refuses to call PYS when the key is not configured', async () => {
    setEnv({ PYS_INTEGRATION_SECRET: undefined });
    const { pysRequest, PysNotConfiguredError } = await loadClient();
    await expect(pysRequest('GET', '/catalog', { fetchImpl: vi.fn() })).rejects.toBeInstanceOf(PysNotConfiguredError);
  });

  it('signs the call, strips a trailing /api/v1 from the base and returns data', async () => {
    const { pysRequest } = await loadClient();
    const fetchImpl = vi.fn(async () => json(200, { success: true, data: { version: 3 } }));
    await expect(pysRequest('GET', '/catalog', { fetchImpl })).resolves.toEqual({ version: 3 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://pys.test/api/v1/ess/catalog');
    const h = init.headers as Record<string, string>;
    expect(h['X-PYS-Key-Id']).toBe('essweb_test');
    expect(h['X-PYS-Signature']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('retries a read once when PYS is waking up, with a fresh nonce', async () => {
    const { pysRequest } = await loadClient();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(503, { success: false, error: { code: 'X', message: 'starting' } }))
      .mockResolvedValueOnce(json(200, { success: true, data: 'ok' }));
    await expect(pysRequest('GET', '/areas', { fetchImpl })).resolves.toBe('ok');
    const nonces = fetchImpl.mock.calls.map((c) => (c[1] as RequestInit & { headers: Record<string, string> }).headers['X-PYS-Nonce']);
    expect(new Set(nonces).size).toBe(2);
  });

  it('never retries a 4xx, and passes PYS validation details through', async () => {
    const { pysRequest, PysError } = await loadClient();
    const fetchImpl = vi.fn(async () =>
      json(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'phone' }] } }),
    );
    const err = await pysRequest('POST', '/intakes', { fetchImpl, body: {}, headers: { 'Idempotency-Key': 'abcdefgh-1' } }).catch((e) => e);
    expect(err).toBeInstanceOf(PysError);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION_ERROR', details: [{ field: 'phone' }] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a write without an Idempotency-Key', async () => {
    const { pysRequest } = await loadClient();
    const fetchImpl = vi.fn(async () => json(500, { success: false, error: { code: 'X', message: 'boom' } }));
    await expect(pysRequest('POST', '/intakes', { fetchImpl, body: {} })).rejects.toMatchObject({ status: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
