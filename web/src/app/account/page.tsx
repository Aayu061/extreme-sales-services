import type { Metadata } from 'next';
import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false },
  alternates: { canonical: '/account' },
};

export default function AccountPage() {
  return (
    <>
      <PageBanner title="Your account" crumbs={[{ href: '/account', label: 'Your account' }]} />
      <Container className="py-8 sm:py-12">
        <div className="glass max-w-2xl rounded-3xl p-6 text-ink sm:p-8">
          <h2 className="text-2xl">Customer login is coming soon</h2>
          <p className="mt-3 text-muted">
            Until then you can track any request with its tracking code and mobile number.
          </p>
          <Link href="/track" className={`${buttonStyles({ size: 'md' })} mt-5`}>
            Track a request
          </Link>
        </div>
      </Container>
    </>
  );
}
