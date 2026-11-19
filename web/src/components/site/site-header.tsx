'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitch } from '@/components/theme/theme-switch';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { Logo } from './logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/amc', label: 'AMC plans' },
  { href: '/shop', label: 'Shop ACs' },
  { href: '/track', label: 'Track' },
];

/**
 * Glass pill menu. On the home page it floats over the hero photo; on other pages it stays at
 * the top of the screen as you scroll.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === '/';
  const active = (href: string) => (href === '/' ? home : pathname.startsWith(href));

  return (
    <header className={cn('z-30 px-[clamp(12px,3vw,40px)] pt-[18px]', home ? 'absolute inset-x-0 top-0' : 'sticky top-0 pb-3')}>
      <div className="glass flex items-center justify-between gap-3.5 rounded-full py-2.5 pr-3 pl-[18px] text-ink max-[760px]:py-2 max-[760px]:pr-2 max-[760px]:pl-3">
        <Logo />
        <nav aria-label="Main" className="max-[1100px]:hidden">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active(item.href) ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full px-3.5 text-[15px] transition-colors hover:bg-white/15',
                    active(item.href) && 'bg-white/15 shadow-[inset_0_0_0_1px_var(--glass-line)]',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeSwitch />
          <Link href="/book" className={cn(buttonStyles({ size: 'sm' }), 'max-[760px]:px-3.5 max-[760px]:text-sm')}>
            Book a service
          </Link>
        </div>
      </div>
    </header>
  );
}
