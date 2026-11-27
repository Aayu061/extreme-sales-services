'use client';

import { useActionState } from 'react';
import { Field, Input } from '@/components/ui/field';
import { buttonStyles } from '@/components/ui/button';
import { requestCode, signIn, type SignInState } from '@/app/(site)/account/actions';

/** Email -> 6-digit code -> signed in. Works without JavaScript too (plain form posts to server actions). */
export function SignInForm() {
  const [codeState, askForCode, asking] = useActionState<SignInState, FormData>(requestCode, { step: 'email', email: '' });
  const [signInState, checkCode, checking] = useActionState<SignInState, FormData>(signIn, { step: 'code', email: '' });
  const onCodeStep = codeState.step === 'code';
  const email = onCodeStep ? codeState.email : '';

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
        <form action={checkCode} className="mt-5 flex flex-col gap-4" noValidate>
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
                pattern="[0-9]{6}"
                maxLength={6}
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <button type="submit" disabled={checking} className={buttonStyles({ size: 'md' })}>
            {checking ? 'Checking…' : 'Sign in'}
          </button>
          <p className="text-sm text-muted">
            No email? Check spam, or{' '}
            <a href="/account" className="font-semibold text-cool underline-offset-4 hover:underline">
              start again
            </a>
            .
          </p>
        </form>
      )}
    </div>
  );
}
