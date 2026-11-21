'use client';

import Link from 'next/link';
import { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { sendReset, setNewPassword, signIn, type AuthFormState } from '@/app/admin/actions/auth';

const NOT_SET_UP_NOTE = "Sign-in isn't set up yet. Please ask the person who looks after the website to add the sign-in settings.";

export function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="glass-strong rounded-[30px] p-6 text-ink sm:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
      {children}
    </p>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-2xl bg-cool/10 px-4 py-3 text-sm font-semibold text-ink">
      {children}
    </p>
  );
}

/**
 * The Server Action is the form's own `action`, so even a tap before the page's JavaScript has
 * loaded is a POST to the server (typed details never land in the address bar). Once loaded, the
 * checks here run first and stop the submit when a field is wrong; the action checks again itself.
 */
function useCheckedAction(action: (prev: AuthFormState, fd: FormData) => Promise<AuthFormState>) {
  const [state, formAction, pending] = useActionState(action, {});
  const guard = (e: FormEvent<HTMLFormElement>, ok: boolean) => {
    if (!ok || pending) e.preventDefault();
  };
  return { state, pending, formAction, guard };
}

export function LoginForm({
  devSignIn,
  configured,
  next,
  expired = false,
}: {
  /** The test sign-in (a server component), passed in by the page only on a PC with the mock PYS. */
  devSignIn?: ReactNode;
  configured: boolean;
  next: string | null;
  /** The session ran out while the person was using the admin area (/admin/login?expired=1). */
  expired?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { state, pending, formAction, guard } = useCheckedAction(signIn);

  function submit(e: FormEvent<HTMLFormElement>) {
    const found = {
      email: email.trim() ? undefined : 'Enter your email address.',
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(found);
    guard(e, !found.email && !found.password);
  }

  return (
    <AuthCard title="Sign in to ESS admin" intro="Use the email and password of your Place Your Service account.">
      {expired && (
        <div className="mb-4">
          <Note>Please sign in again.</Note>
        </div>
      )}
      {configured ? (
        <form action={formAction} onSubmit={submit} noValidate className="flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Email" error={errors.email}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          <Field label="Password" error={errors.password}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="password" type="password" autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          {state.error && <Alert>{state.error}</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link href="/admin/reset" className="inline-flex min-h-11 items-center self-start text-cool underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </form>
      ) : (
        <Note>{NOT_SET_UP_NOTE}</Note>
      )}

      {devSignIn}
    </AuthCard>
  );
}

export function ResetRequestForm({ configured, expired }: { configured: boolean; expired: boolean }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const { state, pending, formAction, guard } = useCheckedAction(sendReset);

  function submit(e: FormEvent<HTMLFormElement>) {
    const found = email.trim() ? undefined : 'Enter your email address.';
    setError(found);
    guard(e, !found);
  }

  return (
    <AuthCard title="Reset your password" intro="We will email you a link to choose a new password.">
      {!configured ? (
        <Note>{NOT_SET_UP_NOTE}</Note>
      ) : state.message ? (
        <Note>{state.message} Open it on this device. It works once and only for a short time.</Note>
      ) : (
        <form action={formAction} onSubmit={submit} noValidate className="flex flex-col gap-4">
          {expired && <Alert>This link has expired or was already used. Ask for a new one below.</Alert>}
          <Field label="Email" error={error}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          {state.error && <Alert>{state.error}</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send me a link'}
          </Button>
        </form>
      )}
      <Link href="/admin/login" className="mt-4 inline-flex min-h-11 items-center text-cool underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </AuthCard>
  );
}

export function NewPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const { state, pending, formAction, guard } = useCheckedAction(setNewPassword);

  function submit(e: FormEvent<HTMLFormElement>) {
    const found = {
      password: password.length >= 10 ? undefined : 'Use at least 10 characters.',
      confirm: password.length >= 10 && confirm !== password ? 'This does not match. Type the same password twice.' : undefined,
    };
    setErrors(found);
    guard(e, !found.password && !found.confirm);
  }

  return (
    <form action={formAction} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="New password" hint="At least 10 characters." error={errors.password}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Field label="Type it again" error={errors.confirm}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="confirm" type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        )}
      </Field>
      {state.error && <Alert>{state.error}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}
