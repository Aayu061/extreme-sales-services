'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { NewLine } from '@/lib/basket';
import { useBasket } from './use-basket';

/** "Add to request" button used on service, AMC and product cards. */
export function AddToRequest({
  line,
  className,
  label = 'Add to request',
  disabled = false,
}: {
  line: NewLine;
  className?: string;
  label?: string;
  disabled?: boolean;
}) {
  const { add } = useBasket();
  const [state, setState] = useState<'idle' | 'added' | 'full'>('idle');

  useEffect(() => {
    if (state !== 'added') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setState(add(line) === 'full' ? 'full' : 'added')}
        className={cn(buttonStyles({ size: 'sm' }), 'disabled:cursor-not-allowed disabled:opacity-50')}
      >
        {state === 'added' ? <Check aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
        {state === 'added' ? 'Added' : label}
      </button>
      <span aria-live="polite" className="text-sm">
        {state === 'added' && (
          <Link href="/book" className="font-semibold text-cool underline-offset-4 hover:underline">
            View request
          </Link>
        )}
        {state === 'full' && <span className="text-heat">Your request is full (30 items)</span>}
      </span>
    </div>
  );
}
