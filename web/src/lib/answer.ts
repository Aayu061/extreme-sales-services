import { servicePriceText } from '@/lib/format';
import type { CatalogService } from '@/lib/pys/types';

/** The slice of a catalog service the home page's answers need (passed to client components). */
export type PickerService = Pick<CatalogService, 'code' | 'name' | 'shortDescription' | 'pricingModel' | 'price' | 'category'>;

/** What a customer sees after naming a problem or tapping an AC part. */
export interface ServiceAnswer {
  serviceName: string | null;
  priceText: string;
  bookHref: string | null;
  detailHref: string | null;
}

/**
 * The live answer for a catalog service code. If PYS did not return the service (catalog down,
 * service hidden or renamed) the customer is asked to call; a price is never invented.
 */
export function serviceAnswer(code: string, services: PickerService[]): ServiceAnswer {
  const s = services.find((x) => x.code === code);
  if (!s) return { serviceName: null, priceText: 'Call us for this one', bookHref: null, detailHref: null };
  return {
    serviceName: s.name,
    priceText: servicePriceText(s),
    bookHref: `/book?service=${encodeURIComponent(s.code)}`,
    detailHref: `/services/${s.code.toLowerCase()}`,
  };
}
