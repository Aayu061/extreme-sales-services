// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Activity, type ReactElement } from 'react';

// ---- Fakes: PYS (adminRequest + getMe), Next's cache calls, the router, redirect() throwing like Next ----
// The real server actions run (no fake): a click on the screen goes through the action to adminRequest,
// so these tests also show what reaches PYS.

const adminRequest = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>();
const me = { current: { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'test-admin@example.com' } as unknown };
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string, body?: unknown) => adminRequest(method, path, body),
  getMe: async () => me.current,
}));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => updateTag(tag),
  revalidatePath: (p: string, type?: string) => revalidatePath(p, type),
}));
const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
const redirect = vi.fn((url: string) => {
  throw new Redirected(url);
});
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/users',
  redirect: (url: string) => redirect(url),
  notFound: () => {
    throw new Error('not found');
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-ess-admin-path': '/admin/users' }) }));

import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import { USER_MESSAGES, checkGrant } from '@/lib/admin/users';
import { grantUserRole, removeUserRole } from '@/app/admin/actions/users';
import { UsersEditor } from '@/components/admin/users-editor';
import { UsersScreen } from '@/components/admin/users-view';
import type { AdminUser } from '@/lib/admin/types';

const ADMIN = { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'test-admin@example.com' };
const STAFF = { roles: ['ESS_STAFF'], isPysAdmin: false, name: 'Test Staff', email: 'test-staff@example.com' };

const ADMIN_GRANT = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const STAFF_GRANT = '16fd2706-8baf-433b-82eb-8c7fada847da';
const NEW_GRANT = '9b2f4c1e-3d5a-4e6b-8c7d-1a2b3c4d5e6f';

const USERS: AdminUser[] = [
  { grantId: ADMIN_GRANT, role: 'ESS_ADMIN', grantedAt: '2026-11-19T00:00:00Z', profileId: 'p-admin', name: 'Test Admin', email: 'Test-Admin@example.com' },
  { grantId: STAFF_GRANT, role: 'ESS_STAFF', grantedAt: '2026-11-19T00:00:00Z', profileId: 'p-staff', name: 'Test Staff', email: 'test-staff@example.com' },
];
const NEW_USER: AdminUser = { grantId: NEW_GRANT, role: 'ESS_STAFF', grantedAt: '2026-11-21T00:00:00Z', profileId: 'p-new', name: 'Ravi', email: 'ravi@example.com' };

const ONE_TIME = 'Xy7-secret-one-time-ab12';

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleLog: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleInfo: ReturnType<typeof vi.spyOn>;
const clipboard = { writeText: vi.fn<(text: string) => Promise<void>>(async () => undefined) };

beforeEach(() => {
  adminRequest.mockReset();
  updateTag.mockClear();
  revalidatePath.mockClear();
  redirect.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
  router.push.mockClear();
  clipboard.writeText.mockClear();
  me.current = ADMIN;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Every console line written during the test, as one string. */
const consoleText = () => JSON.stringify([consoleError, consoleLog, consoleWarn, consoleInfo].flatMap((s) => s.mock.calls));

/** Nowhere the browser keeps things: URL, cookies, local and session storage. */
function expectNotStoredInBrowser(secret: string) {
  expect(window.location.href).not.toContain(secret);
  expect(document.cookie).not.toContain(secret);
  expect(JSON.stringify({ ...window.localStorage })).not.toContain(secret);
  expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(secret);
  expect(consoleText()).not.toContain(secret);
  for (const [url] of [...router.replace.mock.calls, ...router.push.mock.calls]) expect(String(url)).not.toContain(secret);
}

/* ---------------------------------------------------------------- checkGrant (mirrors PYS roleGrantSchema) */

describe('checkGrant', () => {
  it('trims and lower-cases the email like PYS, and leaves out an empty name', () => {
    expect(checkGrant({ email: '  Ravi@Example.COM ', fullName: '   ', role: 'ESS_STAFF' })).toEqual({ ok: true, input: { email: 'ravi@example.com', role: 'ESS_STAFF' } });
    expect(checkGrant({ email: 'ravi@example.com', fullName: ' Ravi K ', role: 'ESS_ADMIN' })).toEqual({
      ok: true,
      input: { email: 'ravi@example.com', fullName: 'Ravi K', role: 'ESS_ADMIN' },
    });
  });

  it('refuses a bad email, a name over 120 characters and an unknown role', () => {
    expect(checkGrant({ email: 'not-an-email', role: 'ESS_STAFF' })).toEqual({ ok: false, fields: { email: USER_MESSAGES.email } });
    expect(checkGrant({ email: `${'a'.repeat(250)}@example.com`, role: 'ESS_STAFF' })).toEqual({ ok: false, fields: { email: USER_MESSAGES.email } });
    expect(checkGrant({ email: 'ravi@example.com', fullName: 'x'.repeat(121), role: 'ESS_STAFF' })).toEqual({ ok: false, fields: { fullName: USER_MESSAGES.fullName } });
    expect(checkGrant({ email: 'ravi@example.com', role: 'PYS_ADMIN' })).toEqual({ ok: false, fields: { role: USER_MESSAGES.role } });
    expect(checkGrant(null).ok).toBe(false);
  });
});

/* ---------------------------------------------------------------- grantUserRole (server action) */

describe('grantUserRole', () => {
  const good = { email: ' Ravi@Example.com ', fullName: 'Ravi', role: 'ESS_STAFF' };

  it('ESS Staff is refused before any PYS call', async () => {
    me.current = STAFF;
    expect(await grantUserRole(good)).toEqual({ forbidden: true });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('checks the details again on the server: a bad email never reaches PYS', async () => {
    expect(await grantUserRole({ ...good, email: 'ravi@' })).toEqual({ fields: { email: USER_MESSAGES.email } });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('sends PYS the clean details and gives back the list and the one-time password, without logging, caching or redirecting', async () => {
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: ONE_TIME });
    expect(await grantUserRole(good)).toEqual({ ok: true, users: [...USERS, NEW_USER], temporaryPassword: ONE_TIME, email: 'ravi@example.com' });
    expect(adminRequest).toHaveBeenCalledWith('POST', '/users', { email: 'ravi@example.com', fullName: 'Ravi', role: 'ESS_STAFF' });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
    expect(consoleText()).not.toContain(ONE_TIME);
  });

  it('an existing account gets no password', async () => {
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: null });
    expect(await grantUserRole(good)).toEqual({ ok: true, users: [...USERS, NEW_USER], temporaryPassword: null, email: 'ravi@example.com' });
  });

  it('turns PYS refusals into plain words, logging status and code only', async () => {
    adminRequest.mockRejectedValueOnce(new PysError(409, 'CONFLICT', 'This person already has that role.'));
    expect(await grantUserRole(good)).toEqual({ error: USER_MESSAGES.already });
    adminRequest.mockRejectedValueOnce(new PysError(409, 'CONFLICT', 'An account with this email exists but has no profile. Ask PYS Admin to fix it.'));
    expect(await grantUserRole(good)).toEqual({ error: USER_MESSAGES.noProfile });
    adminRequest.mockRejectedValueOnce(new AdminValidationError({ email: 'Invalid email address' }));
    expect(await grantUserRole(good)).toEqual({ fields: { email: USER_MESSAGES.email } });
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await grantUserRole(good)).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await grantUserRole(good)).toEqual({ forbidden: true });
    adminRequest.mockRejectedValueOnce(new PysError(500, 'INTERNAL', `Failed for ravi@example.com ${ONE_TIME}`));
    expect(await grantUserRole(good)).toEqual({ error: USER_MESSAGES.unreachable });
    expect(consoleText()).not.toContain('ravi@example.com');
    expect(consoleText()).not.toContain(ONE_TIME);
  });
});

/* ---------------------------------------------------------------- removeUserRole (server action) */

describe('removeUserRole', () => {
  const deletes = () => adminRequest.mock.calls.filter(([m]) => m === 'DELETE');

  it('ESS Staff is refused before any PYS call', async () => {
    me.current = STAFF;
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ forbidden: true });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('an id that is not a PYS id never reaches PYS', async () => {
    expect(await removeUserRole('../me')).toEqual({ error: USER_MESSAGES.gone });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("refuses removing your own admin access: \"You can't remove your own admin access\", and nothing is removed", async () => {
    adminRequest.mockResolvedValueOnce({ users: USERS });
    expect(await removeUserRole(ADMIN_GRANT)).toEqual({ error: "You can't remove your own admin access", users: USERS });
    expect(deletes()).toHaveLength(0);
  });

  it("removes someone else's access and gives back the new list", async () => {
    adminRequest.mockResolvedValueOnce({ users: USERS }).mockResolvedValueOnce({ users: USERS.slice(0, 1) });
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ ok: true, users: USERS.slice(0, 1) });
    expect(deletes()).toEqual([['DELETE', `/users/${STAFF_GRANT}`, undefined]]);
  });

  it('PYS refusing a self-removal (400) gets the same words; a role already gone (404) says so', async () => {
    adminRequest.mockResolvedValueOnce({ users: USERS }).mockRejectedValueOnce(new PysError(400, 'BAD_REQUEST', 'You cannot remove your own ESS Admin role. Ask another ESS Admin.'));
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ error: USER_MESSAGES.self });
    adminRequest.mockResolvedValueOnce({ users: USERS }).mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'Role not found'));
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ error: USER_MESSAGES.gone });
    adminRequest.mockResolvedValueOnce({ users: USERS.slice(0, 1) });
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ error: USER_MESSAGES.gone, users: USERS.slice(0, 1) });
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await removeUserRole(STAFF_GRANT)).toEqual({ authError: true });
  });
});

