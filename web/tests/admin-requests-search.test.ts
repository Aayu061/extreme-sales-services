import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: the cookie jar, redirect() throwing like Next, the admin session ----

type CookieOptions = Record<string, unknown>;
const jar = new Map<string, { value: string; options: CookieOptions }>();
const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
  set: vi.fn((name: string, value: string, options: CookieOptions) => void jar.set(name, { value, options })),
  delete: vi.fn((opts: string | { name: string; path?: string }) => void jar.delete(typeof opts === 'string' ? opts : opts.name)),
};
vi.mock('next/headers', () => ({ cookies: async () => cookieStore, headers: async () => new Headers() }));

class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
}));

let session: { accessToken: string } | null = { accessToken: 'dev-admin-token' };
vi.mock('@/lib/admin/session', () => ({ getAdminSession: async () => session }));

import { clearRequestsFilters, searchRequests } from '@/app/admin/actions/requests';

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
async function redirectOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof Redirected) return e.url;
    throw e;
  }
  throw new Error('expected a redirect');
}

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
  session = { accessToken: 'dev-admin-token' };
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('searchRequests (the Requests filter form)', () => {
  it('keeps the search in a short-lived cookie and opens the list without it in the address', async () => {
    const to = await redirectOf(searchRequests(form({ status: 'APPROVED', kind: '', search: '  9820012345  ' })));
    expect(to).toBe('/admin/requests?status=APPROVED');
    expect(to).not.toContain('9820012345');
    expect(cookieStore.set).toHaveBeenCalledWith('ess-admin-search', '9820012345', {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/admin/requests',
      maxAge: 30 * 60,
    });
  });

  it('marks the cookie secure on the live site', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await redirectOf(searchRequests(form({ search: 'priya@example.com' })));
    expect(cookieStore.set.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it('keeps at most 100 characters (the PYS limit)', async () => {
    await redirectOf(searchRequests(form({ search: 'x'.repeat(150) })));
    expect(jar.get('ess-admin-search')!.value).toHaveLength(100);
  });

  it('forgets the search when the box is emptied', async () => {
    jar.set('ess-admin-search', { value: 'old', options: {} });
    expect(await redirectOf(searchRequests(form({ status: '', kind: 'CONTACT', search: '   ' })))).toBe('/admin/requests?kind=CONTACT');
    expect(cookieStore.delete).toHaveBeenCalledWith({ name: 'ess-admin-search', path: '/admin/requests' });
    expect(jar.has('ess-admin-search')).toBe(false);
  });

  it('drops filter values PYS does not know', async () => {
    expect(await redirectOf(searchRequests(form({ status: 'NOPE', kind: 'BASKET; DROP', search: '' })))).toBe('/admin/requests');
  });

  it('sends a signed-out person to sign in again (R7), saving nothing', async () => {
    session = null;
    expect(await redirectOf(searchRequests(form({ search: '9820012345', kind: 'BASKET' })))).toBe(
      '/admin/login?expired=1&next=%2Fadmin%2Frequests',
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe('clearRequestsFilters', () => {
  it('forgets the search and opens the unfiltered list', async () => {
    jar.set('ess-admin-search', { value: 'Rahul', options: {} });
    expect(await redirectOf(clearRequestsFilters())).toBe('/admin/requests');
    expect(cookieStore.delete).toHaveBeenCalledWith({ name: 'ess-admin-search', path: '/admin/requests' });
    expect(jar.has('ess-admin-search')).toBe(false);
  });

  it('sends a signed-out person to sign in again', async () => {
    session = null;
    expect(await redirectOf(clearRequestsFilters())).toBe('/admin/login?expired=1&next=%2Fadmin%2Frequests');
  });
});
