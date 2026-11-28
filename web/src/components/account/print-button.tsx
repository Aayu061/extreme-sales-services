'use client';

import { Printer } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';

/** The browser's own print dialog (laid out for A4 by the print styles); "Save as PDF" is one of its printers. */
export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`no-print ${buttonStyles({ size: 'md', variant: 'glass' })}`}>
      <Printer aria-hidden="true" size={18} />
      {label}
    </button>
  );
}
