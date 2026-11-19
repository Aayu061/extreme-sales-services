import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { ShopBrowser } from '@/components/shop/shop-browser';
import { BillSaver } from '@/components/shop/bill-saver';
import { Skeleton } from '@/components/ui/skeleton';
import { getProducts } from '@/lib/data';

export const metadata: Metadata = {
  title: 'New ACs: split, window, cassette and tower',
  description: 'Buy new split, window, cassette and floor-standing ACs in Mumbai, Thane and Navi Mumbai. Prices include GST; the seller is shown on every AC.',
  alternates: { canonical: '/shop' },
};

function GridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-96 rounded-3xl" />
      ))}
    </div>
  );
}

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <>
      <PageBanner
        title="New ACs"
        intro="Prices include GST. Sold by Extreme Sales & Services unless shown otherwise."
        crumbs={[{ href: '/shop', label: 'Shop ACs' }]}
      />
      <Container className="py-8 sm:py-12">
        <Suspense fallback={<GridSkeleton />}>
          <ShopBrowser products={products} />
        </Suspense>
        <BillSaver />
      </Container>
    </>
  );
}
