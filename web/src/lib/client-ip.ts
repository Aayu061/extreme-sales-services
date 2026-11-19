import 'server-only';
import { createHash } from 'node:crypto';

/**
 * A one-way fingerprint of the visitor's IP address, so PYS can slow down someone guessing
 * tracking codes or flooding the forms, without ever storing the address itself.
 */
export function hashClientIp(headers: Headers, salt: string): string | undefined {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim();
  if (!ip) return undefined;
  return createHash('sha256').update(`${ip}${salt}`).digest('hex');
}
