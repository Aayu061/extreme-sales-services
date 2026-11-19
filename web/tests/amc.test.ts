import { describe, expect, it } from 'vitest';
import { amcCard, amcHighlights, lowestAmc } from '@/lib/amc';
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

describe('amcHighlights (the home page shows three, the AMC page shows all)', () => {
  const cards = fixtureCatalog.amcPlans.map(amcCard);

  it('picks the cheapest plan, the cheapest with spare parts and the cheapest with gas charging', () => {
    const picked = amcHighlights(cards);
    expect(picked.map((p) => p.code)).toEqual(['ORD-3', 'SAMC-1', 'SAMC-3']);
  });

  it('never repeats a plan and fills up with the next cheapest', () => {
    const one = { code: 'A', name: 'A', visitsPerYear: 2, covers: ['Gas charging', 'Spare parts'], fromTotal: 500 };
    const two = { code: 'B', name: 'B', visitsPerYear: 3, covers: [], fromTotal: 900 };
    expect(amcHighlights([two, one]).map((p) => p.code)).toEqual(['A', 'B']);
  });

  it('skips plans without a published price', () => {
    expect(amcHighlights([{ code: 'X', name: 'X', visitsPerYear: 1, covers: [], fromTotal: null }])).toEqual([]);
  });

  it('gives the lowest yearly price across all plans for the summary', () => {
    expect(lowestAmc(cards)).toBe(1000);
    expect(lowestAmc([])).toBeNull();
  });
});
