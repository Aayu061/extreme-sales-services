import { loadAdmin } from '@/lib/admin/guard';
import { isEssAdmin } from '@/lib/admin/nav';
import { adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminUser } from '@/lib/admin/types';
import { NoAccess } from './no-access';
import { PysUnreachable } from './pys-link';
import { UsersEditor } from './users-editor';

const PAGE = '/admin/users';

/**
 * /admin/users (rendered per request, inside <Suspense>). ESS Admin only: the role is checked
 * before anything else is read, so ESS Staff gets the no-access card and no PYS data. The page
 * never holds a one-time password: that only comes back to the editor from its server action.
 */
export async function UsersScreen() {
  const me = await loadAdmin(getMe(), PAGE);
  if (!me.ok) return <PysUnreachable retryHref={PAGE} />;
  if (!isEssAdmin(me.data.roles)) {
    return <NoAccess hasRole reason="Only an ESS Admin can do this. Ask an ESS Admin to give or remove access to the admin area." />;
  }

  const result = await loadAdmin(adminRequest<{ users: AdminUser[] }>('GET', '/users'), PAGE);
  if (!result.ok) return <PysUnreachable retryHref={PAGE} />;

  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Users</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Who can use this admin area. ESS Staff can see everything, send AC prices, edit products and save drafts of website text. ESS Admin can also publish, change services
        shown and pincodes, and manage users.
      </p>
      <div className="mt-6 max-w-3xl">
        <UsersEditor users={result.data.users} myEmail={me.data.email} />
      </div>
    </>
  );
}
