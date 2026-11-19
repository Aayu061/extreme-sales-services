import { Hero } from '@/components/home/hero/hero';
import { XraySection } from '@/components/home/xray-section';
import { AmcSection } from '@/components/home/amc-section';
import { AcTypesSection } from '@/components/home/ac-types-section';
import { BookSteps } from '@/components/home/book-steps';
import { ContactArea } from '@/components/home/contact-area';
import { acTypeTiles } from '@/lib/ac-kind';
import { amcCard } from '@/lib/amc';
import type { PickerService } from '@/lib/answer';
import { getCatalog, getHeroCard, getProducts, getSiteBasics, FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';

/**
 * Home, "Mumbai Glass" (design doc §5–6): the room photo where the ESS AC switches on, then the
 * AC X-ray (services and prices), AMC plans, AC types, booking steps and contact. Every price
 * comes live from PYS; nothing here promises times or guarantees the business has not confirmed.
 */
export default async function HomePage() {
  const [catalog, products, basics, heroCard] = await Promise.all([
    getCatalog(),
    getProducts().catch(() => []),
    getSiteBasics().catch(() => ({ hero: FALLBACK_HERO, identity: FALLBACK_IDENTITY })),
    getHeroCard(),
  ]);
  const { hero, identity } = basics;

  const services: PickerService[] = catalog.services
    .filter((s) => s.isPublic && s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(({ code, name, shortDescription, pricingModel, price, category }) => ({ code, name, shortDescription, pricingModel, price, category }));

  const featured = products
    .filter((p) => p.inStock && p.price !== null && p.category === 'residential')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 4);

  return (
    <>
      <Hero hero={hero} identity={identity} services={services} card={heroCard} />
      <XraySection services={services} />
      <AmcSection plans={catalog.amcPlans.map(amcCard)} />
      <AcTypesSection tiles={acTypeTiles(products)} featured={featured} />
      <BookSteps warrantyDays={identity.warrantyDays} />
      <ContactArea identity={identity} />
    </>
  );
}
