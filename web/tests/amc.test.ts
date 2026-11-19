import { describe, expect, it } from 'vitest';
import { amcCard } from '@/lib/amc';
import { fixtureCatalog } from './helpers/catalog';
import type { CatalogAmcPlan } from '@/lib/pys/types';

const plan = (code: string) => fixtureCatalog.amcPlans.find((p) => p.code === code)!;

describe('amcCard', () => {
  it('summarises a plan with its lowest yearly price incl. GST', () => {
    expect(amcCard(plan('ORD-4'))).toEqual({
      code: 'ORD-4',
      name: 'Ordinary AMC (4 Services + Complaints)',
      visitsPerYear: 4,
      covers: ['Unlimited complaints'],
      fromTotal: 1300,
    });
  });

  it('shows no price when PYS has no rates for the plan', () => {
    const p: CatalogAmcPlan = { ...plan('ORD-4'), rates: { splitSmall: null, splitLarge: null, windowSmall: null, windowLarge: null, flat: null } };
    expect(amcCard(p).fromTotal).toBeNull();
  });

  it('lists gas charging and spare parts when the plan includes them', () => {
    const p: CatalogAmcPlan = { ...plan('ORD-4'), hasGasCharging: true, hasSpareParts: true, hasUnlimitedComplaints: false };
    expect(amcCard(p).covers).toEqual(['Gas charging', 'Spare parts']);
  });
});
