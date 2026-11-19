import { basketTotals, type PricedLine } from '@/lib/basket-pricing';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';

/**
 * Payment breakdown for the booking basket: before GST, GST by rate, total incl. GST, and how
 * many items are priced after inspection. No online payment: the customer pays after the work.
 */
export function BasketSummary({ priced, compact = false }: { priced: PricedLine[]; compact?: boolean }) {
  const t = basketTotals(priced);
  const row = 'flex items-baseline justify-between gap-3';
  return (
    <section aria-label="Payment breakdown" className={cn('mt-5 rounded-2xl border border-line bg-surface/60 p-4', compact && 'text-sm')}>
      {t.known > 0 ? (
        <dl className="tabular space-y-1.5">
          <div className={row}>
            <dt className="text-muted">Before GST</dt>
            <dd>{formatInr(t.base)}</dd>
          </div>
          {t.gstByRate.map((g) => (
            <div key={g.rate} className={row}>
              <dt className="text-muted">{`GST ${g.rate}%`}</dt>
              <dd>{formatInr(g.gst)}</dd>
            </div>
          ))}
          <div className={cn(row, 'border-t border-line pt-2')}>
            <dt className="font-semibold">Total incl. GST</dt>
            <dd className={cn('font-extrabold', compact ? 'text-lg' : 'text-2xl')}>{formatInr(t.known)}</dd>
          </div>
        </dl>
      ) : (
        <p className="font-bold">Price after inspection</p>
      )}
      {t.unpricedCount > 0 && t.known > 0 && (
        <p className="mt-2 text-sm text-muted">
          {t.unpricedCount === 1 ? '1 item is' : `${t.unpricedCount} items are`} priced after inspection (not included). We tell you the price before any work.
        </p>
      )}
      {t.unavailable > 0 && <p className="mt-2 text-sm font-semibold text-heat">Remove items that are no longer available to continue.</p>}
      <p className="mt-2 text-sm text-muted">You pay after the work is done.</p>
    </section>
  );
}
