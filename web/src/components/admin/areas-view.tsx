import { loadAdmin } from '@/lib/admin/guard';
import { isEssAdmin } from '@/lib/admin/nav';
import { adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminServiceArea } from '@/lib/admin/types';
import { AreasEditor } from './areas-editor';
import { NoAccess } from './no-access';
import { PysUnreachable } from './pys-link';

const PAGE = '/admin/areas';

/**
 * /admin/areas (rendered per request, inside <Suspense>). ESS Admin only: the role is checked
 * before anything else is read, so ESS Staff gets the no-access card and no PYS data.
 */
export async function AreasScreen() {
  const me = await loadAdmin(getMe(), PAGE);
  if (!me.ok) return <PysUnreachable retryHref={PAGE} />;
  if (!isEssAdmin(me.data.roles)) {
    return <NoAccess hasRole reason="Only an ESS Admin can do this. Ask an ESS Admin to change the pincodes the website covers." />;
  }

  const result = await loadAdmin(adminRequest<{ areas: AdminServiceArea[] }>('GET', '/service-areas'), PAGE);
  if (!result.ok) return <PysUnreachable retryHref={PAGE} />;

  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Pincodes</h1>
      <p className="mt-2 max-w-3xl text-muted">
        The pincodes ESS covers. The website&apos;s pincode check and the contact page use this list as soon as it is saved.
      </p>
      <div className="mt-6 max-w-3xl">
        <AreasEditor areas={result.data.areas} />
      </div>
    </>
  );
}
