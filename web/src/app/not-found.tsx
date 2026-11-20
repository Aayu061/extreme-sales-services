import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { SiteFrame } from '@/components/site/site-frame';
import { buttonStyles } from '@/components/ui/button';

/** Any unknown address. Rendered outside the (site) group, so it brings the site's frame itself. */
export default function NotFound() {
  return (
    <SiteFrame>
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
    </SiteFrame>
  );
}
