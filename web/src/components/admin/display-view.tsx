import { loadAdmin } from '@/lib/admin/guard';
import { isEssAdmin } from '@/lib/admin/nav';
import { adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminCatalogDisplay } from '@/lib/admin/types';
import { DisplayEditor } from './display-editor';
import { NoAccess } from './no-access';
import { PysUnreachable } from './pys-link';

const PAGE = '/admin/display';

/**
 * /admin/display (rendered per request, inside <Suspense>). ESS Admin only: the role is checked
 * before anything else is read, so ESS Staff gets the no-access card and no PYS data.
 */
export async function DisplayScreen() {
  const me = await loadAdmin(getMe(), PAGE);
  if (!me.ok) return <PysUnreachable retryHref={PAGE} />;
  if (!isEssAdmin(me.data.roles)) {
    return <NoAccess hasRole reason="Only an ESS Admin can do this. Ask an ESS Admin to change which services the website shows." />;
  }

  const result = await loadAdmin(adminRequest<AdminCatalogDisplay>('GET', '/catalog-display'), PAGE);
  if (!result.ok) return <PysUnreachable retryHref={PAGE} />;

  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Services shown</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Choose which services and AMC plans the website lists, and in what order. Hidden ones stay in PYS and can be shown again at any time.
      </p>
      <div className="mt-6">
        <DisplayEditor display={result.data} />
      </div>
    </>
  );
}
