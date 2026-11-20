'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setShown, type ProductActionState } from '@/app/admin/actions/products';
import { PRODUCT_MESSAGES, editHref } from '@/lib/admin/product-form';
import type { AdminProduct } from '@/lib/admin/types';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';
import { PendingButton } from './pending-button';

const linkStyles = 'inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline';

function ShownBadge({ shown }: { shown: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold whitespace-nowrap',
        shown ? 'border-cool/40 bg-cool/12 text-cool' : 'border-heat/40 bg-heat/12 text-heat',
      )}
    >
      {shown ? 'Shown' : 'Hidden'}
    </span>
  );
}

/** Small label in front of a value, only on phones (the table header says it on wide screens). */
function CellLabel({ children }: { children: string }) {
  return <span className="mr-2 text-sm text-muted md:hidden">{children}</span>;
}

/**
 * One AC: name, price, shown or hidden, and Edit / Show / Hide. Show and Hide take effect at once
 * (no confirm: either can be undone with one more click) and call PYS once per press.
 */
function ProductRow({ product: p, onDone }: { product: AdminProduct; onDone: (text: string) => void }) {
  const router = useRouter();
  // Follows the list after a refresh; changes straight away after a successful press.
  const [seen, setSeen] = useState(p.isPublished);
  const [shown, setShownNow] = useState(p.isPublished);
  if (seen !== p.isPublished) {
    setSeen(p.isPublished);
    setShownNow(p.isPublished);
  }
  const [busy, startBusy] = useTransition();
  const inFlight = useRef(false);
  const [note, setNote] = useState<{ tone: 'done' | 'problem'; text: string } | null>(null);

  function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    const next = !shown;
    startBusy(async () => {
      let state: ProductActionState;
      try {
        state = await setShown(p.id, next);
      } catch {
        state = { error: PRODUCT_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      if (state.authError) {
        setNote({ tone: 'problem', text: PRODUCT_MESSAGES.signIn });
        const back = `${window.location.pathname}${window.location.search}`;
        router.replace(`/admin/login?${new URLSearchParams({ expired: '1', next: back })}`);
      } else if (state.forbidden) {
        setNote({ tone: 'problem', text: PRODUCT_MESSAGES.forbidden });
        router.replace('/admin/no-access');
      } else if (state.ok) {
        setShownNow(next);
        setNote(null);
        // Said above the list: with a shown/hidden filter on, this row leaves the list on refresh.
        onDone(next ? `${p.name} is shown on the website.` : `${p.name} is hidden from the website.`);
        router.refresh();
      } else {
        setNote({ tone: 'problem', text: state.error ?? PRODUCT_MESSAGES.unreachable });
        if (state.notFound) router.refresh();
      }
    });
  }

  return (
    <tr className="border-line max-md:mb-3 max-md:block max-md:rounded-[24px] max-md:border max-md:bg-surface/85 max-md:p-4 md:border-t">
      <td className="align-middle max-md:block md:px-4 md:py-3">
        <Link href={editHref(p.id)} className="font-semibold break-words text-ink underline-offset-4 hover:text-cool hover:underline">
          {p.name}
        </Link>
        <p className="text-sm break-words text-muted">{[p.brand, p.modelNumber].filter(Boolean).join(' · ') || p.id}</p>
      </td>
      <td className="align-middle whitespace-nowrap max-md:mt-2 max-md:block md:px-4 md:py-3">
        <CellLabel>Price</CellLabel>
        {p.price !== null ? <span className="tabular-nums">{formatInr(p.price)}</span> : <span>Price on request</span>}
      </td>
      <td className="align-middle max-md:mt-2 max-md:block md:px-4 md:py-3">
        <CellLabel>On the website</CellLabel>
        <ShownBadge shown={shown} />
      </td>
      <td className="align-middle max-md:mt-2 max-md:block md:px-4 md:py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* The accessible names start with the visible word and say which AC. */}
          <Link href={editHref(p.id)} aria-label={`Edit ${p.name}`} className={linkStyles}>
            Edit
          </Link>
          <PendingButton
            type="button"
            variant="glass"
            size="sm"
            pending={busy}
            pendingLabel="Saving…"
            aria-label={busy ? undefined : `${shown ? 'Hide' : 'Show'} ${p.name}`}
            onClick={toggle}
          >
            {shown ? 'Hide' : 'Show'}
          </PendingButton>
        </div>
        {note && (
          <p role={note.tone === 'done' ? 'status' : 'alert'} className={cn('mt-2 text-sm font-semibold', note.tone === 'done' ? 'text-cool' : 'text-heat')}>
            {note.text}
          </p>
        )}
      </td>
    </tr>
  );
}

/**
 * The products, in shop order. One table: rows on wide screens, stacked cards on phones (each value
 * then has its own small label), so nothing scrolls sideways.
 *
 * "Shown / hidden" notices appear above the list, because with a filter on the row leaves the list
 * when it refreshes; keyboard focus then moves to the notice. `empty` is shown when no product is
 * left, so the notice stays on screen even then.
 */
export function ProductsTable({ products, filtered = false, empty }: { products: readonly AdminProduct[]; filtered?: boolean; empty?: ReactNode }) {
  const [done, setDone] = useState<string | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  function onDone(text: string) {
    setDone(text);
    if (filtered) requestAnimationFrame(() => noticeRef.current?.focus());
  }
  return (
    <div className="flex flex-col gap-3">
      <p ref={noticeRef} tabIndex={-1} role="status" className={cn('font-semibold text-cool outline-none focus-visible:ring-3 focus-visible:ring-cool', !done && 'sr-only')}>
        {done}
      </p>
      {products.length === 0 ? (
        empty
      ) : (
        <ProductList products={products} onDone={onDone} />
      )}
    </div>
  );
}

function ProductList({ products, onDone }: { products: readonly AdminProduct[]; onDone: (text: string) => void }) {
  return (
    <div className="glass rounded-[24px] max-md:contents">
      <table className="w-full text-left text-ink max-md:block">
        <thead className="max-md:sr-only">
          <tr className="text-sm text-muted">
            <th scope="col" className="px-4 py-3 font-semibold">
              AC
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Price (incl. GST)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              On the website
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} onDone={onDone} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
