import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminGate, safeAdminNext } from '@/lib/admin/gate';
import { devLoginAllowed } from '@/lib/admin/dev-login';

// ---- Fakes for the server modules (cookies, Supabase, redirect) ----

const jar = new Map<string, string>();
const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  set: vi.fn((name: string, value: string) => void jar.set(name, value)),
  delete: vi.fn((name: string) => void jar.delete(name)),
};
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

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

type FakeUser = { email: string; user_metadata: Record<string, unknown> } | null;
const auth = {
  getUser: vi.fn(async (): Promise<{ data: { user: FakeUser }; error: unknown }> => ({ data: { user: null }, error: null })),
  getSession: vi.fn(async () => ({ data: { session: null as { access_token: string } | null } })),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
  updateUser: vi.fn(async () => ({ data: {}, error: null as unknown })),
  signOut: vi.fn(async () => ({ error: null })),
  exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: null as unknown })),
};
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth })) }));

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

function setEnv(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, '');
    else vi.stubEnv(k, v);
  }
}

const SUPABASE = { NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' };

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  vi.resetModules();
  setEnv({ NODE_ENV: 'development', PYS_API_URL: 'http://localhost:4010', SITE_URL: 'https://ess.example', ...SUPABASE });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// ---- Pure rules ----

describe('adminGate', () => {
  it('leaves the sign-in and reset pages open', () => {
    expect(adminGate('/admin/login', false)).toBeNull();
    expect(adminGate('/admin/reset', false)).toBeNull();
    expect(adminGate('/admin/login', true, true)).toBeNull();
  });

  it('sends a signed-out person to sign in, remembering where they were going', () => {
    expect(adminGate('/admin', false)).toEqual({ redirect: '/admin/login?next=%2Fadmin' });
    expect(adminGate('/admin/enquiries', false)).toEqual({ redirect: '/admin/login?next=%2Fadmin%2Fenquiries' });
    expect(adminGate('/admin/change-password', false)).toEqual({ redirect: '/admin/login?next=%2Fadmin%2Fchange-password' });
  });

  it('lets a signed-in person through', () => {
    expect(adminGate('/admin', true)).toBeNull();
    expect(adminGate('/admin/enquiries', true, false)).toBeNull();
  });

  it('keeps someone who must change their password on that page', () => {
    expect(adminGate('/admin/enquiries', true, true)).toEqual({ redirect: '/admin/change-password' });
    expect(adminGate('/admin/change-password', true, true)).toBeNull();
  });

  it('ignores addresses outside /admin', () => {
    expect(adminGate('/administrator', false)).toBeNull();
    expect(adminGate('/shop', false)).toBeNull();
  });
});

describe('safeAdminNext', () => {
  it('keeps an /admin address', () => {
    expect(safeAdminNext('/admin')).toBe('/admin');
    expect(safeAdminNext('/admin/enquiries')).toBe('/admin/enquiries');
  });

  it('drops anything else, so sign-in can never send someone to another site', () => {
    for (const bad of ['https://evil.example/admin', '//evil.example/admin', '/\\evil.example', '/shop', '/administrator', '/admin/login', '', null, undefined, 42]) {
      expect(safeAdminNext(bad)).toBeNull();
    }
  });
});

describe('devLoginAllowed', () => {
  it('is on only on a PC that talks to the mock PYS', () => {
    expect(devLoginAllowed({ NODE_ENV: 'development', PYS_API_URL: 'http://localhost:4010' })).toBe(true);
    expect(devLoginAllowed({ NODE_ENV: undefined, PYS_API_URL: 'http://127.0.0.1:4010' })).toBe(true);
  });

  it('is never on in production', () => {
    expect(devLoginAllowed({ NODE_ENV: 'production', PYS_API_URL: 'http://localhost:4010' })).toBe(false);
  });

  it('is never on against a real PYS', () => {
    expect(devLoginAllowed({ NODE_ENV: 'development', PYS_API_URL: 'https://place-your-service-api.onrender.com' })).toBe(false);
    expect(devLoginAllowed({ NODE_ENV: 'development', PYS_API_URL: 'http://localhost.evil.example' })).toBe(false);
    expect(devLoginAllowed({ NODE_ENV: 'development', PYS_API_URL: 'not a url' })).toBe(false);
  });
});

// ---- Session ----

describe('getAdminSession', () => {
  it('uses the checked Supabase user and the session token', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { email: 'staff@ess.example', user_metadata: { must_change_password: true } } }, error: null });
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-1' } } });
    const { getAdminSession } = await import('@/lib/admin/session');
    expect(await getAdminSession()).toEqual({ accessToken: 'jwt-1', email: 'staff@ess.example', mustChangePassword: true });
  });

  it('is empty when Supabase cannot confirm the user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad jwt') });
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'stale' } } });
    const { getAdminSession } = await import('@/lib/admin/session');
    expect(await getAdminSession()).toBeNull();
  });

  it('reads the test-admin cookie on a PC with the mock PYS', async () => {
    jar.set('ess-admin-dev', 'dev-staff-token');
    const { getAdminSession } = await import('@/lib/admin/session');
    expect(await getAdminSession()).toEqual({ accessToken: 'dev-staff-token', email: null, mustChangePassword: false });
  });

  it('ignores the test-admin cookie in production', async () => {
    setEnv({ NODE_ENV: 'production' });
    jar.set('ess-admin-dev', 'dev-admin-token');
    const { getAdminSession } = await import('@/lib/admin/session');
    expect(await getAdminSession()).toBeNull();
  });

  it('is empty when sign-in is not set up', async () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined });
    const { getAdminSession } = await import('@/lib/admin/session');
    expect(await getAdminSession()).toBeNull();
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});

