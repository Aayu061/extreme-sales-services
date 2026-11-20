import { SiteFrame } from '@/components/site/site-frame';

/** Public pages: the site's menu, footer and floating contact buttons (the admin area has none). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
