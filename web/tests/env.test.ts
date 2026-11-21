import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The owner types the Supabase values into Vercel by hand: a typo there must only switch off the
// admin sign-in ("not set up yet"), never break the public pages that read serverEnv().

const load = async () => import('@/lib/env');

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PYS_API_URL', 'https://pys.example');
  vi.stubEnv('SITE_URL', 'https://ess.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co/');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});
afterEach(() => vi.unstubAllEnvs());

describe('serverEnv and the Supabase settings', () => {
  it('reads a good Supabase address and key (without the trailing slash)', async () => {
    const { serverEnv, supabaseConfig } = await load();
    expect(serverEnv().NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(supabaseConfig()).toEqual({ url: 'https://abc.supabase.co', anonKey: 'anon-key' });
  });

  it('a mistyped Supabase address only turns the admin sign-in off', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'abc.supabase.co');
    const { serverEnv, supabaseConfig } = await load();
    const env = serverEnv();
    expect(env.PYS_API_URL).toBe('https://pys.example');
    expect(env.SITE_URL).toBe('https://ess.example');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(supabaseConfig()).toBeNull();
  });

  it('other unusable Supabase addresses are treated as not set', async () => {
    for (const bad of ['https://abc .supabase.co', 'supabase', 'https://']) {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', bad);
      const { supabaseConfig } = await load();
      expect(supabaseConfig()).toBeNull();
    }
  });

  it('a missing key means sign-in is not set up', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { supabaseConfig } = await load();
    expect(supabaseConfig()).toBeNull();
  });
});
