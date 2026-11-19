import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pysRequest } = vi.hoisted(() => ({ pysRequest: vi.fn() }));
vi.mock('@/lib/pys/client', async (orig) => ({ ...(await orig<typeof import('@/lib/pys/client')>()), pysRequest }));

const { PysError } = await import('@/lib/pys/client');
const { POST } = await import('@/app/api/track/route');

const post = (body: unknown) =>
  POST(new Request('https://ess.test/api/track', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': '9.9.9.9' }, body: JSON.stringify(body) }));

beforeEach(() => {
  pysRequest.mockReset();
});

describe('POST /api/track', () => {
  it('tidies the code and mobile before asking PYS', async () => {
    pysRequest.mockResolvedValue({ trackingCode: 'ESS-ABCD-1234' });
    const res = await post({ code: ' ess-abcd-1234 ', phone: '+91 98765 43210' });
    expect(res.status).toBe(200);
    const [method, path, opts] = pysRequest.mock.calls[0];
    expect([method, path]).toEqual(['POST', '/track']);
    expect(opts.body).toEqual({ code: 'ESS-ABCD-1234', phone: '9876543210', clientIpHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it('says plainly when nothing matches', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(404, 'NOT_FOUND', 'x');
    });
    const res = await post({ code: 'ESS-ABCD-1234', phone: '9876543210' });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('No request matches this tracking code and mobile number.');
  });

  it('passes on the lock-out message after too many tries', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Please try again in 30 minutes.');
    });
    const res = await post({ code: 'ESS-ABCD-1234', phone: '9876543210' });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('Too many attempts. Please try again in 30 minutes.');
  });

  it('checks the details before calling PYS', async () => {
    for (const body of [{ code: 'ESS-ABCD-1234', phone: '12345' }, { code: 'abc', phone: '9876543210' }, {}]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Enter your tracking code and the 10-digit mobile number you used.');
    }
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('asks to try again when PYS is down', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(503, 'PYS_UNREACHABLE', 'down');
    });
    const res = await post({ code: 'ESS-ABCD-1234', phone: '9876543210' });
    expect(res.status).toBe(502);
  });
});
