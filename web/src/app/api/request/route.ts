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
    out[m ? `items.${m[1]}` : d.field] ??= d.message;
  }
  return out;
}

/**
 * Every form on the site (book, contact, sell) posts here. The request is checked, a hashed IP is
 * added, and it goes to the PYS approval inbox over the signed link. The form's reference doubles
 * as the idempotency key, so a retry after a timeout never creates a second request.
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
  try {
    const created = await pysRequest<IntakeCreated>('POST', '/intakes', {
      body,
      headers: { 'Idempotency-Key': r.ref },
      timeoutMs: 70_000,
      retries: 1,
    });
    return Response.json({ intakeNumber: created.intakeNumber, trackingCode: created.trackingCode }, { headers: NO_STORE });
  } catch (err) {
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
