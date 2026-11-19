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
