import Link from 'next/link';
import { ProductArt } from '@/components/shop/product-art';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import type { AcTypeTile } from '@/lib/ac-kind';
import { formatInr } from '@/lib/format';
import type { Product } from '@/lib/pys/types';

/** New ACs for every space: four AC types with live "from" prices, then a few featured models. */
export function AcTypesSection({ tiles, featured }: { tiles: AcTypeTile[]; featured: Product[] }) {
  return (
    <section aria-labelledby="types-heading" className="reveal py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="types-heading" className="text-[clamp(30px,3.6vw,48px)]">
              New ACs for every space
            </h2>
            <p className="mt-2 max-w-[56ch] text-lg text-muted">Homes, shops and offices. Full price incl. GST, installation on request.</p>
          </div>
          <Link href="/shop" className={buttonStyles({ variant: 'glass' })}>
            See all ACs
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.kind}>
              <Link href={t.href} className="glass group flex h-full flex-col overflow-hidden rounded-3xl text-ink transition-transform duration-200 hover:-translate-y-1">
                <div aria-hidden="true">
                  <ProductArt product={{ name: t.kind, imageUrl: null }} sizes="25vw" className="aspect-[3/2]" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg">{t.label} AC</h3>
                  <p className="tabular mt-1 text-sm font-semibold text-muted">
                    {t.from !== null ? `From ${formatInr(t.from)} incl. GST` : 'See models'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {featured.length > 0 && (
          <>
            <h3 className="mt-14 text-2xl">Popular for homes</h3>
            <ul className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {featured.map((p) => (
                <li key={p.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                  <Link
                    href={`/shop/${encodeURIComponent(p.id)}`}
                    className="glass group flex h-full flex-col overflow-hidden rounded-3xl text-ink transition-transform duration-200 hover:-translate-y-1"
                  >
                    <ProductArt
                      product={p}
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 78vw"
                      className="aspect-4/3"
                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="flex flex-1 flex-col p-4">
                      {p.brand && <span className="text-sm text-muted">{p.brand}</span>}
                      <span className="mt-0.5 line-clamp-2 font-semibold">{p.name}</span>
                      <span className="tabular mt-auto pt-3 text-xl font-extrabold">
                        {formatInr(p.price!)}
                        {typeof p.mrp === 'number' && p.mrp > p.price! && (
                          <span className="ml-2 text-sm font-normal text-muted line-through">{formatInr(p.mrp)}</span>
                        )}
                      </span>
                      <span className="text-sm text-muted">incl. GST</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </section>
  );
}
