import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signRequest } from '@/lib/pys/signature';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/revalidate/route');
}

function signedPost(body: string, opts: { keyId?: string; secret?: string; path?: string } = {}) {
  const path = opts.path ?? '/api/revalidate';
  const headers = signRequest({ keyId: opts.keyId ?? 'essweb_test', secret: opts.secret ?? 'secret-123', method: 'POST', pathWithQuery: path, body });
  return new Request(`https://ess.test${path}`, { method: 'POST', headers, body });
}

describe('POST /api/revalidate (from PYS)', () => {
  beforeEach(() => {
    process.env.PYS_INTEGRATION_KEY_ID = 'essweb_test';
    process.env.PYS_INTEGRATION_SECRET = 'secret-123';
    revalidateTag.mockClear();
  });

  it('refreshes the topic PYS names when the call is signed with our key', async () => {
    const { POST } = await loadRoute();
    const res = await POST(signedPost('{"topic":"catalog","eventId":"e1"}'));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('catalog', 'max');
  });

  it('refuses unsigned, wrongly signed or unknown-topic calls', async () => {
    const { POST } = await loadRoute();
    const unsigned = new Request('https://ess.test/api/revalidate', { method: 'POST', body: '{"topic":"catalog"}' });
    expect((await POST(unsigned)).status).toBe(401);
    expect((await POST(signedPost('{"topic":"catalog"}', { secret: 'wrong' }))).status).toBe(401);
    expect((await POST(signedPost('{"topic":"catalog"}', { keyId: 'other' }))).status).toBe(401);
    expect((await POST(signedPost('{"topic":"everything"}'))).status).toBe(400);
    expect((await POST(signedPost('not json'))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 503 when this site has no PYS key yet', async () => {
    delete process.env.PYS_INTEGRATION_SECRET;
    const { POST } = await loadRoute();
    expect((await POST(signedPost('{"topic":"catalog"}'))).status).toBe(503);
  });
});
