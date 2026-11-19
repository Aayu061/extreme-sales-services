import type { Metadata } from 'next';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { AmcPlans } from '@/components/amc/amc-plans';
import { getCatalog } from '@/lib/data';

export const metadata: Metadata = {
  title: 'AMC plans for split and window ACs',
  description: 'Compare yearly AC maintenance plans (AMC) in Mumbai, Thane and Navi Mumbai. Prices per AC per year, GST included.',
  alternates: { canonical: '/amc' },
};

export default async function AmcPage() {
  const catalog = await getCatalog();
  return (
    <>
      <PageBanner
        title="AMC plans"
        intro="A yearly plan for regular service visits. Choose your AC to see its price."
        crumbs={[{ href: '/amc', label: 'AMC plans' }]}
      />
      <Container className="py-8 sm:py-12">
        <AmcPlans plans={catalog.amcPlans} />
      </Container>
    </>
  );
}
