import Link from 'next/link';
import { Phone } from 'lucide-react';
import { ThemeSwitch } from '@/components/theme/theme-switch';
import { ButtonLink } from '@/components/ui/button';
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
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <Container className="flex min-h-18 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
        <Logo />
        <nav aria-label="Main" className="order-3 w-full lg:order-none lg:w-auto">
          <ul className="-mx-3 flex gap-x-1 overflow-x-auto text-base">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 whitespace-nowrap text-navy transition-colors hover:bg-cyan-wash hover:text-deep-cyan"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <a
            href={`tel:${phone.replace(/[^+\d]/g, '')}`}
            className="tabular hidden min-h-11 items-center gap-2 font-semibold text-navy hover:text-deep-cyan md:inline-flex"
          >
            <Phone aria-hidden="true" size={18} />
            {phone}
          </a>
          <ThemeSwitch />
          <ButtonLink href="/book" size="sm" className="hidden sm:inline-flex">
            Book a service
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
