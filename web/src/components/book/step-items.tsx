'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { PricedLine } from '@/lib/basket-pricing';
import type { AcType, LineAc } from '@/lib/basket';
import { formatInr, gstBreakupText } from '@/lib/format';

const AC_OPTIONS: ReadonlyArray<{ value: AcType | ''; label: string }> = [
  { value: '', label: 'AC type' },
  { value: 'SPLIT', label: 'Split' },
  { value: 'WINDOW', label: 'Window' },
  { value: 'CASSETTE', label: 'Cassette' },
  { value: 'TOWER', label: 'Floor-standing' },
  { value: 'UNKNOWN', label: 'Not sure' },
];
const SIZE_OPTIONS = [
  { value: '', label: 'Size' },
  { value: '0.75', label: '0.75 ton' },
  { value: '1', label: '1 ton' },
  { value: '1.5', label: '1.5 ton' },
  { value: '2', label: '2 ton' },
  { value: '2.5', label: '2.5 ton or more' },
];
const TYPE_LABEL = { SERVICE: 'Service', AMC: 'AMC plan', PRODUCT: 'New AC' } as const;
const selectClass = 'min-h-11 rounded-full border border-line bg-surface/85 px-3 text-sm text-ink';

/** Step 1: every line of the request with live prices, AC details, quantity and remove. */
export function StepItems({
  priced,
  lineErrors,
  onQty,
  onAc,
  onRemove,
}: {
  priced: PricedLine[];
  /** PYS errors per basket line, keyed by the line's key (so they stay on the right item). */
  lineErrors: Record<string, string>;
  onQty: (key: string, q: number) => void;
  onAc: (key: string, ac: LineAc | undefined) => void;
  onRemove: (key: string) => void;
}) {
  if (priced.length === 0) {
    return (
      <div className="text-center">
        <p className="text-xl font-extrabold">Your request is empty</p>
        <p className="mt-2 text-muted">Add a service, an AMC plan or a new AC.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/services" className="glass inline-flex min-h-12 items-center rounded-full px-5 font-semibold">
            Services
          </Link>
          <Link href="/amc" className="glass inline-flex min-h-12 items-center rounded-full px-5 font-semibold">
            AMC plans
          </Link>
          <Link href="/shop" className="glass inline-flex min-h-12 items-center rounded-full px-5 font-semibold">
            Shop ACs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {priced.map((p) => {
          const l = p.line;
          const name = p.status === 'ok' ? p.label : l.name;
          const error = lineErrors[l.key];
          return (
            <li key={l.key} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">{TYPE_LABEL[l.type]}</p>
                  <p className="font-bold">{name}</p>
                  {p.status === 'unavailable' ? (
                    <p className="mt-1 text-sm font-semibold text-heat">No longer available</p>
                  ) : p.unchecked ? (
                    <p className="mt-1 text-sm text-muted">Couldn&apos;t check this AC right now; we&apos;ll confirm it when we call.</p>
                  ) : (
                    <p className="tabular mt-1 text-sm">
                      {p.unit === null ? 'Price after inspection' : `${formatInr(p.unit)} each`}
                      {p.breakup && p.breakup.gst > 0 && <span className="block text-xs text-muted">{gstBreakupText(p.breakup)}</span>}
                      {p.unit !== null && l.quantity > 1 && <span className="text-muted"> · {formatInr(Math.round(p.unit * l.quantity * 100) / 100)}</span>}
                    </p>
                  )}
                  {error && <p className="mt-1 text-sm font-semibold text-heat">{error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(l.key)}
                  aria-label={`Remove ${name}`}
                  className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-heat/10 hover:text-heat"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
              {p.status === 'ok' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {l.type !== 'PRODUCT' && (
                    <>
                      <select
                        aria-label={`AC type for ${name}`}
                        className={selectClass}
                        value={l.ac?.type ?? ''}
                        onChange={(e) => onAc(l.key, { ...l.ac, type: (e.target.value || undefined) as AcType | undefined })}
                      >
                        {AC_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`AC size for ${name}`}
                        className={selectClass}
                        value={l.ac?.tonnage !== undefined ? String(l.ac.tonnage) : ''}
                        onChange={(e) => onAc(l.key, { ...l.ac, tonnage: e.target.value ? Number(e.target.value) : undefined })}
                      >
                        {SIZE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <div className="neu-inset ml-auto inline-flex items-center gap-1 rounded-full p-1">
                    <button type="button" aria-label={`Fewer ${name}`} disabled={l.quantity <= 1} onClick={() => onQty(l.key, l.quantity - 1)} className="neu-raised inline-flex size-9 items-center justify-center rounded-full disabled:opacity-40">
                      <Minus aria-hidden="true" size={16} />
                    </button>
                    <span className="tabular w-7 text-center font-bold" aria-label={`Quantity ${l.quantity}`}>
                      {l.quantity}
                    </span>
                    <button type="button" aria-label={`More ${name}`} disabled={l.quantity >= 20} onClick={() => onQty(l.key, l.quantity + 1)} className="neu-raised inline-flex size-9 items-center justify-center rounded-full disabled:opacity-40">
                      <Plus aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <span className="text-muted">Add something else:</span>
        <Link href="/services" className="text-cool hover:underline">
          Services
        </Link>
        <Link href="/amc" className="text-cool hover:underline">
          AMC plans
        </Link>
        <Link href="/shop" className="text-cool hover:underline">
          Shop ACs
        </Link>
      </p>
    </div>
  );
}
