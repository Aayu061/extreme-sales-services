import { hashClientIp } from '@/lib/client-ip';
import { serverEnv } from '@/lib/env';
import { PysError, pysRequest } from '@/lib/pys/client';
import type { TrackResult } from '@/lib/pys/types';
import { normalizeIndianMobile } from '@/lib/request-schema';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ASK = 'Enter your tracking code and the 10-digit mobile number you used.';

/** Tracking: exact code + the mobile used on the request. PYS locks out repeated misses. */
export async function POST(request: Request): Promise<Response> {
  const raw = (await request.json().catch(() => null)) as { code?: unknown; phone?: unknown } | null;
  const code = typeof raw?.code === 'string' ? raw.code.trim().toUpperCase() : '';
  const phone = typeof raw?.phone === 'string' ? normalizeIndianMobile(raw.phone) : null;
  if (code.length < 6 || code.length > 20 || !phone) {
    return Response.json({ error: ASK }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await pysRequest<TrackResult>('POST', '/track', {
      body: { code, phone, clientIpHash: hashClientIp(request.headers, serverEnv().PYS_INTEGRATION_SECRET ?? '') },
      timeoutMs: 70_000,
    });
    return Response.json(result, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PysError && err.status === 404) {
      return Response.json({ error: 'No request matches this tracking code and mobile number.' }, { status: 404, headers: NO_STORE });
    }
    if (err instanceof PysError && err.status === 429) {
      return Response.json({ error: err.message }, { status: 429, headers: NO_STORE });
    }
    if (err instanceof PysError && err.status === 400) {
      return Response.json({ error: ASK }, { status: 400, headers: NO_STORE });
    }
    console.error('tracking lookup failed', err instanceof PysError ? `${err.status} ${err.code}` : err);
    return Response.json({ error: 'Could not check right now. Please try again in a minute or call us.' }, { status: 502, headers: NO_STORE });
  }
}