/* ---------------------------------------------------------------- the "Users" screen */

/** Fills and sends the "Give access" form. */
function grant(email: string, role: 'ESS Admin' | 'ESS Staff' = 'ESS Staff') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${role}`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Give access' }));
}

describe('UsersEditor', () => {
  it('lists each person with their role; your own admin row has no Remove button', () => {
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    const list = screen.getByRole('list', { name: 'People with access' });
    expect(within(list).getByText('Test Staff')).toBeTruthy();
    expect(within(list).getByText('test-staff@example.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove Test Admin/ })).toBeNull();
    expect(within(list).getByText('(you)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove ESS Staff access for Test Staff' })).toBeTruthy();
  });

  it('says PYS Admins are managed in PYS', () => {
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    expect(screen.getByText('PYS Admins always have ESS Admin access — manage them in PYS.')).toBeTruthy();
  });

  it('a new email shows the one-time password once, with Copy and the note, and it is never stored in the page or URL', async () => {
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: ONE_TIME });
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    grant('Ravi@example.com');
    await waitFor(() => expect(adminRequest).toHaveBeenCalledWith('POST', '/users', { email: 'ravi@example.com', role: 'ESS_STAFF' }));
    expect(await screen.findByText(ONE_TIME)).toBeTruthy();
    expect(screen.getAllByText(ONE_TIME)).toHaveLength(1);
    expect(screen.getByText('Share it privately; they must change it at first sign-in')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'People with access' })).getByText('ravi@example.com')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith(ONE_TIME));
    expect(await screen.findByText(USER_MESSAGES.copied)).toBeTruthy();

    // Not in any input's value, data attribute, or the URL, cookies or storage.
    for (const el of document.querySelectorAll('input, textarea')) expect((el as HTMLInputElement).value).not.toContain(ONE_TIME);
    expect(document.body.innerHTML.split(ONE_TIME)).toHaveLength(2);
    expectNotStoredInBrowser(ONE_TIME);

    fireEvent.click(screen.getByRole('button', { name: 'Hide it' }));
    expect(screen.queryByText(ONE_TIME)).toBeNull();
    expect(document.body.innerHTML).not.toContain(ONE_TIME);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('the password is cleared as soon as another grant is sent', async () => {
    let resolve!: (v: unknown) => void;
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: ONE_TIME }).mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    grant('ravi@example.com');
    expect(await screen.findByText(ONE_TIME)).toBeTruthy();
    // The button is back once the first answer is in (it cannot be pressed while one is on its way).
    await screen.findByRole('button', { name: 'Give access' });
    grant('meena@example.com', 'ESS Admin');
    await waitFor(() => expect(adminRequest).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(ONE_TIME)).toBeNull();
    await act(async () => resolve({ users: [...USERS, NEW_USER], temporaryPassword: null }));
    expect(await screen.findByText(USER_MESSAGES.granted)).toBeTruthy();
    expect(document.body.innerHTML).not.toContain(ONE_TIME);
  });

  it('leaving the page clears the password: Next keeps the page in a hidden <Activity>, and Back must not show it again', async () => {
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: ONE_TIME });
    const page = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <UsersEditor users={USERS} myEmail="test-admin@example.com" />
      </Activity>
    );
    const { rerender } = render(page('visible'));
    grant('ravi@example.com');
    expect(await screen.findByText(ONE_TIME)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText(USER_MESSAGES.copied)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove ESS Staff access for Test Staff' }));
    expect(screen.getByRole('button', { name: 'Yes, remove' })).toBeTruthy();

    // Another admin page is opened (this one is hidden, not unmounted)…
    await act(async () => rerender(page('hidden')));
    // …and Back shows it again: no password, no copy note, no open "Remove?" question.
    await act(async () => rerender(page('visible')));
    expect(screen.queryByText(ONE_TIME)).toBeNull();
    expect(document.body.innerHTML).not.toContain(ONE_TIME);
    expect(screen.queryByText(USER_MESSAGES.copied)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Yes, remove' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove ESS Staff access for Test Staff' })).toBeTruthy();
  });

  it('an existing account gets access with no password shown', async () => {
    adminRequest.mockResolvedValueOnce({ users: [...USERS, NEW_USER], temporaryPassword: null });
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    grant('ravi@example.com');
    expect(await screen.findByText(USER_MESSAGES.granted)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('a bad email is caught in the browser and nothing is sent', () => {
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    grant('ravi@');
    expect(screen.getByText(USER_MESSAGES.email)).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('Remove asks first; "Keep it" sends nothing, "Yes, remove" removes the access', async () => {
    adminRequest.mockResolvedValueOnce({ users: USERS }).mockResolvedValueOnce({ users: USERS.slice(0, 1) });
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove ESS Staff access for Test Staff' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(adminRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove ESS Staff access for Test Staff' }));
    expect(screen.getByText(/Remove ESS Staff access for Test Staff \(test-staff@example.com\)\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(adminRequest).toHaveBeenCalledWith('DELETE', `/users/${STAFF_GRANT}`, undefined));
    expect(await screen.findByText('Test Staff no longer has ESS Staff access.')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'People with access' })).queryByText('test-staff@example.com')).toBeNull();
  });

  it('a session that ended mid-use goes back to sign in', async () => {
    adminRequest.mockRejectedValue(new AdminAuthError());
    render(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    grant('ravi@example.com');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/login\?expired=1/)));
    expect(router.replace.mock.calls[0][0]).not.toContain('ravi');
  });

  it('before the page is ready the form cannot send the email anywhere (no GET, no address in the URL)', () => {
    const html = renderToString(<UsersEditor users={USERS} myEmail="test-admin@example.com" />);
    const form = html.match(/<form[^>]*>/)?.[0] ?? '';
    expect(form).not.toMatch(/method="get"/i);
    expect(form).toMatch(/action="javascript:/);
  });
});

describe('UsersScreen', () => {
  it('ESS Staff sees the no-access page and no PYS users are read', async () => {
    me.current = STAFF;
    render((await UsersScreen()) as ReactElement);
    expect(screen.getByRole('heading', { name: "You don't have access to this" })).toBeTruthy();
    expect(screen.getByText(/Only an ESS Admin can do this/)).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('ESS Admin gets the people from PYS', async () => {
    adminRequest.mockResolvedValueOnce({ users: USERS });
    render((await UsersScreen()) as ReactElement);
    expect(adminRequest).toHaveBeenCalledWith('GET', '/users', undefined);
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeTruthy();
    expect(screen.getByText('Test Staff')).toBeTruthy();
  });
});
