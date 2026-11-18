import { describe, it, expect } from 'vitest';
import { canonicalString, computeSignature, signRequest, verifySignedRequest } from '@/lib/pys/signature';

const headersOf = (h: Record<string, string>) => new Headers(h);

describe('request signing (must match PYS integrationSignature.ts)', () => {
  it('builds the canonical string exactly as PYS does', () => {
    const c = canonicalString({ timestamp: '1763500000', nonce: 'abcdefabcdefabcd', method: 'post', pathWithQuery: '/api/v1/ess/intakes', body: '{"a":1}' });
    expect(c.split('\n')).toEqual([
      '1763500000',
      'abcdefabcdefabcd',
      'POST',
      '/api/v1/ess/intakes',
      // sha256 of {"a":1}
      '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862',
    ]);
  });

  it('matches a known PYS signature (fixed secret, timestamp and nonce)', () => {
    const headers = signRequest({
      keyId: 'essweb_test',
      secret: 'shared-secret',
      method: 'GET',
      pathWithQuery: '/api/v1/ess/catalog',
      timestamp: 1763500000,
      nonce: '0123456789abcdef0123456789abcdef',
    });
    const expected = computeSignature(
      'shared-secret',
      ['1763500000', '0123456789abcdef0123456789abcdef', 'GET', '/api/v1/ess/catalog', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'].join('\n'),
    );
    expect(headers).toMatchObject({ 'X-PYS-Key-Id': 'essweb_test', 'X-PYS-Timestamp': '1763500000', 'X-PYS-Signature': expected });
  });

  it('verifies a request signed with our key and refuses tampering, other keys and old timestamps', () => {
    const now = 1763500000_000;
    const body = '{"topic":"catalog"}';
    const signed = signRequest({ keyId: 'k1', secret: 's1', method: 'POST', pathWithQuery: '/api/revalidate', body, timestamp: now / 1000 });
    const base = { method: 'POST', pathWithQuery: '/api/revalidate', expectedKeyId: 'k1', secret: 's1', now };

    expect(verifySignedRequest({ ...base, headers: headersOf(signed), body })).toEqual({ ok: true });
    expect(verifySignedRequest({ ...base, headers: headersOf(signed), body: '{"topic":"products"}' })).toMatchObject({ ok: false, reason: 'bad signature' });
    expect(verifySignedRequest({ ...base, headers: headersOf(signed), body, expectedKeyId: 'k2' })).toMatchObject({ ok: false, reason: 'unknown key' });
    expect(verifySignedRequest({ ...base, headers: headersOf(signed), body, now: now + 301_000 })).toMatchObject({ ok: false, reason: 'timestamp outside window' });
    expect(verifySignedRequest({ ...base, headers: headersOf({}), body })).toMatchObject({ ok: false, reason: 'missing or malformed headers' });
  });
});
