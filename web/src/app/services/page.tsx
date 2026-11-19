import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { AddToRequest } from '@/components/basket/add-to-request';
import { getCatalog } from '@/lib/data';
import { servicePriceText } from '@/lib/format';
import { groupServices, serviceSlug } from '@/lib/services';

export const metadata: Metadata = {
  title: 'AC services and prices',
  description: 'AC cleaning, gas charging, installation, diagnosis and repairs in Mumbai, Thane and Navi Mumbai. Every price includes GST.',
  alternates: { canonical: '/services' },
};

const anchor = (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default async function ServicesPage() {
  const catalog = await getCatalog();
  const groups = groupServices(catalog.services);

  return (
    <>
      <PageBanner
        title="Services and prices"
        intro="Every price includes GST. Repairs are priced after a diagnosis visit."
        crumbs={[{ href: '/services', label: 'Services' }]}
      >
        <nav aria-label="Service groups" className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.category} href={`#${anchor(g.category)}`} className="glass inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold hover:text-cool">
              {g.label}
            </a>
          ))}
        </nav>
      </PageBanner>

      <Container className="py-8 sm:py-12">
        {groups.map((g) => (
          <section key={g.category} id={anchor(g.category)} aria-labelledby={`${anchor(g.category)}-h`} className="reveal scroll-mt-28 pb-10">
            <h2 id={`${anchor(g.category)}-h`} className="text-[clamp(26px,3vw,36px)]">
              {g.label}
            </h2>
            {g.note && <p className="mt-1 text-muted">{g.note}</p>}
            <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s) => (
                <article key={s.code} className="glass flex flex-col rounded-3xl p-6 text-ink">
                  <h3 className="text-xl">
                    <Link href={`/services/${serviceSlug(s.code)}`} className="hover:text-cool hover:underline">
                      {s.name}
                    </Link>
                  </h3>
                  {s.shortDescription && <p className="mt-2 text-sm text-muted">{s.shortDescription}</p>}
                  <div className="mt-auto pt-5">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="tabular text-2xl font-extrabold">{servicePriceText(s)}</span>
                      {s.price && s.pricingModel !== 'QUOTE_AFTER_DIAGNOSIS' && <span className="text-sm text-muted">incl. GST</span>}
                    </p>
                    {s.durationMinutes ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <Clock aria-hidden="true" size={15} /> About {s.durationMinutes} minutes
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <AddToRequest line={{ type: 'SERVICE', ref: s.code, name: s.name }} />
                      <Link href={`/services/${serviceSlug(s.code)}`} className="text-sm font-semibold text-cool underline-offset-4 hover:underline">
                        What&apos;s included
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
