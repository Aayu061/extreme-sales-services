import type { Metadata } from 'next';
import { NoAccess } from '@/components/admin/no-access';

export const metadata: Metadata = { title: "You don't have access to this" };

/**
 * For a signed-in person who opened a screen meant for ESS Admin. (Someone with no ESS role at
 * all never gets this far: the panel layout shows them the no-access card with Sign out instead.)
 */
export default function AdminNoAccessPage() {
  return <NoAccess hasRole />;
}
