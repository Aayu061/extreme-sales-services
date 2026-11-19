import catalog from '../../dev/fixtures/catalog.json';
import type { Catalog } from '@/lib/pys/types';
import type { PickerService } from '@/lib/answer';

/** The live-catalog snapshot used by the local PYS stand-in (dev/fixtures). */
export const fixtureCatalog = catalog as unknown as Catalog;

export const fixtureServices: PickerService[] = fixtureCatalog.services
  .filter((s) => s.isPublic && s.isActive)
  .map(({ code, name, shortDescription, pricingModel, price, category }) => ({ code, name, shortDescription, pricingModel, price, category }));
