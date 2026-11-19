import type { Metadata } from 'next';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { SellerForm } from '@/components/forms/seller-form';

export const metadata: Metadata = {
  title: 'Sell on ESS',
  description: 'Selling ACs on Extreme Sales & Services is coming soon. Dealers and brands can register interest now.',
  alternates: { canonical: '/sell' },
};

export default function SellPage() {
  return (
    <>
      <PageBanner
        title="Sell on ESS"
        intro="Selling ACs on ESS is coming soon. Dealers and brands can register interest now and we'll contact you when it opens."
        crumbs={[{ href: '/sell', label: 'Sell on ESS' }]}
      />
      <Container className="max-w-[880px] py-8 sm:py-12">
        <section aria-labelledby="interest" className="glass-strong rounded-[30px] p-6 text-ink sm:p-8">
          <h2 id="interest" className="text-2xl">Register your interest</h2>
          <div className="mt-5">
            <SellerForm />
          </div>
        </section>
      </Container>
    </>
  );
}
