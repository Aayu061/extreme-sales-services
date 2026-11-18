import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Same request signing as PYS (server/src/utils/integrationSignature.ts):
 *   canonical = timestamp \n nonce \n METHOD \n pathWithQuery \n sha256hex(rawBody)
 *   signature = hex HMAC-SHA256(secret, canonical)
 * The exact body string that is signed must be the exact string that is sent.
 */

export const SIGNATURE_HEADERS = {
  keyId: 'x-pys-key-id',
  timestamp: 'x-pys-timestamp',
  nonce: 'x-pys-nonce',
  signature: 'x-pys-signature',
} as const;

/** Requests older/newer than this are refused (clock skew + replay window). */
export const MAX_CLOCK_SKEW_SECONDS = 300;

export function sha256Hex(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export function canonicalString(parts: {
  timestamp: string;
  nonce: string;
  method: string;
  pathWithQuery: string;
  body?: string;
}): string {
  return [parts.timestamp, parts.nonce, parts.method.toUpperCase(), parts.pathWithQuery, sha256Hex(parts.body ?? '')].join('\n');
}

export function computeSignature(secret: string, canonical: string): string {
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

/** Headers for a signed request to PYS. */
export function signRequest(input: {
  keyId: string;
  secret: string;
  method: string;
  pathWithQuery: string;
  body?: string;
  timestamp?: number;
  nonce?: string;
}): Record<string, string> {
  const timestamp = String(input.timestamp ?? Math.floor(Date.now() / 1000));
  const nonce = input.nonce ?? randomBytes(16).toString('hex');
  const signature = computeSignature(
    input.secret,
    canonicalString({ timestamp, nonce, method: input.method, pathWithQuery: input.pathWithQuery, body: input.body }),
  );
  return {
    'X-PYS-Key-Id': input.keyId,
    'X-PYS-Timestamp': timestamp,
    'X-PYS-Nonce': nonce,
    'X-PYS-Signature': signature,
  };
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/** Checks a request PYS sent to us (e.g. the website refresh signal), signed with our own key. */
export function verifySignedRequest(input: {
  headers: { get(name: string): string | null };
  method: string;
  pathWithQuery: string;
  body: string;
  expectedKeyId: string;
  secret: string;
  now?: number;
}): VerifyResult {
  const keyId = input.headers.get(SIGNATURE_HEADERS.keyId)?.trim() ?? '';
  const timestamp = input.headers.get(SIGNATURE_HEADERS.timestamp)?.trim() ?? '';
  const nonce = input.headers.get(SIGNATURE_HEADERS.nonce)?.trim() ?? '';
  const signature = input.headers.get(SIGNATURE_HEADERS.signature)?.trim().toLowerCase() ?? '';
  if (!keyId || !/^\d{9,11}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) {
    return { ok: false, reason: 'missing or malformed headers' };
  }
  if (keyId !== input.expectedKeyId) return { ok: false, reason: 'unknown key' };
  const nowSec = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(nowSec - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return { ok: false, reason: 'timestamp outside window' };

  const expected = computeSignature(
    input.secret,
    canonicalString({ timestamp, nonce, method: input.method, pathWithQuery: input.pathWithQuery, body: input.body }),
  );
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad signature' };
  return { ok: true };
}
