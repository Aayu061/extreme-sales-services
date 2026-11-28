import { createHash } from 'node:crypto';
import { accountToken } from '@/lib/account';
import { hashClientIp } from '@/lib/client-ip';
import { serverEnv } from '@/lib/env';
import { PysError, pysRequest } from '@/lib/pys/client';
import type { IntakeCreated } from '@/lib/pys/types';
import { fieldErrors, requestSchema, toPysIntake } from '@/lib/request-schema';

const NO_STORE = { 'Cache-Control': 'no-store' };
const CHECK = 'Please check the highlighted details.';

/** PYS names basket fields like "items.2.productId"; the form shows errors per line ("items.2"). */
function pysFields(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const d of details as Array<{ field?: unknown; message?: unknown }>) {
    if (typeof d?.field !== 'string' || typeof d.message !== 'string') continue;
    const m = d.field.match(/^items\.(\d+)\./);
    const key = m ? `items.${m[1]}` : d.field === 'request.message' ? 'message' : d.field;
    out[key] ??= d.message;
  }
  return out;
}

/**
 * Every form on the site (book, contact, sell) posts here. The request is checked, a hashed IP is
 * added, and it goes to the PYS approval inbox over the signed link. The form's reference is the
 * request's externalReferenceId, so PYS hands back the first request if it arrives again (no
 * duplicates). The Idempotency-Key is that reference plus a fingerprint of the exact body: PYS
 * refuses a reused key with a different body, and a retry always differs slightly (timer, IP).
 */
export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: CHECK, fields: {} }, { status: 400, headers: NO_STORE });
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: CHECK, fields: fieldErrors(parsed.error.issues) }, { status: 400, headers: NO_STORE });
  }

  const r = parsed.data;
  const body = toPysIntake(r, hashClientIp(request.headers, serverEnv().PYS_INTEGRATION_SECRET ?? ''));
  // A signed-in customer's session goes along, so PYS links the request to their record. PYS resolves it itself; an
  // ended session is simply treated as "not signed in". Nothing in the body names a customer.
  const session = await accountToken();
  try {
    const created = await pysRequest<IntakeCreated>('POST', '/intakes', {
      body,
      headers: {
        'Idempotency-Key': `${r.ref.slice(0, 150)}:${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}`,
        ...(session ? { 'X-PYS-Customer-Session': session } : {}),
      },
      timeoutMs: 70_000,
      retries: 1,
    });
    return Response.json({ intakeNumber: created.intakeNumber, trackingCode: created.trackingCode }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PysError && err.status === 409) {
      return Response.json(
        { error: 'Your request is still being sent. Please wait a few seconds and tap Send again.' },
        { status: 503, headers: NO_STORE },
      );
    }
    if (err instanceof PysError && (err.status === 400 || err.status === 422)) {
      const fields = pysFields(err.details);
      if (Object.keys(fields).length) return Response.json({ error: CHECK, fields }, { status: 422, headers: NO_STORE });
    }
    console.error('request to PYS failed', err instanceof PysError ? `${err.status} ${err.code}` : err);
    return Response.json(
      { error: 'We could not send your request right now. Please try again in a minute, or call us.' },
      { status: 502, headers: NO_STORE },
    );
  }
}
