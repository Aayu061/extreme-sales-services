import { redirect } from 'next/navigation';
import { AdminAuthError, AdminForbiddenError, getMe } from '@/lib/admin/pys-admin';
import type { AdminMe } from '@/lib/admin/types';
import { AdminNav } from './admin-nav';
import { NoAccess } from './no-access';

/**
 * The signed-in part of the admin layout (rendered per request, inside <Suspense>). PYS decides
 * who may come in: an expired session goes back to sign in; an account without an ESS role sees
 * a short "no access" page with Sign out, and none of the screens.
 */
export async function AdminPanel({ children }: { children: React.ReactNode }) {
  let me: AdminMe | null = null;
  try {
    me = await getMe();
  } catch (err) {
    if (err instanceof AdminAuthError) redirect('/admin/login');
    if (!(err instanceof AdminForbiddenError)) throw err;
  }

  if (!me) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
        <NoAccess hasRole={false} />
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav me={me} />
      <main id="main" className="min-w-0 flex-1 px-4 pt-2 pb-12 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
