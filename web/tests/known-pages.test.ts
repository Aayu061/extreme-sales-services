import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isUnknownDetail } from '@/lib/known-pages';

const known = { services: ['svc-jet-wash', 'svc-gas'], products: ['nlbvy46fALr4txUIZfqr', 'id with space'] };

describe('isUnknownDetail', () => {
  it('flags a mistyped service or AC address', () => {
    expect(isUnknownDetail('/services/svc-nope', known)).toBe(true);
    expect(isUnknownDetail('/shop/nope', known)).toBe(true);
  });

  it('lets real pages through, whatever the case of a service code', () => {
    expect(isUnknownDetail('/services/svc-jet-wash', known)).toBe(false);
    expect(isUnknownDetail('/services/SVC-JET-WASH', known)).toBe(false);
    expect(isUnknownDetail('/shop/nlbvy46fALr4txUIZfqr', known)).toBe(false);
    expect(isUnknownDetail('/shop/id%20with%20space', known)).toBe(false);
  });

  it('never touches other addresses', () => {
    for (const p of ['/services', '/shop', '/', '/amc', '/services/svc-gas/extra', '/shop/%E0%A4']) expect(isUnknownDetail(p, known)).toBe(false);
  });
});

const { getCatalog, getProducts } = vi.hoisted(() => ({ getCatalog: vi.fn(), getProducts: vi.fn() }));
vi.mock('@/lib/data', () => ({ getCatalog, getProducts }));

describe('GET /api/known-pages', () => {
  beforeEach(() => {
    getCatalog.mockReset();
    getProducts.mockReset();
  });

  it('lists the public service addresses and AC ids', async () => {
    getCatalog.mockResolvedValue({
      services: [
        { code: 'SVC-JET-WASH', isPublic: true, isActive: true },
        { code: 'SVC-HIDDEN', isPublic: false, isActive: true },
      ],
      amcPlans: [],
    });
    getProducts.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const { GET } = await import('@/app/api/known-pages/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ services: ['svc-jet-wash'], products: ['p1', 'p2'] });
  });

  it('answers 503 when PYS cannot be reached, so pages are not wrongly hidden', async () => {
    getCatalog.mockRejectedValue(new Error('asleep'));
    getProducts.mockResolvedValue([]);
    const { GET } = await import('@/app/api/known-pages/route');
    expect((await GET()).status).toBe(503);
  });
});
