import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Check, Phone } from 'lucide-react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToRequest } from '@/components/basket/add-to-request';
import { ProductArt } from '@/components/shop/product-art';
import { ProductCard } from '@/components/shop/product-card';
import { SellerDisclosure } from '@/components/shop/seller-disclosure';
import { kindOf } from '@/lib/ac-kind';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getProduct, getProducts, getSiteBasics } from '@/lib/data';
import { formatInr } from '@/lib/format';
import { starOf, tonnageOf } from '@/lib/shop';
import { JsonLd } from '@/components/site/json-ld';
import { serverEnv } from '@/lib/env';
import { productLd } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

const KIND_LABEL = { split: 'Split AC', window: 'Window AC', cassette: 'Cassette AC', tower: 'Floor-standing AC' } as const;
const decode = (id: string) => {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
};

export async function generateStaticParams() {
  try {
    const params = (await getProducts()).map((p) => ({ id: p.id }));
    if (params.length) return params;
  } catch {
    // PYS asleep during the build: pages are made on first visit instead.
  }
  // Cache Components needs at least one sample; an unknown id simply shows "not found".
  return [{ id: 'sample' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct(decode((await params).id));
  if (!p) return { title: 'AC not found' };
  const price = p.price !== null ? `, ${formatInr(p.price)} incl. GST` : '';
  return {
    title: p.name,
    description: `${p.brand ? `${p.brand} ` : ''}${p.name}${price}. Sold by ${p.seller.name}.`,
    alternates: { canonical: `/shop/${encodeURIComponent(p.id)}` },
  };
}

/** The address is read inside Suspense so unknown addresses still get an instant page shell. */
export default function ProductPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProductContent params={params} />
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

async function ProductContent({ params }: Props) {
  const id = decode((await params).id);
  const [p, products, basics] = await Promise.all([
    getProduct(id),
    getProducts().catch(() => []),
    getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO })),
  ]);
  if (!p) notFound();

  const kind = kindOf(p.name);
  const ton = tonnageOf(p);
  const star = starOf(p);
  const saving = p.price !== null && p.mrp !== null && p.mrp > p.price ? p.mrp - p.price : 0;
  const specs: Array<[string, string | null]> = [
    ['Cooling capacity', p.specs.coolingCapacity],
    ['Power use', p.specs.powerConsumption],
    ['Refrigerant', p.specs.refrigerant],
    ['Noise', p.specs.noiseLevel],
    ['Size', p.specs.dimensions],
    ['Country of origin', p.countryOfOrigin],
  ];
  const shownSpecs = specs.filter(([, v]) => v);
  const more = products.filter((x) => x.id !== p.id && kindOf(x.name) === kind).slice(0, 3);
  const tel = basics.identity.phone.replace(/[^+\d]/g, '');

  return (
    <>
      <JsonLd data={productLd(p, serverEnv().SITE_URL)} />
      <PageBanner title={p.name} crumbs={[{ href: '/shop', label: 'Shop ACs' }, { href: `/shop/${encodeURIComponent(p.id)}`, label: p.brand ?? 'AC' }]} />

      <Container className="grid gap-6 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass overflow-hidden rounded-[30px]">
          <ProductArt product={p} sizes="(min-width:1024px) 55vw, 100vw" className="aspect-[3/2]" />
        </div>

        <div className="glass-strong flex flex-col rounded-[30px] p-6 text-ink sm:p-8">
          {p.brand && <p className="font-semibold text-muted">{p.brand}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-cool/12 px-2.5 py-1 text-cool">{KIND_LABEL[kind]}</span>
            {ton !== null && <span className="rounded-full bg-cool/12 px-2.5 py-1 text-cool">{ton} ton</span>}
            {star !== null && <span className="rounded-full bg-cool/12 px-2.5 py-1 text-cool">{star} star</span>}
          </div>
          <div className="mt-5">
            {p.price !== null ? (
              <>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tabular text-4xl font-extrabold">{formatInr(p.price)}</span>
                  <span className="text-muted">incl. GST</span>
                </p>
                {saving > 0 && (
                  <p className="tabular mt-1 text-sm">
                    <s className="text-muted">MRP {formatInr(p.mrp!)}</s> <span className="font-semibold text-cool">You save {formatInr(saving)}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-extrabold">Price on request</p>
            )}
            <p className={p.inStock ? 'mt-2 text-sm font-semibold text-cool' : 'mt-2 text-sm font-semibold text-heat'}>{p.inStock ? 'In stock' : 'Out of stock: ask us when it is back'}</p>
          </div>
          <AddToRequest className="mt-5" label={p.price === null ? 'Ask for a price' : 'Add to request'} line={{ type: 'PRODUCT', ref: p.id, name: p.name }} />
          <a href={`tel:${tel}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cool underline-offset-4 hover:underline">
            <Phone aria-hidden="true" size={16} /> Questions? Call us
          </a>
          {p.warranty && <p className="mt-5 text-sm"><span className="font-semibold">Warranty:</span> {p.warranty}</p>}
          <p className="mt-2 text-sm text-muted">Sold by {p.seller.name}</p>
        </div>
      </Container>

      <Container className="grid gap-6 pb-12 lg:grid-cols-2">
        <div className="space-y-6">
          {p.keyFeatures.length > 0 && (
            <section aria-labelledby="features" className="glass rounded-3xl p-6 text-ink">
              <h2 id="features" className="text-2xl">Key features</h2>
              <ul className="mt-3 space-y-2">
                {p.keyFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cool" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {shownSpecs.length > 0 && (
            <section aria-labelledby="specs" className="glass rounded-3xl p-6 text-ink">
              <h2 id="specs" className="text-2xl">Specifications</h2>
              <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                {shownSpecs.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {p.description && (
            <section aria-labelledby="about" className="glass rounded-3xl p-6 text-ink">
              <h2 id="about" className="text-2xl">About this AC</h2>
              <p className="mt-3 whitespace-pre-line text-muted">{p.description}</p>
            </section>
          )}
        </div>
        <div>
          <SellerDisclosure seller={p.seller} />
        </div>
      </Container>

      {more.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-2xl">More {KIND_LABEL[kind]}s</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
          </div>
        </Container>
      )}
    </>
  );
}
