import { pysRequest } from '@/lib/pys/client';
import type { Serviceability } from '@/lib/pys/types';

/**
 * "Do you cover my pincode?" for the home page's contact section. The browser calls this site;
 * this site asks PYS over the signed link (the PYS key never reaches the browser).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ pincode: string }> }): Promise<Response> {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) return Response.json({ error: 'Enter a 6-digit pincode.' }, { status: 400 });
  try {
    const result = await pysRequest<Serviceability>('GET', `/serviceability/${pincode}`);
    return Response.json(result, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (err) {
    // PYS asleep, unreachable or refusing: the visitor is pointed to the phone, never left hanging.
    console.error('serviceability check failed', err);
    return Response.json({ error: 'Could not check right now. Please call us.' }, { status: 502 });
  }
}
