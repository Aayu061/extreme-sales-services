import Link from 'next/link';
import { ProductArt } from '@/components/shop/product-art';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import type { AcTypeTile } from '@/lib/ac-kind';
import { formatInr } from '@/lib/format';

const USE: Record<AcTypeTile['kind'], string> = {
  split: 'Quiet cooling for bedrooms and living rooms.',
  window: 'One unit that fits a window opening.',
  cassette: 'Fitted in the ceiling, for offices and shops.',
  tower: 'High capacity for halls and showrooms.',
};

/** New ACs for every space: the four AC types with live "from" prices; the models themselves live on /shop. */
export function AcTypesSection({ tiles }: { tiles: AcTypeTile[] }) {
  return (
    <section aria-labelledby="types-heading" className="reveal py-8 sm:py-12">
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

        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.kind}>
              <Link href={t.href} className="glass group flex h-full flex-col overflow-hidden rounded-3xl text-ink transition-transform duration-200 hover:-translate-y-1">
                <div aria-hidden="true">
                  <ProductArt product={{ name: t.kind, imageUrl: null }} sizes="25vw" className="aspect-[3/2]" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg">{t.label} AC</h3>
                  <p className="mt-1 text-sm text-muted">{USE[t.kind]}</p>
                  <p className="tabular mt-auto pt-3 font-bold">
                    {t.from !== null ? `From ${formatInr(t.from)} incl. GST` : 'See models'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-muted">
          Every AC shows its full price incl. GST, the seller and the warranty on its own page. Installation and an AMC can be added to the same request.
        </p>
      </Container>
    </section>
  );
}
