import { cn } from '@/lib/cn';
import { formatInr, gstBreakupText } from '@/lib/format';
import type { PriceBreakup } from '@/lib/pys/types';

/**
 * A price is a fact: always GST-inclusive, tabular figures, with a tap-to-see breakup.
 * The breakup uses <details> so it works without JavaScript and with a keyboard.
 */
export function Price({
  price,
  prefix,
  mrp,
  className,
  size = 'md',
}: {
  price: PriceBreakup | number | null;
  /** e.g. "From" for services whose final price depends on the AC. */
  prefix?: string;
  /** Struck-through MRP for products, shown only when higher than the price. */
  mrp?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (price === null) {
    return <span className={cn('text-slate', className)}>Price after inspection</span>;
  }
  const total = typeof price === 'number' ? price : price.total;
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className="tabular inline-flex items-baseline gap-2">
        {prefix && <span className="text-sm text-slate">{prefix}</span>}
        <span className={cn('font-semibold text-navy', sizeClass)}>{formatInr(total)}</span>
        {typeof mrp === 'number' && mrp > total && (
          <span className="text-sm text-slate line-through" aria-label={`MRP ${formatInr(mrp)}`}>
            {formatInr(mrp)}
          </span>
        )}
      </span>
      {typeof price === 'number' ? (
        <span className="text-sm text-slate">incl. GST</span>
      ) : (
        <details className="group text-sm text-slate">
          <summary className="cursor-pointer list-none underline decoration-dotted underline-offset-4 hover:text-navy">
            incl. GST (see breakup)
          </summary>
          <span className="tabular mt-1 block">{gstBreakupText(price)}</span>
        </details>
      )}
    </span>
  );
}
