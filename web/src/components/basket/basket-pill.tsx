'use client';

import Link from 'next/link';
import { ShoppingBasket } from 'lucide-react';
import { useBasket } from './use-basket';

/** Menu pill showing how many things are in the customer's request; hidden while it is empty. */
export function BasketPill() {
  const { basket } = useBasket();
  const count = basket.lines.reduce((n, l) => n + l.quantity, 0);
  if (count === 0) return null;
  const label = `Your request: ${count} ${count === 1 ? 'item' : 'items'}`;
  return (
    <Link
      href="/book"
      aria-label={label}
      title={label}
      className="pop-in relative inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-ink shadow-[inset_0_0_0_1px_var(--glass-line)] transition-colors hover:bg-white/25"
    >
      <ShoppingBasket aria-hidden="true" size={21} />
      <span className="tabular absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-taxi px-1 text-xs font-bold text-taxi-ink">
        {count}
      </span>
    </Link>
  );
}
