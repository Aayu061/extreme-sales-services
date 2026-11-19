'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeSwitch } from '@/components/theme/theme-switch';
import { BasketPill } from '@/components/basket/basket-pill';
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
/** The phone menu also lists Contact (on desktop it sits in the footer). */
const MENU = [...NAV, { href: '/contact', label: 'Contact' }];

/**
 * Glass pill menu. On the home page it floats over the hero photo; on other pages it stays at
 * the top of the screen. Below laptop width the page links move into a dropdown.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = pathname === '/';
  const active = (href: string) => (href === '/' ? home : pathname.startsWith(href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
        <div className="flex items-center gap-2">
          <BasketPill />
          <ThemeSwitch />
          <Link href="/book" className={cn(buttonStyles({ size: 'sm' }), 'max-[760px]:hidden')}>
            Book a service
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="page-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="neu-raised inline-flex size-11 items-center justify-center rounded-full text-ink min-[1101px]:hidden"
          >
            {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="page-menu" aria-label="Pages" className="glass-strong pop-in mt-2 rounded-[24px] p-2 text-ink min-[1101px]:hidden">
          <ul className="grid gap-1">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center rounded-2xl px-4 text-base font-semibold transition-colors hover:bg-white/20',
                    active(item.href) && 'bg-white/20 shadow-[inset_0_0_0_1px_var(--glass-line)]',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/book" onClick={() => setOpen(false)} className={cn(buttonStyles({ size: 'md' }), 'mt-2 w-full')}>
            Book a service
          </Link>
        </nav>
      )}
    </header>
  );
}
