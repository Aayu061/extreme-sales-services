import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pysRequest, accountToken } = vi.hoisted(() => ({ pysRequest: vi.fn(), accountToken: vi.fn() }));
vi.mock('@/lib/pys/client', async (orig) => ({ ...(await orig<typeof import('@/lib/pys/client')>()), pysRequest }));
// The customer's sign-in cookie (S11): none unless a test says so.
vi.mock('@/lib/account', () => ({ accountToken }));

const { PysError } = await import('@/lib/pys/client');
const { POST } = await import('@/app/api/request/route');

const valid = {
  kind: 'BASKET',
  ref: 'web-route-test-1',
  items: [{ type: 'SERVICE', ref: 'SVC-JET-WASH', quantity: 1 }],
  address: { line: '12 Sea View, Chembur', city: 'Mumbai' },
  contact: { name: 'Asha Rao', phone: '+91 98765 43210' },
  consent: { privacy: true, marketing: false },
  hp: '',
  elapsedMs: 9000,
};
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('https://ess.test/api/request', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));

beforeEach(() => {
  pysRequest.mockReset();
  accountToken.mockReset().mockResolvedValue(null);
});

describe('POST /api/request', () => {
  it('a signed-in customer: the session goes to PYS in its header (PYS links the request); never in the body', async () => {
    const token = 't'.repeat(43);
    accountToken.mockResolvedValue(token);
    pysRequest.mockResolvedValue({ intakeNumber: 'WEB-2', trackingCode: 'ESS-CCCC-DDDD', status: 'PENDING_REVIEW' });
    expect((await post(valid)).status).toBe(200);
    const opts = pysRequest.mock.calls[0][2];
    expect(opts.headers['X-PYS-Customer-Session']).toBe(token);
    expect(JSON.stringify(opts.body)).not.toContain(token);
  });

  it('nobody signed in: no session header', async () => {
    pysRequest.mockResolvedValue({ intakeNumber: 'WEB-3', trackingCode: 'ESS-EEEE-FFFF', status: 'PENDING_REVIEW' });
    await post(valid);
    expect(pysRequest.mock.calls[0][2].headers).not.toHaveProperty('X-PYS-Customer-Session');
  });

  it('sends one request to PYS with the reference as the idempotency key', async () => {
    pysRequest.mockResolvedValue({ intakeNumber: 'WEB-1', trackingCode: 'ESS-AAAA-BBBB', status: 'PENDING_REVIEW' });
    const res = await post(valid, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ intakeNumber: 'WEB-1', trackingCode: 'ESS-AAAA-BBBB' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(pysRequest).toHaveBeenCalledTimes(1);
    const [method, path, opts] = pysRequest.mock.calls[0];
    expect([method, path]).toEqual(['POST', '/intakes']);
    expect(opts.headers['Idempotency-Key']).toMatch(/^web-route-test-1:[0-9a-f]{16}$/);
    expect(opts.body.externalReferenceId).toBe('web-route-test-1');
    expect(opts.body.meta.clientIpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(opts.body.contact.phone).toBe('9876543210');
  });

  it('refuses bad details without calling PYS', async () => {
    const res = await post({ ...valid, contact: { name: 'Asha', phone: '12345' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Please check the highlighted details.');
    expect(body.fields['contact.phone']).toBeTruthy();
    expect(pysRequest).not.toHaveBeenCalled();
  });

  it('points at the basket line PYS refused', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'items.0.productId', message: 'This AC is no longer available' }]);
    });
    const res = await post(valid);
    expect(res.status).toBe(422);
    expect((await res.json()).fields['items.0']).toBe('This AC is no longer available');
  });

  it('asks the customer to try again when PYS is down', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(503, 'PYS_UNREACHABLE', 'down');
    });
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('We could not send your request right now. Please try again in a minute, or call us.');
  });

  it('keeps one key per exact body, and a new key when the details change', async () => {
    pysRequest.mockResolvedValue({ intakeNumber: 'WEB-1', trackingCode: 'ESS-AAAA-BBBB', status: 'PENDING_REVIEW' });
    await post(valid);
    await post(valid);
    await post({ ...valid, items: [{ ...valid.items[0], quantity: 2 }] });
    const keys = pysRequest.mock.calls.map((c) => c[2].headers['Idempotency-Key']);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
    for (const k of keys) expect(k).toMatch(/^[A-Za-z0-9_.:-]{8,200}$/);
    expect(pysRequest.mock.calls.every((c) => c[2].body.externalReferenceId === 'web-route-test-1')).toBe(true);
  });

  it('asks the customer to wait when PYS is still working on the same request', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(409, 'REQUEST_IN_PROGRESS', 'busy');
    });
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('Your request is still being sent. Please wait a few seconds and tap Send again.');
  });

  it('shows a PYS message-length error on the message box', async () => {
    pysRequest.mockImplementation(async () => {
      throw new PysError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'request.message', message: 'Too long' }]);
    });
    const res = await post(valid);
    expect((await res.json()).fields.message).toBe('Too long');
  });

  it('answers 400 to a body that is not JSON', async () => {
    const res = await POST(new Request('https://ess.test/api/request', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(400);
  });
});
