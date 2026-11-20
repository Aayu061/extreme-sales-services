import type { EssRole } from './types';

export interface AdminNavItem {
  href: string;
  label: string;
  /** Only ESS Admin can use this screen (PYS refuses ESS Staff there anyway). */
  adminOnly: boolean;
}

/** The admin screens, in menu order. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: '/admin', label: 'Overview', adminOnly: false },
  { href: '/admin/enquiries', label: 'AC enquiries', adminOnly: false },
  { href: '/admin/requests', label: 'Requests', adminOnly: false },
  { href: '/admin/products', label: 'Products', adminOnly: false },
  { href: '/admin/content', label: 'Website text', adminOnly: false },
  { href: '/admin/display', label: 'Services shown', adminOnly: true },
  { href: '/admin/areas', label: 'Pincodes', adminOnly: true },
  { href: '/admin/users', label: 'Users', adminOnly: true },
];

export const isEssAdmin = (roles: readonly EssRole[]) => roles.includes('ESS_ADMIN');

export const roleLabel = (roles: readonly EssRole[]) => (isEssAdmin(roles) ? 'ESS Admin' : 'ESS Staff');

/** The screens this person can use. */
export function visibleNav(roles: readonly EssRole[]): AdminNavItem[] {
  const admin = isEssAdmin(roles);
  return ADMIN_NAV.filter((item) => admin || !item.adminOnly);
}
