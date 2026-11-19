import { lowestTotal } from '@/lib/format';
import type { CatalogAmcPlan } from '@/lib/pys/types';

/** What an AMC card on the home page shows. */
export interface AmcCard {
  code: string;
  name: string;
  visitsPerYear: number;
  covers: string[];
  /** Lowest yearly price incl. GST across AC types; null = no rate published. */
  fromTotal: number | null;
}

export function amcCard(plan: CatalogAmcPlan): AmcCard {
  const covers = [
    plan.hasGasCharging ? 'Gas charging' : null,
    plan.hasSpareParts ? 'Spare parts' : null,
    plan.hasUnlimitedComplaints ? 'Unlimited complaints' : null,
  ].filter((c): c is string => Boolean(c));
  return {
    code: plan.code,
    name: plan.name,
    visitsPerYear: plan.visitsPerYear,
    covers,
    fromTotal: lowestTotal(Object.values(plan.rates)),
  };
}

/** Lowest yearly AMC price across all plans (for "from ₹… a year"), or null if none is published. */
export function lowestAmc(cards: AmcCard[]): number | null {
  const prices = cards.map((c) => c.fromTotal).filter((n): n is number => n !== null);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * Three plans that show the range on the home page (the AMC page lists them all): the cheapest,
 * the cheapest that includes spare parts, the cheapest that includes gas charging. Gaps are
 * filled with the next cheapest; plans without a price are left out.
 */
export function amcHighlights(cards: AmcCard[]): AmcCard[] {
  const priced = cards.filter((c) => c.fromTotal !== null).sort((a, b) => a.fromTotal! - b.fromTotal!);
  const picked: AmcCard[] = [];
  const take = (c: AmcCard | undefined) => {
    if (c && !picked.includes(c)) picked.push(c);
  };
  take(priced[0]);
  take(priced.find((c) => c.covers.includes('Spare parts') && !picked.includes(c)));
  take(priced.find((c) => c.covers.includes('Gas charging') && !picked.includes(c)));
  for (const c of priced) {
    if (picked.length >= 3) break;
    take(c);
  }
  return picked.slice(0, 3);
}
