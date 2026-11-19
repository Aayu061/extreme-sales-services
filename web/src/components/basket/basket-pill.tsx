'use client';

import Link from 'next/link';
import { AirVent, ShoppingBasket } from 'lucide-react';
import type { Basket } from '@/lib/basket';
import { useBasket, useEnquiry } from './use-basket';

function Pill({ basket, href, label, icon }: { basket: Basket; href: string; label: (n: number) => string; icon: React.ReactNode }) {
  const count = basket.lines.reduce((n, l) => n + l.quantity, 0);
  if (count === 0) return null;
  const text = label(count);
  return (
    <Link
      href={href}
      aria-label={text}
      title={text}
      className="pop-in relative inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-ink shadow-[inset_0_0_0_1px_var(--glass-line)] transition-colors hover:bg-white/25"
    >
      {icon}
      <span className="tabular absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-taxi px-1 text-xs font-bold text-taxi-ink">
        {count}
      </span>
    </Link>
  );
}

/** Menu pill for the booking basket (services + AMC); hidden while empty. */
export function BasketPill() {
  const { basket } = useBasket();
  return <Pill basket={basket} href="/book" label={(n) => `Your request: ${n} ${n === 1 ? 'item' : 'items'}`} icon={<ShoppingBasket aria-hidden="true" size={21} />} />;
}

/** Menu pill for the AC enquiry list; hidden while empty. */
export function EnquiryPill() {
  const { basket } = useEnquiry();
  return <Pill basket={basket} href="/enquiry" label={(n) => `Your AC enquiry: ${n} ${n === 1 ? 'AC' : 'ACs'}`} icon={<AirVent aria-hidden="true" size={21} />} />;
}
