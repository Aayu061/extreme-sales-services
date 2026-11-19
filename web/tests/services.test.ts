import { describe, expect, it } from 'vitest';
import { fixtureCatalog } from './helpers/catalog';
import { findService, groupServices, relatedServices, serviceSlug } from '@/lib/services';
import { amcRateFor } from '@/lib/amc';
import type { CatalogService } from '@/lib/pys/types';

const services = fixtureCatalog.services;
const plan = (code: string) => fixtureCatalog.amcPlans.find((p) => p.code === code)!;

describe('groupServices', () => {
  it('groups public services in the agreed order, repairs with their note', () => {
    const groups = groupServices(services);
    expect(groups.map((g) => g.label)).toEqual(['Cleaning', 'Gas', 'Installation', 'Diagnosis', 'Repairs']);
    expect(groups[4].note).toBe('Priced after the diagnosis visit');
  });

  it('leaves out hidden and inactive services', () => {
    const hidden: CatalogService = { ...services[0], code: 'SVC-HIDDEN', isPublic: false };
    const off: CatalogService = { ...services[0], code: 'SVC-OFF', isActive: false };
    const codes = groupServices([...services, hidden, off]).flatMap((g) => g.items.map((s) => s.code));
    expect(codes).not.toContain('SVC-HIDDEN');
    expect(codes).not.toContain('SVC-OFF');
  });
});

describe('service pages', () => {
  it('finds a service from its lower-case address', () => {
    expect(serviceSlug('SVC-JET-WASH')).toBe('svc-jet-wash');
    expect(findService(services, 'svc-jet-wash')?.code).toBe('SVC-JET-WASH');
    expect(findService(services, 'svc-nope')).toBeNull();
  });

  it('suggests services of the same kind first', () => {
    const jet = findService(services, 'svc-jet-wash')!;
    const related = relatedServices(services, jet);
    expect(related).toHaveLength(3);
    expect(related.slice(0, 2).every((s) => s.category === 'CLEANING')).toBe(true);
    expect(related.map((s) => s.code)).not.toContain('SVC-JET-WASH');
  });
});

describe('amcRateFor', () => {
  it('uses the flat rate when a plan has one, and null when the size is not offered', () => {
    expect(amcRateFor(plan('JKT-2'), 'windowSmall')).toEqual(plan('JKT-2').rates.flat);
    expect(amcRateFor(plan('SAMC-3'), 'splitSmall')).toBeNull();
    expect(amcRateFor(plan('ORD-4'), 'splitLarge')).toEqual(plan('ORD-4').rates.splitLarge);
  });
});
