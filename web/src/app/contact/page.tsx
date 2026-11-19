import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { PincodeCheck } from '@/components/home/pincode-check';
import { ContactForm } from '@/components/forms/contact-form';
import { JsonLd } from '@/components/site/json-ld';
import { serverEnv } from '@/lib/env';
import { localBusinessLd } from '@/lib/seo';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getServiceAreas, getSiteBasics } from '@/lib/data';

export async function generateMetadata(): Promise<Metadata> {
  const { identity } = await getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY }));
  return {
    title: 'Contact us',
    description: `Call, WhatsApp or write to Extreme Sales & Services, ${identity.address}. ${identity.hours}.`,
    alternates: { canonical: '/contact' },
  };
}

export default async function ContactPage() {
  const [{ identity }, areas] = await Promise.all([
    getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO })),
    getServiceAreas().catch(() => []),
  ]);
  const tel = identity.phone.replace(/[^+\d]/g, '');
  const wa = (identity.whatsapp ?? identity.phone).replace(/\D/g, '');
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${identity.legalName}, ${identity.address}`)}`;
  const row = 'flex gap-3';
  const icon = 'mt-0.5 shrink-0 text-cool';

  return (
    <>
      <JsonLd data={localBusinessLd(identity, serverEnv().SITE_URL)} />
      <PageBanner title="Contact us" intro="Call or WhatsApp for the quickest answer, or send us a message." crumbs={[{ href: '/contact', label: 'Contact' }]} />
      <Container className="grid gap-6 py-8 sm:py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section aria-labelledby="reach" className="glass rounded-3xl p-6 text-ink">
            <h2 id="reach" className="text-2xl">Reach us</h2>
            <ul className="mt-4 space-y-4">
              <li className={row}>
                <Phone aria-hidden="true" size={20} className={icon} />
                <a href={`tel:${tel}`} className="tabular font-semibold hover:text-cool">
                  {identity.phone}
                </a>
              </li>
              <li className={row}>
                <WhatsAppIcon className={`size-5 ${icon}`} />
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-cool">
                  WhatsApp us
                </a>
              </li>
              <li className={row}>
                <Mail aria-hidden="true" size={20} className={icon} />
                <a href={`mailto:${identity.email}`} className="break-all font-semibold hover:text-cool">
                  {identity.email}
                </a>
              </li>
              <li className={row}>
                <Clock aria-hidden="true" size={20} className={icon} />
                <span>{identity.hours}</span>
              </li>
              <li className={row}>
                <MapPin aria-hidden="true" size={20} className={icon} />
                <span>
                  {identity.address}
                  <br />
                  <a href={map} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cool hover:underline">
                    Open in Google Maps
                  </a>
                </span>
              </li>
            </ul>
          </section>
          <section aria-labelledby="areas" className="glass rounded-3xl p-6 text-ink">
            <h2 id="areas" className="text-2xl">Where we work</h2>
            {areas.length > 0 && <p className="mt-2 text-muted">{areas.map((a) => a.label).join(' · ')}</p>}
            <div className="mt-4">
              <PincodeCheck />
            </div>
          </section>
        </div>
        <section aria-labelledby="msg" className="glass-strong rounded-3xl p-6 text-ink sm:p-8">
          <h2 id="msg" className="text-2xl">Send us a message</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </section>
      </Container>
    </>
  );
}
