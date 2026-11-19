import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { BookFlow } from '@/components/book/book-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getCatalog, getSiteBasics } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Book a service',
  description: 'Send one request for AC services, AMC plans and new ACs. We call you to confirm.',
  robots: { index: false },
  alternates: { canonical: '/book' },
};

export default async function BookPage() {
  const [catalog, basics] = await Promise.all([
    getCatalog(),
    getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO })),
  ]);
  return (
    <>
      <PageBanner
        title="Your request"
        intro="Services and AMC plans in one request. We call you to confirm the visit and the price."
        crumbs={[{ href: '/book', label: 'Book' }]}
      />
      <Container className="max-w-[880px] py-8 sm:py-12">
        <Suspense fallback={<Skeleton className="h-96 rounded-[30px]" />}>
          <BookFlow catalog={{ services: catalog.services, amcPlans: catalog.amcPlans }} phone={basics.identity.phone} />
        </Suspense>
      </Container>
    </>
  );
}