// ---- Proxy ----

describe('proxy for /admin', () => {
  const call = async (path: string, cookie?: string) => {
    const { NextRequest } = await import('next/server');
    const { proxy } = await import('@/proxy');
    return proxy(new NextRequest(`https://ess.example${path}`, { headers: cookie ? { cookie } : {} }));
  };

  it('sends a signed-out visitor to sign in, never cached', async () => {
    const res = await call('/admin/enquiries');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ess.example/admin/login?next=%2Fadmin%2Fenquiries');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('opens the sign-in page without a session, never cached', async () => {
    const res = await call('/admin/login');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps a first sign-in on the new-password page', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { email: 'new@ess.example', user_metadata: { must_change_password: true } } }, error: null });
    expect((await call('/admin/products')).headers.get('location')).toBe('https://ess.example/admin/change-password');
    expect((await call('/admin/change-password')).headers.get('location')).toBeNull();
  });

  it('lets the test admin in only on a PC with the mock PYS', async () => {
    expect((await call('/admin', 'ess-admin-dev=dev-admin-token')).headers.get('location')).toBeNull();
    vi.resetModules();
    setEnv({ NODE_ENV: 'production' });
    expect((await call('/admin', 'ess-admin-dev=dev-admin-token')).headers.get('location')).toBe('https://ess.example/admin/login?next=%2Fadmin');
  });

  it('turns the emailed reset link into a session and opens the new-password page', async () => {
    expect((await call('/admin/reset?code=abc123')).headers.get('location')).toBe('https://ess.example/admin/change-password');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: new Error('expired') });
    expect((await call('/admin/reset?code=old')).headers.get('location')).toBe('https://ess.example/admin/reset?link=expired');
  });
});

// ---- Server actions ----

