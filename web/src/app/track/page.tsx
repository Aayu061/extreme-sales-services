import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { TrackForm, TrackFromLink } from '@/components/track/track-form';

export const metadata: Metadata = {
  title: 'Track your request',
  description: 'Check the progress of your AC service request with your tracking code and mobile number.',
  alternates: { canonical: '/track' },
};

export default function TrackPage() {
  return (
    <>
      <PageBanner
        title="Track your request"
        intro="Use the tracking code from your confirmation and the mobile number you gave us."
        crumbs={[{ href: '/track', label: 'Track' }]}
      />
      <Container className="max-w-[880px] py-8 sm:py-12">
        <Suspense fallback={<TrackForm initialCode="" />}>
          <TrackFromLink />
        </Suspense>
      </Container>
    </>
  );
}
