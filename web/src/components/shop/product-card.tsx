import { Star } from '@/components/site/footnote';
import Link from 'next/link';
import { AddToEnquiry } from '@/components/basket/add-to-request';
import { formatInr } from '@/lib/format';
import { starOf, tonnageOf } from '@/lib/shop';
import type { Product } from '@/lib/pys/types';
import { ProductArt } from './product-art';

/** One AC in the shop grid: picture, key facts, price incl. GST, who sells it, add to request. */
export function ProductCard({ product: p }: { product: Product }) {
  const ton = tonnageOf(p);
  const star = starOf(p);
  const saving = p.price !== null && p.mrp !== null && p.mrp > p.price;
  return (
    <article aria-label={p.name} className="glass group flex flex-col overflow-hidden rounded-3xl text-ink">
      <Link href={`/shop/${encodeURIComponent(p.id)}`} className="block" tabIndex={-1} aria-hidden="true">
        <ProductArt product={p} sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw" className="aspect-[3/2]" imageClassName="transition-transform duration-500 group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {p.brand && <p className="text-sm font-semibold text-muted">{p.brand}</p>}
        <h3 className="mt-1 text-lg leading-snug">
          <Link href={`/shop/${encodeURIComponent(p.id)}`} className="hover:text-cool hover:underline">
            {p.name}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
          {ton !== null && <span className="rounded-full bg-cool/12 px-2.5 py-1 text-cool">{ton} ton</span>}
          {star !== null && <span className="rounded-full bg-cool/12 px-2.5 py-1 text-cool">{star} star</span>}
          {!p.inStock && <span className="rounded-full bg-heat/15 px-2.5 py-1 text-heat">Out of stock</span>}
        </div>
        <div className="mt-auto pt-4">
          {p.price !== null ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="tabular text-2xl font-extrabold">{formatInr(p.price)}</span>
              <span className="text-sm text-muted">
                incl. GST
                <Star />
              </span>
              {saving && <s className="tabular text-sm text-muted">MRP {formatInr(p.mrp!)}</s>}
            </p>
          ) : (
            <p className="text-lg font-bold">Price on request</p>
          )}
          <p className="mt-1 text-xs text-muted">Sold by {p.seller.name}</p>
          <AddToEnquiry className="mt-3" label={p.price === null ? 'Ask for a price' : 'Add to enquiry'} line={{ type: 'PRODUCT', ref: p.id, name: p.name }} />
        </div>
      </div>
    </article>
  );
}
