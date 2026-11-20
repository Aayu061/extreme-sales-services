import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ProductEditScreen } from '@/components/admin/products-view';

export const metadata: Metadata = { title: 'Edit product' };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * /admin/products/<id>: change one AC, with the shop card as a live preview. The product is read
 * per request inside <Suspense>; an unknown id shows the admin "not found".
 */
export default function AdminEditProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <>
      <Link href="/admin/products" className="inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline">
        All products
      </Link>
      <Suspense
        fallback={
          <p role="status" className="text-muted">
            Loading the product…
          </p>
        }
      >
        <ProductEditScreen params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
