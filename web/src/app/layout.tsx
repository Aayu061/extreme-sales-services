import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { getSiteBasics, FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { FloatingContact } from '@/components/site/floating-contact';
import { THEME_SCRIPT } from '@/components/theme/theme-toggle';
import './globals.css';

/** One family, two widths: Archivo (body) and Archivo at 125% width (headings, hero numeral). */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const SITE_URL = (process.env.SITE_URL || 'https://extreme-sales-services.vercel.app').replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AC service, repair, AMC and new ACs in Mumbai | Extreme Sales & Services',
    template: '%s | Extreme Sales & Services',
  },
  description:
    'Book AC servicing, gas charging, repairs and installation, compare AMC plans and buy new ACs in Mumbai, Thane and Navi Mumbai. Prices shown with GST.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/ess-icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/brand/ess-apple-touch-icon-180.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Extreme Sales & Services',
    images: [{ url: '/brand/ess-og-image-1200x630.png', width: 1200, height: 630 }],
    locale: 'en_IN',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Business details come from PYS (editable in ESS admin); the fallback keeps the frame complete
  // if PYS cannot be reached while this page is built.
  const { identity } = await getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO }));

  return (
    // Light by default; the inline script applies a saved dark choice before the first paint.
    <html lang="en-IN" data-theme="light" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader phone={identity.phone} />
        <main id="main">{children}</main>
        <SiteFooter identity={identity} />
        <FloatingContact phone={identity.phone} whatsapp={identity.whatsapp} />
      </body>
    </html>
  );
}
