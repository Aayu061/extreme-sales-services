import Link from 'next/link';
import { ProductArt } from '@/components/shop/product-art';
import { CalendarCheck, Clock, Phone, Receipt, ShieldCheck, Tag } from 'lucide-react';
import { Container } from '@/components/site/container';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { Hero } from '@/components/home/hero/hero';
import { XraySection } from '@/components/home/xray-section';
import { AmcSection } from '@/components/home/amc-section';
import { AcTypesSection } from '@/components/home/ac-types-section';
import { amcCard } from '@/lib/amc';
import { acTypeTiles } from '@/lib/ac-kind';
import type { PickerService } from '@/lib/answer';
import { ServiceIcon } from '@/components/home/service-icon';
import { BrandStrip } from '@/components/home/brand-strip';
import { ButtonLink, buttonStyles } from '@/components/ui/button';
import { getCatalog, getHeroCard, getHomeOffers, getProducts, getSiteBasics, FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';
import { formatInr, lowestTotal, servicePriceText } from '@/lib/format';
import { cn } from '@/lib/cn';

function visitSteps(warrantyDays: number) {
  const warranty = warrantyDays > 0 ? ` Our work has a ${warrantyDays}-day warranty.` : '';
  return [
    { title: 'Tell us what is wrong', text: 'Pick a problem or a service. You see the price before you book.' },
    { title: 'We confirm your visit', text: 'Our team confirms the date and time with you.' },
    { title: 'A technician comes over', text: `The work is done at your home or office. Any extra repair is quoted first.${warranty}` },
    { title: 'Follow it online', text: 'Your tracking code shows every step, from booked to done.' },
  ];
}

/**
 * Home, "Bright Cool Air": blue hero with the cooling AC, the problem picker, services with real
 * prices, plans and new ACs, featured models, brands, how it works and a closing call to action.
 * Every price comes from PYS; nothing here promises times or guarantees the business has not confirmed.
 */
export default async function HomePage() {
  const [catalog, products, basics, offers, heroCard] = await Promise.all([
    getCatalog(),
    getProducts().catch(() => []),
    getSiteBasics().catch(() => ({ hero: FALLBACK_HERO, identity: FALLBACK_IDENTITY })),
    getHomeOffers().catch(() => []),
    getHeroCard(),
  ]);
  const { hero, identity } = basics;

  const publicServices = catalog.services.filter((s) => s.isPublic && s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  const pickerServices: PickerService[] = publicServices.map(({ code, name, shortDescription, pricingModel, price, category }) => ({
    code,
    name,
    shortDescription,
    pricingModel,
    price,
    category,
  }));
  const pricedServices = publicServices.filter((s) => s.pricingModel !== 'QUOTE_AFTER_DIAGNOSIS');
  const repairs = publicServices.filter((s) => s.pricingModel === 'QUOTE_AFTER_DIAGNOSIS');

  const amcFrom = lowestTotal(catalog.amcPlans.flatMap((p) => Object.values(p.rates)));
  const inStock = products.filter((p) => p.inStock);
  const featured = inStock
    .filter((p) => p.price !== null && p.category === 'residential')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 4);
  const shopPhotos = [...inStock].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 3);

  const tel = identity.phone.replace(/[^+\d]/g, '');
  const wa = (identity.whatsapp ?? identity.phone).replace(/\D/g, '');

  return (
    <>
      <Hero hero={hero} identity={identity} services={pickerServices} card={heroCard} />

      <AmcSection plans={catalog.amcPlans.map(amcCard)} />
      <AcTypesSection tiles={acTypeTiles(products)} featured={featured} />

      {/* Brands */}
      <section aria-labelledby="brands-heading" className="reveal py-16 sm:py-20">
        <Container>
          <h2 id="brands-heading" className="text-3xl">
            Brands we work with
          </h2>
          <p className="mt-2 text-slate">We service and repair all of these brands.</p>
        </Container>
        <div className="mx-auto mt-8 max-w-350">
          <BrandStrip />
        </div>
      </section>

      {/* How it works (a real sequence, so the steps are numbered) */}
      <section aria-labelledby="steps-heading" className="reveal pb-16 sm:pb-20">
        <Container>
          <h2 id="steps-heading" className="text-3xl">
            How a visit works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visitSteps(identity.warrantyDays).map((step, i) => (
              <li key={step.title} className="relative">
                <span className="display tabular flex size-12 items-center justify-center rounded-full bg-hero text-xl text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg">{step.title}</h3>
                <p className="mt-1 text-slate">{step.text}</p>
              </li>
            ))}
          </ol>
          <ButtonLink href="/track" variant="quiet" className="mt-6 px-0">
            Track a request
          </ButtonLink>
        </Container>
      </section>

      {/* Closing call to action */}
      <section aria-labelledby="cta-heading" className="reveal pb-6">
        <Container>
          <div className="relative overflow-hidden rounded-sheet bg-hero px-6 py-12 text-white sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_100%_0%,rgb(27_163_224/0.5),transparent_60%)]"
            />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 id="cta-heading" className="text-3xl text-white">
                  Is your AC ready for the heat?
                </h2>
                <p className="mt-2 text-white/85">Book online, or talk to us on the phone or WhatsApp.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/book" variant="taxi" size="lg">
                  Book a service
                </ButtonLink>
                <a href={`tel:${tel}`} className={buttonStyles({ variant: 'glass', size: 'lg' })}>
                  <Phone aria-hidden="true" size={20} />
                  {identity.phone}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
