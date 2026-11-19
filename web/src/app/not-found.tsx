import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageBanner
      title="This page does not exist"
      intro="The link may be old or mistyped. You can still book a service, compare AMC plans or track a request."
    >
      <div className="flex flex-wrap gap-3">
        <Link href="/book" className={buttonStyles({ size: 'md' })}>
          Book a service
        </Link>
        <Link href="/" className={buttonStyles({ variant: 'glass', size: 'md' })}>
          Go to the home page
        </Link>
      </div>
    </PageBanner>
  );
}
