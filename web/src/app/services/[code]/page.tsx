import { PageNotes, Star } from '@/components/site/footnote';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, ShieldCheck, X } from 'lucide-react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToRequest } from '@/components/basket/add-to-request';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getCatalog, getSiteBasics } from '@/lib/data';
import { gstBreakupText, servicePriceText } from '@/lib/format';
import { findService, relatedServices, serviceSlug } from '@/lib/services';
import { JsonLd } from '@/components/site/json-ld';
import { serverEnv } from '@/lib/env';
import { serviceLd } from '@/lib/seo';

type Props = { params: Promise<{ code: string }> };

const AC_NAMES: Record<string, string> = { SPLIT: 'Split', WINDOW: 'Window', CASSETTE: 'Cassette', TOWER: 'Floor-standing', DUCTABLE: 'Ductable', VRF: 'VRF' };

export async function generateStaticParams() {
  try {
    const params = (await getCatalog()).services.filter((s) => s.isPublic && s.isActive).map((s) => ({ code: serviceSlug(s.code) }));
    if (params.length) return params;
  } catch {
    // PYS asleep during the build: pages are made on first visit instead.
  }
  // Cache Components needs at least one sample; an unknown code simply shows "not found".
  return [{ code: 'svc-jet-wash' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const s = findService((await getCatalog()).services, code);
  if (!s) return { title: 'Service not found' };
  return {
    title: s.name,
    description: s.shortDescription ?? `${s.name} in Mumbai, Thane and Navi Mumbai. Price incl. GST.`,
    alternates: { canonical: `/services/${serviceSlug(s.code)}` },
  };
}

/** The address is read inside Suspense so unknown addresses still get an instant page shell. */
export default function ServicePage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ServiceContent params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <Container className="py-16">
      <Skeleton className="h-64 rounded-[30px]" />
    </Container>
  );
}

async function ServiceContent({ params }: Props) {
  const { code } = await params;
  const [catalog, basics] = await Promise.all([getCatalog(), getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO }))]);
  const s = findService(catalog.services, code);
  if (!s) notFound();

  const warranty = s.warrantyDays || basics.identity.warrantyDays;
  const priced = s.price && s.pricingModel !== 'QUOTE_AFTER_DIAGNOSIS';
  const related = relatedServices(catalog.services, s);

  return (
    <>
      <JsonLd data={serviceLd(s, serverEnv().SITE_URL)} />
      <PageBanner title={s.name} intro={s.shortDescription ?? undefined} crumbs={[{ href: '/services', label: 'Services' }, { href: `/services/${serviceSlug(s.code)}`, label: s.name }]} />

      <Container className="grid gap-6 py-8 sm:py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {s.includes.length > 0 && (
            <section aria-labelledby="inc" className="glass rounded-3xl p-6 text-ink">
              <h2 id="inc" className="text-2xl">What&apos;s included</h2>
              <ul className="mt-3 space-y-2">
                {s.includes.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {s.excludes.length > 0 && (
            <section aria-labelledby="exc" className="glass rounded-3xl p-6 text-ink">
              <h2 id="exc" className="text-2xl">Not included</h2>
              <ul className="mt-3 space-y-2">
                {s.excludes.map((i) => (
                  <li key={i} className="flex gap-2">
                    <X aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-heat" />
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="facts" className="glass rounded-3xl p-6 text-ink">
            <h2 id="facts" className="text-2xl">Good to know</h2>
            <ul className="mt-3 space-y-2">
              {s.durationMinutes ? (
                <li className="flex gap-2">
                  <Clock aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                  Takes about {s.durationMinutes} minutes
                </li>
              ) : null}
              {s.appliesToAcTypes.length > 0 && (
                <li className="flex gap-2">
                  <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                  Works on {s.appliesToAcTypes.map((t) => AC_NAMES[t] ?? t).join(', ')} ACs
                </li>
              )}
              {warranty > 0 && (
                <li className="flex gap-2">
                  <ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                  {warranty}-day warranty on our work
                  <Star />
                </li>
              )}
              {s.pricingModel !== 'FIXED' && (
                <li className="flex gap-2">
                  <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                  {s.pricingModel === 'FROM' ? 'The final price depends on your AC; we confirm it before starting.' : 'We tell you the price after checking your AC, before any work.'}
                  <Star mark="**" />
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-strong rounded-3xl p-6 text-ink">
            <p className="text-sm text-muted">Price</p>
            <p className="tabular mt-1 text-3xl font-extrabold">{servicePriceText(s)}</p>
            {priced && s.price && <p className="tabular mt-1 text-sm text-muted">{gstBreakupText(s.price)}</p>}
            <AddToRequest className="mt-5" label="Book this" line={{ type: 'SERVICE', ref: s.code, name: s.name }} />
            <Link href="/book" className="mt-3 inline-block text-sm font-semibold text-cool underline-offset-4 hover:underline">
              Go to your request
            </Link>
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-2xl">You may also need</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.code} href={`/services/${serviceSlug(r.code)}`} className="glass block rounded-3xl p-5 text-ink transition-transform hover:-translate-y-1">
                <span className="block font-bold">{r.name}</span>
                <span className="tabular mt-1 block text-muted">{servicePriceText(r)}</span>
              </Link>
            ))}
          </div>
        </Container>
      )}
      <PageNotes ids={['warranty', 'inspection']} />
    </>
  );
}
