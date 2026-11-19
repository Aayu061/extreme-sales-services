import Link from 'next/link';
import { ProductArt } from '@/components/shop/product-art';
import { CalendarCheck, Clock, Phone, Receipt, ShieldCheck, Tag } from 'lucide-react';
import { Container } from '@/components/site/container';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { Hero } from '@/components/home/hero/hero';
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

      {/* Offers (only when published in ESS admin) */}
      {offers.length > 0 && (
        <Container className="mt-8">
          <ul aria-label="Current offers" className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <li key={offer.title} className="flex items-start gap-4 rounded-card bg-tint-amber p-5 text-navy">
                <Tag aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-ink-amber" />
                <div>
                  <p className="text-lg font-semibold">{offer.title}</p>
                  {offer.text && <p className="mt-1 text-slate">{offer.text}</p>}
                  {offer.href && (
                    <Link href={offer.href} className="mt-2 inline-block font-semibold text-ink-amber underline underline-offset-4">
                      {offer.linkLabel || 'See the offer'}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {/* Services */}
      <section aria-labelledby="services-heading" className="reveal py-16 sm:py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="services-heading" className="text-3xl">
                Services and prices
              </h2>
              <p className="mt-2 max-w-prose text-slate">Prices include 18% GST. Tap a service to see what is included.</p>
            </div>
            <ButtonLink href="/services" variant="glass">
              All services
            </ButtonLink>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pricedServices.map((s) => (
              <li key={s.code}>
                <Link
                  href={`/services/${s.code.toLowerCase()}`}
                  className="group flex h-full flex-col rounded-card border border-line bg-paper p-5 transition-[transform,border-color,box-shadow] duration-200 ease-standard hover:-translate-y-1 hover:border-sky hover:shadow-[0_14px_30px_-18px_rgb(8_60_120/0.5)] active:translate-y-0"
                >
                  <ServiceIcon code={s.code} category={s.category} />
                  <span className="mt-4 text-lg font-semibold text-navy">{s.name}</span>
                  {s.shortDescription && <span className="mt-1 line-clamp-2 text-slate">{s.shortDescription}</span>}
                  <span className="tabular mt-auto pt-4 font-semibold text-navy">{servicePriceText(s)}</span>
                </Link>
              </li>
            ))}
            {repairs.length > 0 && (
              <li className="sm:col-span-2 lg:col-span-4">
                <Link
                  href="/services#repairs"
                  className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-paper p-5 transition-[border-color,box-shadow] duration-200 hover:border-sky hover:shadow-[0_14px_30px_-18px_rgb(8_60_120/0.5)]"
                >
                  <ServiceIcon code={repairs[0].code} category="REPAIR" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-navy">Repairs</span>
                    <span className="block text-slate">{repairs.map((r) => r.name).join(', ')}. Priced after the diagnosis visit.</span>
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </Container>
      </section>

      {/* Plans and new ACs */}
      <section aria-label="AMC plans and new ACs" className="reveal pb-16 sm:pb-20">
        <Container className="grid gap-4 lg:grid-cols-2">
          <Link
            href="/amc"
            className="group relative flex min-h-64 flex-col overflow-hidden rounded-sheet bg-tint-violet p-7 text-navy transition-transform duration-200 hover:-translate-y-1 sm:p-9"
          >
            <CalendarCheck aria-hidden="true" size={120} strokeWidth={1.25} className="absolute -right-4 -bottom-4 text-ink-violet/20 transition-transform duration-300 group-hover:-rotate-6" />
            <h2 className="text-3xl">AMC plans</h2>
            <p className="mt-2 max-w-sm text-slate">
              {catalog.amcPlans.length} yearly plans for split and window ACs, with regular service visits.
            </p>
            {amcFrom !== null && <p className="tabular mt-auto pt-6 text-xl font-semibold">From {formatInr(amcFrom)} a year</p>}
            <span className="mt-2 font-semibold text-ink-violet underline-offset-4 group-hover:underline">Compare plans</span>
          </Link>

          <Link
            href="/shop"
            className="group relative flex min-h-64 flex-col overflow-hidden rounded-sheet bg-tint-sky p-7 text-navy transition-transform duration-200 hover:-translate-y-1 sm:p-9"
          >
            <div className="relative z-10 max-w-[55%]">
              <h2 className="text-3xl">Buy a new AC</h2>
              <p className="mt-2 text-slate">Split, window and commercial ACs. Full price with GST, installation on request.</p>
            </div>
            <p className="tabular relative z-10 mt-auto pt-6 text-xl font-semibold">{inStock.length} models in stock</p>
            <span className="relative z-10 mt-2 font-semibold text-ink-sky underline-offset-4 group-hover:underline">Shop ACs</span>
            <div aria-hidden="true" className="absolute top-6 right-6 bottom-6 hidden w-[40%] sm:block">
              {shopPhotos.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    'absolute aspect-square w-[72%] overflow-hidden rounded-card border-4 border-paper bg-paper shadow-lg transition-transform duration-300',
                    i === 0 && 'top-0 right-0 rotate-3 group-hover:rotate-6',
                    i === 1 && 'top-[28%] right-[22%] -rotate-3 group-hover:-rotate-6',
                    i === 2 && 'right-[4%] bottom-0 rotate-2 group-hover:rotate-0',
                  )}
                >
                  <ProductArt product={{ ...p, name: '' }} sizes="200px" className="size-full" />
                </div>
              ))}
            </div>
          </Link>
        </Container>
      </section>

      {/* Featured ACs */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="reveal border-y border-line bg-paper py-16 sm:py-20">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="featured-heading" className="text-3xl">
                ACs for homes
              </h2>
              <ButtonLink href="/shop" variant="glass">
                See all ACs
              </ButtonLink>
            </div>
            <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {featured.map((p) => (
                <li key={p.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                  <Link
                    href={`/shop/${encodeURIComponent(p.id)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-frost transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_-18px_rgb(8_60_120/0.5)]"
                  >
                    <ProductArt
                      product={p}
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 78vw"
                      className="aspect-4/3"
                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="flex flex-1 flex-col p-4">
                      {p.brand && <span className="text-sm text-slate">{p.brand}</span>}
                      <span className="mt-0.5 line-clamp-2 font-semibold text-navy">{p.name}</span>
                      <span className="tabular mt-auto pt-3 text-xl font-semibold text-navy">
                        {formatInr(p.price!)}
                        {typeof p.mrp === 'number' && p.mrp > p.price! && (
                          <span className="ml-2 text-sm font-normal text-slate line-through">{formatInr(p.mrp)}</span>
                        )}
                      </span>
                      <span className="text-sm text-slate">incl. GST</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

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
