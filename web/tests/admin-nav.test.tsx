// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';

const getMe = vi.fn();
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  getMe: () => getMe(),
}));
vi.mock('@/app/admin/actions/auth', () => ({ signOut: vi.fn() }));

class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
let pathname = '/admin/enquiries';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

import { ADMIN_NAV, visibleNav } from '@/lib/admin/nav';
import { AdminAuthError, AdminForbiddenError } from '@/lib/admin/pys-admin';
import { AdminPanel } from '@/components/admin/admin-panel';

const ADMIN = { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Asha Patel', email: 'asha@ess.example' };
const STAFF = { roles: ['ESS_STAFF'], isPysAdmin: false, name: null, email: 'ravi@ess.example' };

/** The panel layout's signed-in part, resolved like the server does, then rendered in jsdom. */
async function renderPanel() {
  const el = (await AdminPanel({ children: <p>Page body</p> })) as ReactElement;
  return render(el);
}

beforeEach(() => {
  getMe.mockReset();
  pathname = '/admin/enquiries';
});
afterEach(() => {
  cleanup();
});

describe('ADMIN_NAV / visibleNav', () => {
  it('lists the screens in order, three of them for ESS Admin only', () => {
    expect(ADMIN_NAV.map((i) => i.label)).toEqual([
      'Overview',
      'AC enquiries',
      'Requests',
      'Products',
      'Website text',
      'Services shown',
      'Pincodes',
      'Users',
    ]);
    expect(ADMIN_NAV.filter((i) => i.adminOnly).map((i) => i.label)).toEqual(['Services shown', 'Pincodes', 'Users']);
    expect(ADMIN_NAV.every((i) => i.href === '/admin' || i.href.startsWith('/admin/'))).toBe(true);
  });

  it('hides the admin-only screens from ESS Staff', () => {
    expect(visibleNav(['ESS_STAFF']).map((i) => i.label)).toEqual(['Overview', 'AC enquiries', 'Requests', 'Products', 'Website text']);
  });

  it('shows everything to an ESS Admin', () => {
    expect(visibleNav(['ESS_ADMIN'])).toEqual(ADMIN_NAV);
    expect(visibleNav(['ESS_ADMIN', 'ESS_STAFF'])).toEqual(ADMIN_NAV);
  });
});

describe('admin panel layout', () => {
  it("shows the nav, the person's name and role, Sign out and the page, without the public header or footer", async () => {
    getMe.mockResolvedValue(ADMIN);
    await renderPanel();

    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(ADMIN_NAV.map((i) => i.label));
    expect(within(nav).getByRole('link', { name: 'AC enquiries' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('Asha Patel')).toBeTruthy();
    expect(screen.getByText('ESS Admin')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' }).closest('form')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain('Page body');

    // None of the public site's frame: menu, Book button, footer, floating Call / WhatsApp.
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Book a service/ })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.queryByText(/GSTIN/)).toBeNull();
    expect(screen.queryByRole('link', { name: /WhatsApp|Call/ })).toBeNull();
  });

  it('shows ESS Staff only their screens, and the email when there is no name', async () => {
    getMe.mockResolvedValue(STAFF);
    await renderPanel();
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).queryByRole('link', { name: 'Users' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Pincodes' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Services shown' })).toBeNull();
    expect(screen.getByText('ravi@ess.example')).toBeTruthy();
    expect(screen.getByText('ESS Staff')).toBeTruthy();
  });

  it('marks Overview as the current page only on /admin itself', async () => {
    pathname = '/admin';
    getMe.mockResolvedValue(ADMIN);
    await renderPanel();
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
  });

  it('opens and closes the menu with the menu button on phones', async () => {
    getMe.mockResolvedValue(ADMIN);
    await renderPanel();
    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(screen.getByRole('navigation', { name: 'Admin' }).id);
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('shows a friendly no-access page with Sign out, and no nav or page, when the account has no ESS role', async () => {
    getMe.mockRejectedValue(new AdminForbiddenError());
    await renderPanel();
    expect(screen.getByRole('heading', { name: "You don't have access to this" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Admin' })).toBeNull();
    expect(screen.queryByText('Page body')).toBeNull();
  });

  it('sends the person to sign in again when PYS says the session has expired', async () => {
    getMe.mockRejectedValue(new AdminAuthError());
    await expect(AdminPanel({ children: <p>Page body</p> })).rejects.toMatchObject({ url: '/admin/login' });
  });
});