describe('signIn', () => {
  it('never says whether the email exists', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials' } });
    const { signIn } = await import('@/app/admin/actions/auth');
    expect(await signIn({}, form({ email: 'who@ess.example', password: 'wrong-one' }))).toEqual({ error: 'Email or password is wrong.' });
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { status: 400, code: 'email_not_confirmed' } });
    expect(await signIn({}, form({ email: 'who@ess.example', password: 'wrong-one' }))).toEqual({ error: 'Email or password is wrong.' });
  });

  it('opens the page they were going to, or the overview', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { user_metadata: {} }, session: {} }, error: null });
    const { signIn } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(signIn({}, form({ email: 'a@ess.example', password: 'right-password', next: '/admin/enquiries' })))).toBe('/admin/enquiries');
    expect(await redirectOf(signIn({}, form({ email: 'a@ess.example', password: 'right-password', next: 'https://evil.example' })))).toBe('/admin');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@ess.example', password: 'right-password' });
  });

  it('sends a first sign-in to choose a new password', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { user_metadata: { must_change_password: true } }, session: {} }, error: null });
    const { signIn } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(signIn({}, form({ email: 'new@ess.example', password: 'temporary-1', next: '/admin/products' })))).toBe('/admin/change-password');
  });

  it('asks for both fields before calling Supabase', async () => {
    const { signIn } = await import('@/app/admin/actions/auth');
    expect((await signIn({}, form({ email: '', password: '' }))).error).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('explains when sign-in is not set up', async () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined });
    const { signIn } = await import('@/app/admin/actions/auth');
    expect((await signIn({}, form({ email: 'a@ess.example', password: 'right-password' }))).error).toMatch(/isn't set up yet/);
  });
});

describe('devSignIn', () => {
  it('stores the test token in a cookie the browser cannot read', async () => {
    const { devSignIn } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(devSignIn(form({ role: 'staff' })))).toBe('/admin');
    expect(cookieStore.set).toHaveBeenCalledWith('ess-admin-dev', 'dev-staff-token', expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }));
  });

  it('does nothing in production', async () => {
    setEnv({ NODE_ENV: 'production' });
    const { devSignIn } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(devSignIn(form({ role: 'admin' })))).toBe('/admin/login');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('ends the Supabase session and the test session', async () => {
    jar.set('ess-admin-dev', 'dev-admin-token');
    const { signOut } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(signOut())).toBe('/admin/login');
    expect(auth.signOut).toHaveBeenCalled();
    expect(jar.has('ess-admin-dev')).toBe(false);
  });
});

describe('sendReset', () => {
  it('gives the same answer whether or not the email has an account, with a link back to this site', async () => {
    const { sendReset } = await import('@/app/admin/actions/auth');
    expect(await sendReset({}, form({ email: 'who@ess.example' }))).toEqual({ message: 'If this email has an account, we sent a link.' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('who@ess.example', { redirectTo: 'https://ess.example/admin/reset' });
    auth.resetPasswordForEmail.mockRejectedValueOnce(new Error('network'));
    expect(await sendReset({}, form({ email: 'nobody@ess.example' }))).toEqual({ message: 'If this email has an account, we sent a link.' });
  });

  it('asks for an email first', async () => {
    const { sendReset } = await import('@/app/admin/actions/auth');
    expect((await sendReset({}, form({ email: '' }))).error).toBeTruthy();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('setNewPassword', () => {
  beforeEach(() => {
    auth.getUser.mockResolvedValue({ data: { user: { email: 'a@ess.example', user_metadata: { must_change_password: true } } }, error: null });
  });

  it('needs at least 10 characters, typed the same twice', async () => {
    const { setNewPassword } = await import('@/app/admin/actions/auth');
    expect((await setNewPassword({}, form({}))).error).toMatch(/10 characters/);
    expect((await setNewPassword({}, form({ password: 'short', confirm: 'short' }))).error).toMatch(/10 characters/);
    expect((await setNewPassword({}, form({ password: 'long-enough-1', confirm: 'long-enough-2' }))).error).toMatch(/do not match/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('saves the password, clears the first-sign-in flag and opens the overview', async () => {
    const { setNewPassword } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(setNewPassword({}, form({ password: 'long-enough-1', confirm: 'long-enough-1' })))).toBe('/admin');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'long-enough-1', data: { must_change_password: false } });
  });

  it('sends a signed-out person to sign in', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { setNewPassword } = await import('@/app/admin/actions/auth');
    expect(await redirectOf(setNewPassword({}, form({ password: 'long-enough-1', confirm: 'long-enough-1' })))).toBe('/admin/login?next=%2Fadmin%2Fchange-password');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
