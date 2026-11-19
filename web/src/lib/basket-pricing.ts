import type { Catalog, CatalogAmcPlan, CatalogService, PriceBreakup, Product } from '@/lib/pys/types';
import type { BasketLine, LineAc } from '@/lib/basket';

/**
 * What a basket line costs, using the same rules PYS uses when it stores the request
 * (server/src/services/basketPricing.ts in the PYS repo), so the customer sees what staff see.
 * unit = price per item incl. GST; null = priced after inspection / on request.
 */

export type PricedLine =
  | {
      line: BasketLine;
      status: 'ok';
      unit: number | null;
      /** Before GST + GST for services and AMC plans; null for ACs and unpriced items. */
      breakup: PriceBreakup | null;
      label: string;
      /** AC list could not be loaded, so this AC was not checked. */
      unchecked?: boolean;
    }
  | { line: BasketLine; status: 'unavailable' };

/**
 * GST rate for air conditioners (18 % since the GST change of 22 Sep 2025). AC prices in PYS are
 * listed incl. GST, so the breakdown is worked back from the listed price. Change here if needed.
 */
export const AC_GST_RATE_PERCENT = 18;

/** Listed (GST-inclusive) AC price → before GST + GST; the two always add up to the listed price. */
export function acBreakup(total: number, rate = AC_GST_RATE_PERCENT): PriceBreakup {
  const base = Math.round((total / (1 + rate / 100)) * 100) / 100;
  return { base, gstRatePercent: rate, gst: Math.round((total - base) * 100) / 100, total };
}

/** AMC rate card sizes: "small" 0.75–1.0 ton, "large" 1.5–2.2 ton. */
export const AMC_SMALL = { min: 0.75, max: 1.0 } as const;
export const AMC_LARGE = { min: 1.5, max: 2.2 } as const;

export function servicePrice(s: CatalogService, ac?: LineAc): PriceBreakup | null {
  if (s.pricingModel === 'QUOTE_AFTER_DIAGNOSIS') return null;
  if (ac?.type && ac.tonnage !== undefined) {
    const row = s.priceMatrix.find((p) => p.acType === ac.type && ac.tonnage! >= p.tonnageMin && ac.tonnage! <= p.tonnageMax);
    if (row) return row;
  }
  return s.price;
}

export function amcPrice(plan: CatalogAmcPlan, ac?: LineAc): PriceBreakup | null {
  if (plan.rates.flat) return plan.rates.flat;
  if (!ac?.type || ac.tonnage === undefined) return null;
  const t = ac.tonnage;
  const size = t >= AMC_SMALL.min && t <= AMC_SMALL.max ? 'Small' : t >= AMC_LARGE.min && t <= AMC_LARGE.max ? 'Large' : null;
  if (!size) return null;
  if (ac.type === 'SPLIT') return plan.rates[`split${size}`];
  if (ac.type === 'WINDOW') return plan.rates[`window${size}`];
  return null;
}

export function priceLine(
  line: BasketLine,
  catalog: Pick<Catalog, 'services' | 'amcPlans'>,
  products: Product[],
  opts: { productsUnknown?: boolean } = {},
): PricedLine {
  if (line.type === 'SERVICE') {
    const s = catalog.services.find((x) => x.code === line.ref && x.isActive && x.isPublic);
    if (!s) return { line, status: 'unavailable' };
    const b = servicePrice(s, line.ac);
    return { line, status: 'ok', unit: b?.total ?? null, breakup: b, label: s.name };
  }
  if (line.type === 'AMC') {
    const want = line.ref.toUpperCase();
    const plan = catalog.amcPlans.find((p) => p.code.toUpperCase() === want || p.planCode.toUpperCase() === want);
    if (!plan) return { line, status: 'unavailable' };
    const b = amcPrice(plan, line.ac);
    return { line, status: 'ok', unit: b?.total ?? null, breakup: b, label: plan.name };
  }
  const p = products.find((x) => x.id === line.ref);
  if (!p && opts.productsUnknown) return { line, status: 'ok', unit: null, breakup: null, label: line.name, unchecked: true };
  if (!p) return { line, status: 'unavailable' };
  // AC prices are GST-inclusive retail prices; the GST part is worked back at the AC rate.
  const listed = typeof p.price === 'number' && p.price > 0 ? p.price : null;
  return { line, status: 'ok', unit: listed, breakup: listed === null ? null : acBreakup(listed), label: p.name };
}

export interface BasketTotals {
  /** Total of every priced line, GST included. */
  known: number;
  /** Before GST and GST, for lines that have a GST breakup (services, AMC plans). */
  base: number;
  gst: number;
  gstByRate: Array<{ rate: number; gst: number }>;
  hasUnpriced: boolean;
  unpricedCount: number;
  unavailable: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function basketTotals(lines: PricedLine[]): BasketTotals {
  let known = 0;
  let base = 0;
  let gst = 0;
  let unpricedCount = 0;
  let unavailable = 0;
  const byRate = new Map<number, number>();
  for (const l of lines) {
    if (l.status === 'unavailable') unavailable++;
    else if (l.unit === null) unpricedCount++;
    else {
      const q = l.line.quantity;
      known += l.unit * q;
      if (l.breakup) {
        base += l.breakup.base * q;
        gst += l.breakup.gst * q;
        byRate.set(l.breakup.gstRatePercent, (byRate.get(l.breakup.gstRatePercent) ?? 0) + l.breakup.gst * q);
      }
    }
  }
  return {
    known: r2(known),
    base: r2(base),
    gst: r2(gst),
    // Only rates where GST is actually charged get a row (some AMC prices carry 0 % GST).
    gstByRate: [...byRate.entries()]
      .filter(([, g]) => g > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([rate, g]) => ({ rate, gst: r2(g) })),
    hasUnpriced: unpricedCount > 0,
    unpricedCount,
    unavailable,
  };
}
