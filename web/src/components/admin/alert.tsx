import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * S07: the one message box for admin screens. "problem" is announced at once (role="alert") and uses the error
 * text colour that meets WCAG AA (--heat-text); "done" is a quiet confirmation (no role: wrap it in a live region
 * when it must be announced). Extra props (ref, tabIndex, id) pass through, e.g. to move focus to the message.
 */
export function Alert({ tone = 'problem', className, children, ...rest }: { tone?: 'problem' | 'done' } & ComponentProps<'p'>) {
  return (
    <p
      role={tone === 'problem' ? 'alert' : undefined}
      className={cn(
        'rounded-2xl px-4 py-3 text-sm font-semibold',
        tone === 'problem' ? 'bg-heat/10 text-heat-text' : 'bg-cool/10 text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}
