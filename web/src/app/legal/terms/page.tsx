import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms for AC service requests, AMC plans and new AC enquiries made on this website.',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
