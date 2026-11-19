import type { Catalog, CatalogAmcPlan, CatalogService, PriceBreakup, Product } from '@/lib/pys/types';
import type { BasketLine, LineAc } from '@/lib/basket';

/**
 * What a basket line costs, using the same rules PYS uses when it stores the request
 * (server/src/services/basketPricing.ts in the PYS repo), so the customer sees what staff see.
 * unit = price per item incl. GST; null = priced after inspection / on request.
 */

export type PricedLine =
  | { line: BasketLine; status: 'ok'; unit: number | null; label: string; /** AC list could not be loaded, so this AC was not checked. */ unchecked?: boolean }
  | { line: BasketLine; status: 'unavailable' };

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
    return { line, status: 'ok', unit: servicePrice(s, line.ac)?.total ?? null, label: s.name };
  }
  if (line.type === 'AMC') {
    const want = line.ref.toUpperCase();
    const plan = catalog.amcPlans.find((p) => p.code.toUpperCase() === want || p.planCode.toUpperCase() === want);
    if (!plan) return { line, status: 'unavailable' };
    return { line, status: 'ok', unit: amcPrice(plan, line.ac)?.total ?? null, label: plan.name };
  }
  const p = products.find((x) => x.id === line.ref);
  if (!p && opts.productsUnknown) return { line, status: 'ok', unit: null, label: line.name, unchecked: true };
  if (!p) return { line, status: 'unavailable' };
  return { line, status: 'ok', unit: typeof p.price === 'number' && p.price > 0 ? p.price : null, label: p.name };
}

export function basketTotals(lines: PricedLine[]): { known: number; hasUnpriced: boolean; unavailable: number } {
  let known = 0;
  let hasUnpriced = false;
  let unavailable = 0;
  for (const l of lines) {
    if (l.status === 'unavailable') unavailable++;
    else if (l.unit === null) hasUnpriced = true;
    else known += l.unit * l.line.quantity;
  }
  return { known: Math.round(known * 100) / 100, hasUnpriced, unavailable };
}
