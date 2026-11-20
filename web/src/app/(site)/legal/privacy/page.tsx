import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How Extreme Sales & Services uses the details you share on this website, and your rights.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
