import { cn } from '@/lib/cn';
import type { CustomerStatus } from '@/lib/pys/types';

/** The customer-facing request statuses come from PYS; the site only colours them. */
const TONE: Record<CustomerStatus['tone'], string> = {
  neutral: 'bg-frost text-navy border-line',
  info: 'bg-cyan-wash text-navy border-cyan/40',
  progress: 'bg-cyan-wash text-navy border-cyan',
  success: 'bg-success/10 text-success border-success/40',
  warning: 'bg-warning/10 text-[#7a4f0f] border-warning/40 dark:text-warning',
  danger: 'bg-danger/10 text-danger border-danger/40',
};

export function StatusBadge({ status, className }: { status: Pick<CustomerStatus, 'label' | 'tone'>; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold', TONE[status.tone], className)}>
      {status.label}
    </span>
  );
}
