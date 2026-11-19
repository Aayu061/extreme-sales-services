import Link from 'next/link';
import type { HeroCard } from '@/lib/season';
import { cn } from '@/lib/cn';

/** Bottom-right card in the hero: the offer published in ESS admin, or this month's tip. */
export function OfferCard({ card, className }: { card: HeroCard; className?: string }) {
  return (
    <aside aria-label={card.kind === 'offer' ? 'Offer' : 'This month'} className={cn('glass relative w-[330px] rounded-3xl p-[18px] text-ink', className)}>
      <span className="absolute -top-3 right-4 rounded-full bg-taxi px-3 py-1 text-[13px] font-extrabold text-taxi-ink">
        {card.kind === 'offer' ? 'Offer' : 'This month'}
      </span>
      <h2 className="text-xl">{card.title}</h2>
      {card.text && <p className="mt-1 text-sm text-muted">{card.text}</p>}
      {card.href && (
        <Link href={card.href} className="mt-3 inline-block text-sm font-bold text-cool underline-offset-4 hover:underline">
          {card.linkLabel}
        </Link>
      )}
    </aside>
  );
}
