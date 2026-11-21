import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real Supabase client (@supabase/ssr + supabase-js) with its network answers faked, so these
// tests show the cookies a real sign-in and a real session refresh write.

type Options = { httpOnly?: boolean; sameSite?: unknown; secure?: boolean; path?: string; maxAge?: number };
const jar = new Map<string, string>();
const written: Array<{ name: string; value: string; options?: Options }> = [];
const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  set: (name: string, value: string, options?: Options) => {
    written.push({ name, value, options });
    jar.set(name, value);
  },
  delete: (name: string) => void jar.delete(name),
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

const SUPABASE_URL = 'https://abc.supabase.co';
const AUTH_COOKIE = 'sb-abc-auth-token';
const USER = { id: '0b6f1e2a-1111-4222-8333-444455556666', aud: 'authenticated', role: 'authenticated', email: 'owner@example.com', user_metadata: {}, app_metadata: {} };
const session = (accessToken: string, expiresAt: number) => ({
  access_token: accessToken,
  refresh_token: `refresh-${accessToken}`,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  user: USER,
});
const nowSeconds = () => Math.floor(Date.now() / 1000);

const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input instanceof Request ? input.url : input);
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.startsWith(`${SUPABASE_URL}/auth/v1/token?grant_type=password`)) return json(session('signed-in', nowSeconds() + 3600));
  if (url.startsWith(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`)) return json(session('refreshed', nowSeconds() + 3600));
  if (url.startsWith(`${SUPABASE_URL}/auth/v1/user`)) return json(USER);
  throw new Error(`unexpected fetch ${url}`);
});

beforeEach(() => {
  jar.clear();
  written.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('PYS_API_URL', 'https://pys.example');
  vi.stubEnv('SITE_URL', 'https://ess.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('Supabase session cookies', () => {
  it('sign-in writes the session in a cookie page scripts cannot read', async () => {
    const { signIn } = await import('@/app/admin/actions/auth');
    await expect(signIn({}, form({ email: 'owner@example.com', password: 'a-long-password' }))).rejects.toBeInstanceOf(Redirected);
    const session = written.filter((c) => c.name.startsWith(AUTH_COOKIE) && c.value);
    expect(session.length).toBeGreaterThan(0);
    for (const c of session) expect(c.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  });

  it('is sent only over https on the live site', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { signIn } = await import('@/app/admin/actions/auth');
    await expect(signIn({}, form({ email: 'owner@example.com', password: 'a-long-password' }))).rejects.toBeInstanceOf(Redirected);
    const session = written.filter((c) => c.name.startsWith(AUTH_COOKIE) && c.value);
    expect(session.length).toBeGreaterThan(0);
    for (const c of session) expect(c.options).toMatchObject({ httpOnly: true, secure: true });
  });

  it('the /admin proxy refreshes an old session into cookies page scripts cannot read', async () => {
    const { NextRequest } = await import('next/server');
    const { proxy } = await import('@/proxy');
    const old = encodeURIComponent(JSON.stringify(session('old', nowSeconds() - 60)));
    const res = await proxy(new NextRequest('https://ess.example/admin', { headers: { cookie: `${AUTH_COOKIE}=${old}` } }));
    expect(res.headers.get('location')).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('grant_type=refresh_token'))).toBe(true);
    const set = res.headers.getSetCookie().filter((c) => c.startsWith(AUTH_COOKIE) && !/^[^=]+=;/.test(c));
    expect(set.length).toBeGreaterThan(0);
    for (const c of set) {
      expect(c).toMatch(/HttpOnly/i);
      expect(c).toMatch(/SameSite=lax/i);
      expect(c).toMatch(/Path=\//);
    }
  });
});
