import { PageNotes } from '@/components/site/footnote';
import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero/hero';
import { XraySection } from '@/components/home/xray-section';
import { AmcSection } from '@/components/home/amc-section';
import { AcTypesSection } from '@/components/home/ac-types-section';
import { BookSteps } from '@/components/home/book-steps';
import { ContactArea } from '@/components/home/contact-area';
import { WhyEss } from '@/components/home/why-ess';
import { JsonLd } from '@/components/site/json-ld';
import { serverEnv } from '@/lib/env';
import { localBusinessLd } from '@/lib/seo';
import { acTypeTiles } from '@/lib/ac-kind';
import { amcCard } from '@/lib/amc';
import type { PickerService } from '@/lib/answer';
import { getCatalog, getHeroCard, getProducts, getSiteBasics, FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';

export const metadata: Metadata = { alternates: { canonical: '/' } };

/**
 * Home, "Mumbai Glass" (design doc §5–6): the room photo where the ESS AC switches on, then the
 * AC X-ray (services and prices), why ESS, an AMC introduction and the AC types (full lists live on
 * /amc and /shop), booking steps and contact. Every price
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

  return (
    <>
      <JsonLd data={localBusinessLd(identity, serverEnv().SITE_URL)} />
      <Hero hero={hero} identity={identity} services={services} card={heroCard} />
      <XraySection services={services} />
      <WhyEss warrantyDays={identity.warrantyDays} />
      <AmcSection plans={catalog.amcPlans.map(amcCard)} />
      <AcTypesSection tiles={acTypeTiles(products)} />
      <BookSteps warrantyDays={identity.warrantyDays} />
      <ContactArea identity={identity} />
      <PageNotes ids={['warranty', 'amc']} />
    </>
  );
}
