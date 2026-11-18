import { revalidateTag } from 'next/cache';
import { pysLinkConfigured, serverEnv } from '@/lib/env';
import { verifySignedRequest } from '@/lib/pys/signature';
import { CACHE_TAGS, type CacheTag } from '@/lib/data';

/**
 * PYS calls this when the catalog, products, website content or service areas change
 * (ESS_REVALIDATE outbox events). PYS signs the call with this site's own ESS key, so only PYS
 * can trigger it. Set ESS_REVALIDATE_URL=https://<this site>/api/revalidate on the PYS server.
 */
export async function POST(request: Request): Promise<Response> {
  const env = serverEnv();
  if (!pysLinkConfigured(env)) return Response.json({ ok: false, error: 'not configured' }, { status: 503 });

  const body = await request.text();
  if (body.length > 2_000) return Response.json({ ok: false, error: 'too large' }, { status: 413 });

  const url = new URL(request.url);
  const verdict = verifySignedRequest({
    headers: request.headers,
    method: 'POST',
    pathWithQuery: `${url.pathname}${url.search}`,
    body,
    expectedKeyId: env.PYS_INTEGRATION_KEY_ID!,
    secret: env.PYS_INTEGRATION_SECRET!,
  });
  if (!verdict.ok) return Response.json({ ok: false, error: 'unauthorised' }, { status: 401 });

  let topic: unknown;
  try {
    topic = (JSON.parse(body) as { topic?: unknown }).topic;
  } catch {
    return Response.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  if (typeof topic !== 'string' || !(CACHE_TAGS as readonly string[]).includes(topic)) {
    return Response.json({ ok: false, error: 'unknown topic' }, { status: 400 });
  }

  // Stale-while-revalidate: visitors keep seeing the last good page while fresh data loads.
  revalidateTag(topic as CacheTag, 'max');
  return Response.json({ ok: true, topic });
}
