import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UsersScreen } from '@/components/admin/users-view';

export const metadata: Metadata = { title: 'Users' };

/**
 * /admin/users (ESS Admin only): who has ESS Admin or ESS Staff access. Who is signed in and
 * PYS's list are read per request inside <Suspense>.
 */
export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-muted">
          Loading the users…
        </p>
      }
    >
      <UsersScreen />
    </Suspense>
  );
}
