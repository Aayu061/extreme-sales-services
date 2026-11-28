import Link from 'next/link';
import type { BusinessIdentity } from '@/lib/pys/types';
import { Container } from './container';

const heading = 'mb-2 font-bold text-ink';
const link = 'hover:text-ink hover:underline underline-offset-4';

/** Legal identity, contact and policies (Consumer Protection (E-Commerce) Rules 2020 disclosures). */
export function SiteFooter({ identity }: { identity: BusinessIdentity }) {
  const grievance = identity.grievanceOfficer;
  return (
    <footer className="mt-10 border-t border-line bg-surface">
      {/* Extra bottom space on phones so the floating Book / WhatsApp / Call buttons never cover the links. */}
      <Container className="grid gap-4 pt-10 pb-32 text-sm text-muted sm:grid-cols-2 md:pb-10 lg:grid-cols-4">
        <div className="glass rounded-[20px] p-5">
          <p className={heading}>{identity.legalName}</p>
          {identity.tradeName !== identity.legalName && <p>Trading as {identity.tradeName}</p>}
          <p>{identity.address}</p>
          {identity.gstin && <p className="tabular mt-1">GSTIN {identity.gstin}</p>}
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className={heading}>Contact</p>
          <p className="tabular">
            <a href={`tel:${identity.phone.replace(/[^+\d]/g, '')}`} className={link}>
              {identity.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${identity.email}`} className={link}>
              {identity.email}
            </a>
          </p>
          <p>{identity.hours}</p>
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className={heading}>Complaints</p>
          <p>Grievance officer{grievance.name ? `: ${grievance.name}` : ''}</p>
          {grievance.email && (
            <p>
              <a href={`mailto:${grievance.email}`} className={link}>
                {grievance.email}
              </a>
            </p>
          )}
          {grievance.phone && <p className="tabular">{grievance.phone}</p>}
        </div>
        <nav aria-label="Footer" className="glass rounded-[20px] p-5">
          <p className={heading}>More</p>
          <ul className="space-y-1">
            <li><Link href="/account" className={link}>My account</Link></li>
            <li><Link href="/track" className={link}>Track a request</Link></li>
            <li><Link href="/contact" className={link}>Contact us</Link></li>
            <li><Link href="/sell" className={link}>Sell on ESS</Link></li>
            <li><Link href="/legal/privacy" className={link}>Privacy notice</Link></li>
            <li><Link href="/legal/terms" className={link}>Terms</Link></li>
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
