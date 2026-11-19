import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { EnquiryFlow } from '@/components/enquiry/enquiry-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getProducts, getSiteBasics } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Your AC enquiry',
  description: 'Ask for prices on several new ACs in one enquiry. The seller confirms the final price and stock.',
  robots: { index: false },
  alternates: { canonical: '/enquiry' },
};

export default async function EnquiryPage() {
  const [products, basics] = await Promise.all([
    getProducts()
      .then((list) => ({ list, known: true }))
      .catch(() => ({ list: [], known: false })),
    getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO })),
  ]);
  return (
    <>
      <PageBanner
        title="Your AC enquiry"
        intro="Ask about several ACs at once. We check your enquiry, then the seller sends you a price."
        crumbs={[{ href: '/shop', label: 'Shop ACs' }, { href: '/enquiry', label: 'Enquiry' }]}
      />
      <Container className="max-w-[880px] py-8 sm:py-12">
        <Suspense fallback={<Skeleton className="h-96 rounded-[30px]" />}>
          <EnquiryFlow products={products.list} productsKnown={products.known} phone={basics.identity.phone} />
        </Suspense>
      </Container>
    </>
  );
}
