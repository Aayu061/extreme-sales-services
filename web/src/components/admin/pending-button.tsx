'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type PendingButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  children: ReactNode;
  /** Shown instead of `children` while the action runs, e.g. "Sending…". */
  pendingLabel: ReactNode;
  /** Whether the action is running. Leave out inside a <form> to use that form's own status. */
  pending?: boolean;
};

/**
 * A button that cannot be pressed again while its action runs: it is disabled, says what is
 * happening, and tells screen readers it is busy. (Callers still guard their own submit, because a
 * second click can land before React has re-rendered the button.)
 */
export function PendingButton({ pending, pendingLabel, children, disabled, type = 'submit', ...props }: PendingButtonProps) {
  const form = useFormStatus();
  const busy = pending ?? form.pending;
  return (
    <Button type={type} disabled={busy || disabled} aria-busy={busy || undefined} {...props}>
      {busy ? pendingLabel : children}
    </Button>
  );
}
