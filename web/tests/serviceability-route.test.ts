import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pysRequest } = vi.hoisted(() => ({ pysRequest: vi.fn() }));
vi.mock('@/lib/pys/client', () => ({ pysRequest }));

const call = async (pincode: string) => {
  const { GET } = await import('@/app/api/serviceability/[pincode]/route');
  return GET(new Request(`https://ess.test/api/serviceability/${encodeURIComponent(pincode)}`), { params: Promise.resolve({ pincode }) });
};

beforeEach(() => {
  pysRequest.mockReset();
  vi.restoreAllMocks();
});

describe('GET /api/serviceability/:pincode', () => {
  it('passes the PYS answer through and lets browsers cache it for 5 minutes', async () => {
    pysRequest.mockResolvedValue({ pincode: '400001', serviceable: true, area: 'Mumbai' });
    const res = await call('400001');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pincode: '400001', serviceable: true, area: 'Mumbai' });
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(pysRequest).toHaveBeenCalledWith('GET', '/serviceability/400001');
  });

  it('rejects anything that is not exactly 6 digits, without calling PYS', async () => {
    for (const bad of ['40001', '4000 1', 'abcdef', '4000011', '']) {
      const res = await call(bad);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Enter a 6-digit pincode.' });
    }
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('says to call when PYS cannot answer', async () => {
    const failure = Object.assign(new Error('PYS is asleep'), { status: 503 });
    pysRequest.mockImplementation(async () => {
      throw failure;
    });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('400001');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Could not check right now. Please call us.' });
    expect(logged).toHaveBeenCalled();
  });
});
