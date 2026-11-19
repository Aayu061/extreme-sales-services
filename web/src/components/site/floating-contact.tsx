'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { WhatsAppIcon } from './whatsapp-icon';

/**
 * Always one tap away: WhatsApp and Call (bottom right), and on phones a yellow Book pill
 * (bottom left) that appears once the hero's own Book button has scrolled out of view. On phones
 * the WhatsApp/Call pair waits for that too, so it never covers the hero's problem dock.
 */
export function FloatingContact({ phone, whatsapp }: { phone: string; whatsapp: string | null }) {
  const pathname = usePathname();
  // Only the home page has the hero's own Book button; elsewhere the pill shows at once.
  const [heroBook, setHeroBook] = useState<{ path: string; visible: boolean } | null>(null);
  const tel = phone.replace(/[^+\d]/g, '');
  const wa = (whatsapp ?? phone).replace(/\D/g, '');
  const text = encodeURIComponent('Hello Extreme Sales & Services, I need help with my AC.');

  useEffect(() => {
    const target = document.getElementById('hero-book');
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setHeroBook({ path: pathname, visible: entry.isIntersecting }));
    io.observe(target);
    return () => io.disconnect();
  }, [pathname]);

  const heroBookOffScreen = heroBook?.path === pathname && !heroBook.visible;
  const showBook = pathname !== '/book' && (pathname !== '/' || heroBookOffScreen);

  return (
    <>
      {showBook && (
        <Link
          href="/book"
          data-testid="floating-book"
          className={cn(buttonStyles({ size: 'md' }), 'pop-in fixed bottom-4 left-4 z-40 md:hidden')}
        >
          Book a service
        </Link>
      )}
      {/* On phones the hero has its own buttons, so these wait until it scrolls away (no overlap with the dock). */}
      <div className={cn('fixed right-4 bottom-4 z-40 flex-col gap-3 sm:right-6 sm:bottom-6 md:flex', pathname === '/' && !heroBookOffScreen ? 'hidden' : 'flex')}>
        <a
          href={`https://wa.me/${wa}?text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_-6px_rgb(8_60_30/0.5)] transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <WhatsAppIcon size={28} />
        </a>
        <a
          href={`tel:${tel}`}
          aria-label={`Call us on ${phone}`}
          className="glass-strong inline-flex size-14 items-center justify-center rounded-full text-ink transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <Phone aria-hidden="true" size={24} />
        </a>
      </div>
    </>
  );
}
