import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS } from '@/lib/legacy-redirects';

const REAL_ROUTES = ['/', '/amc', '/contact', '/services', '/shop', '/track', '/sell', '/account', '/book', '/admin', '/legal/privacy', '/legal/terms'];
const to = (source: string) => LEGACY_REDIRECTS.find((r) => r.source === source)?.destination;

describe('LEGACY_REDIRECTS', () => {
  it('has one rule per old address, none hiding a real page, all permanent', () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
    for (const r of REAL_ROUTES) expect(sources).not.toContain(r);
    expect(LEGACY_REDIRECTS.every((r) => r.permanent === true)).toBe(true);
  });

  it('sends old pages to their new homes', () => {
    expect(to('/service.html')).toBe('/services');
    expect(to('/service')).toBe('/services');
    expect(to('/status')).toBe('/track');
    expect(to('/products.html')).toBe('/shop');
    expect(to('/privacy')).toBe('/legal/privacy');
    expect(to('/terms.html')).toBe('/legal/terms');
    expect(to('/vendor')).toBe('/sell');
    expect(to('/customer-portal.html')).toBe('/account');
    expect(to('/login')).toBe('/account');
    expect(to('/admin.html')).toBe('/admin');
    expect(to('/staff')).toBe('/admin');
    expect(to('/amc.html')).toBe('/amc');
    expect(to('/contact.html')).toBe('/contact');
    expect(to('/index.html')).toBe('/');
    expect(to('/404.html')).toBe('/');
  });
});
