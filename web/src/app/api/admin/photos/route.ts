import { connection } from 'next/server';
import { listProductPhotos } from '@/lib/admin/photos';
import { adminRequest } from '@/lib/admin/pys-admin';
import { isUploadedPhoto } from '@/lib/product-photo';
import { getAdminSession } from '@/lib/admin/session';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * GET /api/admin/photos → { photos: ["voltas-185v.jpg", …] }: the product photos the admin photo
 * picker can offer. This address is outside /admin, so the proxy's sign-in gate does not cover
 * it: it checks the admin session itself (401 without one). It takes nothing from the request (the
 * folder is fixed), and the answer is never cached.
 */
export async function GET(): Promise<Response> {
  await connection();
  if (!(await getAdminSession())) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401, headers: NO_STORE });
  }
  const [photos, uploaded] = await Promise.all([listProductPhotos(), listUploadedPhotos()]);
  return Response.json({ photos, uploaded }, { headers: NO_STORE });
}

/** Photos uploaded from the admin (PYS storage), newest first. If PYS cannot be reached the site photos still show. */
async function listUploadedPhotos(): Promise<string[]> {
  try {
    const res = await adminRequest<{ photos?: Array<{ publicUrl?: unknown }> }>('GET', '/product-photos');
    return (res.photos ?? []).map((p) => p.publicUrl).filter(isUploadedPhoto);
  } catch {
    return [];
  }
}
