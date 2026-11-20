import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsScreen } from '@/components/admin/products-view';

export const metadata: Metadata = { title: 'Products' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * /admin/products: ESS's ACs in shop order, with a search and a shown/hidden filter (?q=&show=,
 * read per request inside <Suspense>). Each can be edited, shown or hidden; new ones added.
 */
export default function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Products</h1>
      <p className="mt-2 max-w-3xl text-muted">
        The ACs in the website&apos;s shop. Add a new one, change its details and photo, or hide it from the shop without deleting it.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <p role="status" className="text-muted">
              Loading products…
            </p>
          }
        >
          <ProductsScreen searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
