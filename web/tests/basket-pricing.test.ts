import { describe, expect, it } from 'vitest';
import products from '../dev/fixtures/products.json';
import { fixtureCatalog } from './helpers/catalog';
import { basketTotals, priceLine } from '@/lib/basket-pricing';
import { lineKey, type BasketLine, type LineAc, type LineType } from '@/lib/basket';
import type { Product } from '@/lib/pys/types';

const allProducts = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];
const line = (type: LineType, ref: string, ac?: LineAc, quantity = 1): BasketLine => ({ key: lineKey(type, ref, ac), type, ref, name: ref, quantity, ac });
const price = (l: BasketLine) => priceLine(l, fixtureCatalog, allProducts);
const plan = (code: string) => fixtureCatalog.amcPlans.find((p) => p.code === code)!;
const unit = (l: BasketLine) => {
  const p = price(l);
  if (p.status !== 'ok') throw new Error('expected ok');
  return p.unit;
};

describe('priceLine (same rules as PYS basketPricing)', () => {
  it('prices services from the live catalog', () => {
    expect(unit(line('SERVICE', 'SVC-JET-WASH'))).toBe(1414.82);
    expect(unit(line('SERVICE', 'SVC-PCB'))).toBeNull();
  });

  it('prices AMC plans by AC type and size', () => {
    expect(unit(line('AMC', 'ORD-4', { type: 'SPLIT', tonnage: 1.5 }))).toBe(plan('ORD-4').rates.splitLarge!.total);
    expect(unit(line('AMC', 'ORD-4', { type: 'SPLIT', tonnage: 1 }))).toBe(plan('ORD-4').rates.splitSmall!.total);
    expect(unit(line('AMC', 'ORD-4', { type: 'SPLIT', tonnage: 2.5 }))).toBeNull();
    expect(unit(line('AMC', 'ORD-4', { type: 'CASSETTE', tonnage: 1.5 }))).toBeNull();
    expect(unit(line('AMC', 'ORD-4'))).toBeNull();
    expect(unit(line('AMC', 'JKT-2'))).toBe(plan('JKT-2').rates.flat!.total);
  });

  it('prices products at their listed price', () => {
    expect(unit(line('PRODUCT', 'nlbvy46fALr4txUIZfqr'))).toBe(33990);
  });

  it('marks things that are no longer offered', () => {
    expect(price(line('SERVICE', 'SVC-NOPE')).status).toBe('unavailable');
    expect(price(line('AMC', 'NOPE-9')).status).toBe('unavailable');
    expect(price(line('PRODUCT', 'gone-123')).status).toBe('unavailable');
  });
});

describe('when the AC list could not be loaded', () => {
  it('does not call ACs unavailable, it marks them unchecked', () => {
    const p = priceLine(line('PRODUCT', 'nlbvy46fALr4txUIZfqr'), fixtureCatalog, [], { productsUnknown: true });
    expect(p.status).toBe('ok');
    if (p.status === 'ok') {
      expect(p.unit).toBeNull();
      expect(p.unchecked).toBe(true);
    }
  });
});

describe('basketTotals', () => {
  it('adds up known prices, flags unpriced lines and counts unavailable ones', () => {
    const t = basketTotals([
      price(line('SERVICE', 'SVC-JET-WASH', undefined, 2)),
      price(line('PRODUCT', 'nlbvy46fALr4txUIZfqr')),
      price(line('SERVICE', 'SVC-PCB')),
      price(line('PRODUCT', 'gone-123')),
    ]);
    expect(t.known).toBeCloseTo(1414.82 * 2 + 33990, 2);
    expect(t.hasUnpriced).toBe(true);
    expect(t.unavailable).toBe(1);
  });
});

describe('payment breakdown', () => {
  it('splits the total into before-GST and GST, and counts items priced later', () => {
    const jet = fixtureCatalog.services.find((s) => s.code === 'SVC-JET-WASH')!.price!;
    const amc = plan('ORD-4').rates.splitSmall!;
    const t = basketTotals([
      price(line('SERVICE', 'SVC-JET-WASH', undefined, 2)),
      price(line('SERVICE', 'SVC-PCB')),
      price(line('AMC', 'ORD-4', { type: 'SPLIT', tonnage: 1 })),
    ]);
    expect(t.base).toBeCloseTo(jet.base * 2 + amc.base, 2);
    expect(t.gst).toBeCloseTo(jet.gst * 2 + amc.gst, 2);
    expect(t.known).toBeCloseTo(t.base + t.gst, 2);
    expect(t.unpricedCount).toBe(1);
    expect(t.gstByRate).toEqual([{ rate: jet.gstRatePercent, gst: t.gst }]);
  });

  it('gives each priced service line its GST breakup', () => {
    const p = price(line('SERVICE', 'SVC-JET-WASH'));
    expect(p.status === 'ok' && p.breakup).toEqual(fixtureCatalog.services.find((s) => s.code === 'SVC-JET-WASH')!.price);
  });
});

describe('AC price breakdown (listed prices include GST)', () => {
  it('splits a listed AC price into before-GST and 18% GST that add up exactly', () => {
    const p = price(line('PRODUCT', 'nlbvy46fALr4txUIZfqr'));
    expect(p.status === 'ok' && p.breakup).toEqual({ base: 28805.08, gstRatePercent: 18, gst: 5184.92, total: 33990 });
    const t = basketTotals([price(line('PRODUCT', 'nlbvy46fALr4txUIZfqr', undefined, 2))]);
    expect(t).toMatchObject({ known: 67980, base: 57610.16, gst: 10369.84 });
    expect(t.gstByRate).toEqual([{ rate: 18, gst: 10369.84 }]);
  });
});
