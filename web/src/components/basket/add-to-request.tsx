'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { NewLine } from '@/lib/basket';
import { useBasket, useEnquiry } from './use-basket';

type State = 'idle' | 'added' | 'exists' | 'full';

function AddButton({
  line,
  className,
  label,
  disabled,
  add,
  viewHref,
  viewLabel,
}: {
  line: NewLine;
  className?: string;
  label: string;
  disabled: boolean;
  add: (l: NewLine) => 'added' | 'exists' | 'full';
  viewHref: string;
  viewLabel: string;
}) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state !== 'added' && state !== 'exists') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  const done = state === 'added' || state === 'exists';
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setState(add(line))}
        className={cn(buttonStyles({ size: 'sm' }), 'disabled:cursor-not-allowed disabled:opacity-50')}
      >
        {done ? <Check aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
        {done ? 'Added' : label}
      </button>
      <span aria-live="polite" className="text-sm">
        {state === 'exists' && <span className="mr-2 text-muted">Already added ·</span>}
        {done && (
          <Link href={viewHref} className="font-semibold text-cool underline-offset-4 hover:underline">
            {viewLabel}
          </Link>
        )}
        {state === 'full' && <span className="text-heat">This list is full (30 items)</span>}
      </span>
    </div>
  );
}

/** "Add to request" on service and AMC cards (booking basket). */
export function AddToRequest({ line, className, label = 'Add to request', disabled = false }: { line: NewLine; className?: string; label?: string; disabled?: boolean }) {
  const { add } = useBasket();
  return <AddButton line={line} className={className} label={label} disabled={disabled} add={add} viewHref="/book" viewLabel="View request" />;
}

/** "Add to enquiry" on new ACs: ACs are enquired about, not booked. */
export function AddToEnquiry({ line, className, label = 'Add to enquiry', disabled = false }: { line: NewLine; className?: string; label?: string; disabled?: boolean }) {
  const { add } = useEnquiry();
  return <AddButton line={line} className={className} label={label} disabled={disabled} add={add} viewHref="/enquiry" viewLabel="View enquiry" />;
}
