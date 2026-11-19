import Link from 'next/link';
import { Phone } from 'lucide-react';
import { Container } from '@/components/site/container';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { buttonStyles } from '@/components/ui/button';
import type { BusinessIdentity } from '@/lib/pys/types';
import { PincodeCheck } from './pincode-check';

/** Where we work and how to reach us, with a pincode check and the closing Book button. */
export function ContactArea({ identity }: { identity: BusinessIdentity }) {
  const tel = identity.phone.replace(/[^+\d]/g, '');
  const wa = (identity.whatsapp ?? identity.phone).replace(/\D/g, '');
  return (
    <section aria-labelledby="contact-heading" className="reveal pt-4 pb-16 sm:pb-20">
      <Container className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass rounded-[30px] p-6 text-ink sm:p-10">
          <h2 id="contact-heading" className="text-[clamp(28px,3.2vw,42px)]">
            Do we cover your area?
          </h2>
          <p className="mt-2 mb-6 text-lg text-muted">Mumbai, Thane and Navi Mumbai. Check your pincode.</p>
          <PincodeCheck />
        </div>
        <div className="glass flex flex-col rounded-[30px] p-6 text-ink sm:p-10">
          <h2 className="text-[clamp(24px,2.6vw,34px)]">Talk to us</h2>
          <dl className="mt-4 space-y-3 text-muted">
            <div>
              <dt className="text-sm font-semibold text-ink">Hours</dt>
              <dd>{identity.hours}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-ink">Address</dt>
              <dd>{identity.address}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`tel:${tel}`} className={buttonStyles({ variant: 'glass' })}>
              <Phone aria-hidden="true" size={18} />
              {identity.phone}
            </a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: 'glass' })}>
              <WhatsAppIcon size={18} />
              WhatsApp
            </a>
          </div>
          <div className="mt-auto pt-8">
            <Link href="/book" className={buttonStyles({ size: 'lg' })}>
              Book a service
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
