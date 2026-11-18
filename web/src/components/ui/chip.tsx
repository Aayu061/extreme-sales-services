'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * Problem / filter chip: a toggle button (aria-pressed). Selected chips use the cyan accent;
 * the "problem" tone uses copper, the heat signal, for symptoms like "Not cooling".
 */
export function Chip({
  selected = false,
  tone = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { selected?: boolean; tone?: 'default' | 'problem' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-base transition-colors duration-150',
        selected
          ? 'border-cyan bg-cyan-wash font-semibold text-navy'
          : tone === 'problem'
            ? 'border-line bg-paper text-navy hover:border-copper hover:bg-copper-wash'
            : 'border-line bg-paper text-navy hover:border-cyan',
        className,
      )}
      {...props}
    />
  );
}
