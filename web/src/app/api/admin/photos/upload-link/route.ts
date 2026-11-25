import { connection } from 'next/server';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest } from '@/lib/admin/pys-admin';
import { getAdminSession } from '@/lib/admin/session';
import { isUploadedPhoto } from '@/lib/product-photo';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/admin/photos/upload-link { contentType, sizeBytes } → { signedUrl, publicUrl }
 * A one-time link (from PYS, which checks the person's ESS role) that the browser uploads ONE product photo to.
 * The photo goes straight to storage, never through this server (no 4.5 MB request limit, no file handling here).
 */
export async function POST(request: Request): Promise<Response> {
  await connection();
  if (!(await getAdminSession())) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401, headers: NO_STORE });
  }
  const body = (await request.json().catch(() => null)) as { contentType?: unknown; sizeBytes?: unknown } | null;
  const contentType = typeof body?.contentType === 'string' ? body.contentType.toLowerCase() : '';
  const sizeBytes = typeof body?.sizeBytes === 'number' ? body.sizeBytes : NaN;
  if (!TYPES.has(contentType)) {
    return Response.json({ error: 'Use a JPEG, PNG or WebP photo.' }, { status: 400, headers: NO_STORE });
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return Response.json({ error: 'The photo must be smaller than 5 MB.' }, { status: 400, headers: NO_STORE });
  }
  try {
    const link = await adminRequest<{ signedUrl: string; publicUrl: string }>('POST', '/product-photos/upload-link', { contentType, sizeBytes });
    if (!isUploadedPhoto(link.publicUrl) || !/^https:\/\/[a-z0-9]{20}\.supabase\.co\//.test(link.signedUrl)) {
      return Response.json({ error: 'The upload could not be prepared. Please try again.' }, { status: 502, headers: NO_STORE });
    }
    return Response.json({ signedUrl: link.signedUrl, publicUrl: link.publicUrl }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof AdminAuthError) return Response.json({ error: err.message }, { status: 401, headers: NO_STORE });
    if (err instanceof AdminForbiddenError) return Response.json({ error: err.message }, { status: 403, headers: NO_STORE });
    if (err instanceof AdminValidationError) return Response.json({ error: 'Use a JPEG, PNG or WebP photo smaller than 5 MB.' }, { status: 400, headers: NO_STORE });
    console.error('photo upload link failed', err instanceof Error ? err.name : 'error');
    return Response.json({ error: 'The upload could not be prepared. Please try again.' }, { status: 502, headers: NO_STORE });
  }
}
