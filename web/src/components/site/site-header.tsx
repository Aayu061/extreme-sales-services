import Link from 'next/link';
import { Phone } from 'lucide-react';
import { Container } from './container';
import { Logo } from './logo';

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/amc', label: 'AMC plans' },
  { href: '/shop', label: 'Shop ACs' },
  { href: '/track', label: 'Track' },
];

export function SiteHeader({ phone }: { phone: string }) {
  return (
    <header className="border-b border-line bg-paper">
      <Container className="flex min-h-18 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Logo />
        <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-base">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-navy hover:text-deep-cyan">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <a
          href={`tel:${phone.replace(/[^+\d]/g, '')}`}
          className="tabular inline-flex min-h-11 items-center gap-2 font-semibold text-navy hover:text-deep-cyan"
        >
          <Phone aria-hidden="true" size={18} />
          {phone}
        </a>
      </Container>
    </header>
  );
}
