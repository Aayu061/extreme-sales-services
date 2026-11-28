'use client';

import { useActionState, useEffect, useState } from 'react';
import { Field, Input } from '@/components/ui/field';
import { buttonStyles } from '@/components/ui/button';
import { requestCode, signIn, type SignInState } from '@/app/(site)/account/actions';

/** Seconds before "Send a new code" can be used again (PYS sends at most 3 codes per 15 minutes). */
export const RESEND_WAIT_S = 30;

/**
 * Email -> 6-digit code -> signed in. The forms post to server actions, so they also work before the page's
 * JavaScript has loaded; "use a different email" is a plain link back to the empty form.
 */
export function SignInForm() {
  const [codeState, askForCode, asking] = useActionState<SignInState, FormData>(requestCode, { step: 'email', email: '' });
  const [signInState, checkCode, checking] = useActionState<SignInState, FormData>(signIn, { step: 'code', email: '' });
  const onCodeStep = codeState.step === 'code';
  const email = onCodeStep ? codeState.email : '';

  // Count down from the moment the last code was asked for.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!onCodeStep) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [onCodeStep]);
  const sentAt = codeState.sentAt ?? 0;
  const waitS = onCodeStep ? Math.min(RESEND_WAIT_S, Math.max(0, Math.ceil(RESEND_WAIT_S - (now - sentAt) / 1000))) : 0;

  return (
    <div className="glass max-w-xl rounded-3xl p-6 text-ink sm:p-8">
      <h2 className="text-2xl">Sign in to your account</h2>
      <p className="mt-2 text-muted">See your ACs, AMC visits and service history. We email you a one-time code: no password needed.</p>

      {!onCodeStep ? (
        <form action={askForCode} className="mt-5 flex flex-col gap-4" noValidate>
          <Field label="Email" required error={codeState.error} hint="The email address we have on your customer record.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="email" type="email" autoComplete="email" required defaultValue={codeState.email} aria-describedby={describedBy} aria-invalid={invalid} />
            )}
          </Field>
          <button type="submit" disabled={asking} className={buttonStyles({ size: 'md' })}>
            {asking ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <form action={checkCode} className="flex flex-col gap-4" noValidate>
            <p role="status" className="text-sm text-ink">
              {codeState.message}
            </p>
            <input type="hidden" name="email" value={email} />
            <Field label="6-digit code" required error={signInState.email === email ? signInState.error : undefined}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
            <button type="submit" disabled={checking} className={buttonStyles({ size: 'md' })}>
              {checking ? 'Checking…' : 'Sign in'}
            </button>
          </form>
          <form action={askForCode} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <input type="hidden" name="email" value={email} />
            <span>No email? Check spam, then</span>
            <button
              type="submit"
              disabled={asking || waitS > 0}
              className="min-h-11 font-semibold text-cool underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {asking ? 'Sending…' : waitS > 0 ? `send a new code (in ${waitS} s)` : 'send a new code'}
            </button>
            <span aria-hidden="true">·</span>
            <a href="/account" className="font-semibold text-cool underline-offset-4 hover:underline">
              use a different email
            </a>
          </form>
        </div>
      )}
    </div>
  );
}
