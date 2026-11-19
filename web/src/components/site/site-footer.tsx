import Link from 'next/link';
import type { BusinessIdentity } from '@/lib/pys/types';
import { Container } from './container';

/** Legal identity, contact and policies (Consumer Protection (E-Commerce) Rules 2020 disclosures). */
export function SiteFooter({ identity }: { identity: BusinessIdentity }) {
  const grievance = identity.grievanceOfficer;
  return (
    <footer className="mt-10 border-t border-line bg-paper">
      {/* Extra bottom space on phones so the floating Call / WhatsApp buttons never cover the links. */}
      <Container className="grid gap-8 pt-10 pb-28 sm:pb-10 text-sm text-slate sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <p className="font-semibold text-navy">{identity.legalName}</p>
          {identity.tradeName !== identity.legalName && <p>Trading as {identity.tradeName}</p>}
          <p>{identity.address}</p>
          {identity.gstin && <p className="tabular">GSTIN {identity.gstin}</p>}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-navy">Contact</p>
          <p className="tabular">
            <a href={`tel:${identity.phone.replace(/[^+\d]/g, '')}`} className="hover:text-navy">
              {identity.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${identity.email}`} className="hover:text-navy">
              {identity.email}
            </a>
          </p>
          <p>{identity.hours}</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-navy">Complaints</p>
          <p>Grievance officer{grievance.name ? `: ${grievance.name}` : ''}</p>
          {grievance.email && (
            <p>
              <a href={`mailto:${grievance.email}`} className="hover:text-navy">
                {grievance.email}
              </a>
            </p>
          )}
          {grievance.phone && <p className="tabular">{grievance.phone}</p>}
        </div>
        <nav aria-label="Footer" className="space-y-1">
          <p className="font-semibold text-navy">More</p>
          <ul className="space-y-1">
            <li><Link href="/track" className="hover:text-navy">Track a request</Link></li>
            <li><Link href="/contact" className="hover:text-navy">Contact us</Link></li>
            <li><Link href="/sell" className="hover:text-navy">Sell on ESS</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-navy">Privacy notice</Link></li>
            <li><Link href="/legal/terms" className="hover:text-navy">Terms</Link></li>
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
