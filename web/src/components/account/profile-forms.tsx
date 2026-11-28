'use client';

import { useActionState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Field, Textarea } from '@/components/ui/field';
import { buttonStyles } from '@/components/ui/button';
import { requestProfileChange, signOutAll, type PortalFormState } from '@/app/(site)/account/actions';

/** "Request a change": customers cannot edit their details; this sends a message to staff (5 a day at most). */
export function ChangeRequestForm() {
  const [state, send, sending] = useActionState<PortalFormState, FormData>(requestProfileChange, { status: 'idle' });
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // After a refused send, focus the box so screen readers read its error (aria-describedby) and the text is ready to fix.
  useEffect(() => {
    if (state.status === 'error') fieldRef.current?.focus();
  }, [state]);
  if (state.status === 'done') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-ink">
        <CheckCircle2 aria-hidden="true" size={22} className="mt-0.5 shrink-0 text-success" />
        <p>
          <span className="block font-semibold">Thank you. We have your request.</span>
          Our staff will update your details and may call you to check.
          {state.reference ? (
            <>
              {' '}
              Reference <span className="tabular font-semibold">{state.reference}</span>.
            </>
          ) : null}
        </p>
      </div>
    );
  }
  return (
    <form action={send} className="flex flex-col gap-4" noValidate>
      <Field label="What should we change?" required hint="For example a new phone number or address. 5 to 1000 characters." error={state.error}>
        {({ id, describedBy, invalid }) => (
          <Textarea
            ref={fieldRef}
            id={id}
            name="message"
            required
            minLength={5}
            maxLength={1000}
            defaultValue={state.value}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      <div>
        <button type="submit" disabled={sending} className={buttonStyles({ size: 'md' })}>
          {sending ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}

/** Ends the sessions on every device, including this one. */
export function SignOutAllForm() {
  const [state, send, sending] = useActionState<PortalFormState>(signOutAll, { status: 'idle' });
  return (
    <form action={send} className="flex flex-col gap-3">
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-heat-text">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={sending} className={buttonStyles({ size: 'md', variant: 'glass' })}>
          {sending ? 'Signing out…' : 'Sign out of all devices'}
        </button>
      </div>
    </form>
  );
}
