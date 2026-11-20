import { connection } from 'next/server';
import { listProductPhotos } from '@/lib/admin/photos';
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
  return Response.json({ photos: await listProductPhotos() }, { headers: NO_STORE });
}
