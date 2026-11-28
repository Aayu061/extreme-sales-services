'use client';

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Field, Textarea } from '@/components/ui/field';
import { buttonStyles } from '@/components/ui/button';
import { renewAmc, type PortalFormState } from '@/app/(site)/account/actions';

/** "Renew this AMC": sends a renewal request to staff (no online payment). Shows the reference when sent. */
export function RenewForm({ contractId, contractNumber }: { contractId: string; contractNumber: string }) {
  const [state, send, sending] = useActionState<PortalFormState, FormData>(renewAmc, { status: 'idle' });

  if (state.status === 'done') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-ink">
        <CheckCircle2 aria-hidden="true" size={22} className="mt-0.5 shrink-0 text-success" />
        <p>
          <span className="block font-semibold">{state.already ? 'You have already asked to renew this AMC.' : 'Renewal request sent.'}</span>
          {state.already ? 'Your earlier request is still open. ' : null}
          We will call you to confirm the renewal of {contractNumber}
          {state.reference ? (
            <>
              {' '}
              (reference <span className="tabular font-semibold">{state.reference}</span>)
            </>
          ) : null}
          . Nothing is charged online.
        </p>
      </div>
    );
  }

  return (
    <form action={send} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="contractId" value={contractId} />
      <Field label="Anything we should know? (optional)" hint="For example a change of plan or a good time to call." error={state.error}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="note" maxLength={500} defaultValue={state.value} aria-describedby={describedBy} aria-invalid={invalid || undefined} />
        )}
      </Field>
      <div>
        <button type="submit" disabled={sending} className={buttonStyles({ size: 'md' })}>
          {sending ? 'Sending…' : 'Ask to renew this AMC'}
        </button>
      </div>
    </form>
  );
}
