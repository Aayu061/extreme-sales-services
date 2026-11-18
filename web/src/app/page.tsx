import { Container } from '@/components/site/container';
import { TemperatureNumeral } from '@/components/home/temperature-numeral';
import { ProblemPicker, type PickerService } from '@/components/home/problem-picker';
import { ButtonLink } from '@/components/ui/button';
import { getCatalog, getProducts, getSiteBasics, FALLBACK_HERO } from '@/lib/data';
import { formatInr, lowestTotal } from '@/lib/format';
import { PROBLEM_CHIPS } from '@/lib/problems';

/**
 * Home (Stage C foundation): the temperature hero with live catalog prices and the three ways in
 * (service, AMC, buy). The remaining home blocks (how it works, featured ACs, pincode check,
 * reviews, FAQ) arrive in Stage D.
 */
export default async function HomePage() {
  const [catalog, products, basics] = await Promise.all([
    getCatalog(),
    getProducts().catch(() => []),
    getSiteBasics().catch(() => ({ hero: FALLBACK_HERO })),
  ]);

  const services: PickerService[] = catalog.services
    .filter((s) => s.isPublic && s.isActive)
    .map(({ code, name, shortDescription, pricingModel, price }) => ({ code, name, shortDescription, pricingModel, price }));

  const serviceFrom = lowestTotal(services.filter((s) => s.pricingModel !== 'QUOTE_AFTER_DIAGNOSIS').map((s) => s.price));
  const amcFrom = lowestTotal(catalog.amcPlans.flatMap((p) => Object.values(p.rates)));
  const inStock = products.filter((p) => p.inStock).length;

  return (
    <>
      <section aria-labelledby="hero-heading" className="border-b border-line bg-paper">
        <Container className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-14">
          <TemperatureNumeral />
          <div className="max-w-3xl">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl">
              {basics.hero.headline}
            </h1>
            <p className="mt-3 max-w-prose text-lg text-slate">{basics.hero.subline}</p>
            <div className="mt-6">
              <ProblemPicker chips={PROBLEM_CHIPS} services={services} />
            </div>
          </div>
        </Container>
      </section>

      <section aria-label="Ways we can help" className="border-b border-line">
        <Container className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-8 sm:pr-8">
            <h2 className="text-xl">Service and repair</h2>
            {serviceFrom !== null && <p className="tabular mt-1 text-slate">From {formatInr(serviceFrom)} incl. GST</p>}
            <p className="mt-2 text-slate">Jet wash, gas charging, repairs, installation.</p>
            <ButtonLink href="/services" variant="quiet" className="mt-3 px-0">
              See services
            </ButtonLink>
          </div>
          <div className="py-8 sm:px-8">
            <h2 className="text-xl">AMC plans</h2>
            {amcFrom !== null && <p className="tabular mt-1 text-slate">From {formatInr(amcFrom)} a year</p>}
            <p className="mt-2 text-slate">Regular visits and complaint cover for split and window ACs.</p>
            <ButtonLink href="/amc" variant="quiet" className="mt-3 px-0">
              Compare plans
            </ButtonLink>
          </div>
          <div className="py-8 sm:pl-8">
            <h2 className="text-xl">Buy an AC</h2>
            <p className="tabular mt-1 text-slate">{inStock > 0 ? `${inStock} models in stock` : 'New split and window ACs'}</p>
            <p className="mt-2 text-slate">Full price incl. GST, with installation and AMC on request.</p>
            <ButtonLink href="/shop" variant="quiet" className="mt-3 px-0">
              Shop ACs
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
