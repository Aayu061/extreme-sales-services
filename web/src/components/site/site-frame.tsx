import { getSiteBasics, FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { FloatingContact } from './floating-contact';

/** The public site's frame: menu, page, footer and the floating Call / WhatsApp / Book buttons. */
export async function SiteFrame({ children }: { children: React.ReactNode }) {
  // Business details come from PYS (editable in ESS admin); the fallback keeps the frame complete
  // if PYS cannot be reached while this page is built.
  const { identity } = await getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO }));

  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter identity={identity} />
      <FloatingContact phone={identity.phone} whatsapp={identity.whatsapp} />
    </>
  );
}
