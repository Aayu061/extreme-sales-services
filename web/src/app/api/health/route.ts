/**
 * GET /api/health → 200 { ok: true }: the site's own server is up (used by the uptime check in the PYS
 * keepalive workflow). It calls nothing else and returns nothing secret; never cached.
 */
export function GET(): Response {
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
