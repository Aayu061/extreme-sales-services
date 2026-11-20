import { guardAdmin } from '@/lib/admin/guard';
import { AdminForbiddenError, getMe } from '@/lib/admin/pys-admin';
import type { AdminMe } from '@/lib/admin/types';
import { AdminNav } from './admin-nav';
import { NoAccess } from './no-access';

/** The person, or null for an account PYS knows but that has no ESS role. */
async function signedInPerson(): Promise<AdminMe | null> {
  try {
    return await getMe();
  } catch (err) {
    if (err instanceof AdminForbiddenError) return null;
    throw err;
  }
}

/**
 * The signed-in part of the admin layout (rendered per request, inside <Suspense>). PYS decides
 * who may come in: an expired session goes back to sign in (and then to the same page); an
 * account without an ESS role sees a short "no access" page with Sign out, and none of the
 * screens (shown here, not by redirecting to /admin/no-access, which has this same layout).
 */
export async function AdminPanel({ children }: { children: React.ReactNode }) {
  const me = await guardAdmin(signedInPerson());

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
