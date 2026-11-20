import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { PYS_APPROVAL_INBOX } from '@/lib/admin/requests';
import { cn } from '@/lib/cn';

/**
 * A link into PYS (where requests are approved). Opens in a new tab so the admin area stays
 * open; the accessible name starts with the visible words and says it opens a new tab.
 */
export function PysLink({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={PYS_APPROVAL_INBOX}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className={cn('inline-flex min-h-11 items-center gap-1 font-semibold text-cool underline-offset-4 hover:underline', className)}
    >
      {children}
      <ExternalLink aria-hidden="true" size={16} className="shrink-0" />
    </a>
  );
}

/** "We couldn't reach PYS…" with a way to load the page again. */
export function PysUnreachable({ retryHref }: { retryHref: string }) {
  return (
    <div role="alert" className="glass rounded-[24px] p-5 text-ink">
      <p className="font-semibold">We couldn&apos;t reach PYS. It may be waking up — try again in a minute.</p>
      {/* A full page load, so PYS is asked again even if this page was kept by the browser. */}
      <a href={retryHref} className={cn(buttonStyles({ variant: 'glass', size: 'sm' }), 'mt-4')}>
        Try again
      </a>
    </div>
  );
}
