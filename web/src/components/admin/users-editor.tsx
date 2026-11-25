'use client';

import { useActionState, useLayoutEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { grantUserRole, removeUserRole, type UserActionState } from '@/app/admin/actions/users';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { AdminUser, EssRole } from '@/lib/admin/types';
import { ROLE_LABELS, USER_MESSAGES, checkGrant, isOwnAdminRow, isOwnRow, personName, type GrantFieldErrors } from '@/lib/admin/users';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { PendingButton } from './pending-button';
import { sendToNoAccess, sendToSignInAgain } from '@/lib/admin/access-redirect';

type Note = { tone: 'done' | 'problem'; text: string };

/** What the form shows after an answer. Never holds the one-time password (see `oneTime`). */
interface FormState {
  fields?: GrantFieldErrors;
  note?: Note;
  /** The answer was a success: the form starts empty again. */
  done?: true;
}

const ROLE_HINTS: Record<EssRole, string> = {
  ESS_STAFF: 'Sees everything, sends AC prices, edits products and saves drafts of website text.',
  ESS_ADMIN: 'Also publishes website text and business details, changes services shown and pincodes, and manages users.',
};

const EMPTY = { email: '', fullName: '', role: 'ESS_STAFF' as EssRole };

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

/**
 * The "Users" editor: a form to give access by email, and the people who have access, each with
 * Remove (which asks first, on the page). Your own ESS Admin row has no Remove.
 *
 * The one-time password for a new account (R11) comes only from the server action's answer and is
 * kept only in this component's memory (`oneTime`): never in a URL, cookie, browser storage, the
 * console, an input's value, or anything the server renders. It is shown once, with Copy, and is
 * gone when the admin presses "Hide it", sends another grant, or leaves the page (Next hides the
 * page rather than unmounting it, so that is a layout-effect cleanup, below). The form posts
 * through the action (no address-bar submit before the page is ready).
 */
export function UsersEditor({ users: fromServer, myEmail }: { users: AdminUser[]; myEmail: string | null }) {
  const router = useRouter();
  // Follows a fresh list from the server (after Reload).
  const incoming = JSON.stringify(fromServer);
  const [seen, setSeen] = useState(incoming);
  const [users, setUsers] = useState(fromServer);
  if (seen !== incoming) {
    setSeen(incoming);
    setUsers(fromServer);
  }

  const [oneTime, setOneTime] = useState<{ email: string; password: string } | null>(null);
  const [copyNote, setCopyNote] = useState<Note | null>(null);
  const [checked, setChecked] = useState<GrantFieldErrors | null>(null);
  // What was last sent, so a refused grant stays in the boxes after the form resets.
  const [sent, setSent] = useState(EMPTY);
  const [listNote, setListNote] = useState<Note | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const listNoteRef = useRef<HTMLParagraphElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Next (Cache Components) keeps a page the admin leaves in a hidden <Activity> instead of
  // unmounting it, so state would come back on Back. A layout-effect cleanup runs when the page is
  // hidden (Next's "Preserving UI state" guide): the one-time password, its copy note, an open
  // "Remove?" question and the list note go then, so the password is never shown twice.
  useLayoutEffect(
    () => () => {
      setOneTime(null);
      setCopyNote(null);
      setConfirming(null);
      setListNote(null);
      setChecked(null);
    },
    [],
  );

  /** The session ended or access was taken away: say so and move to the right page. */
  function handledAccess(state: UserActionState): Note | null {
    if (state.authError) {
      const back = `${window.location.pathname}${window.location.search}`;
      sendToSignInAgain(router, back);
      return { tone: 'problem', text: USER_MESSAGES.signIn };
    }
    if (state.forbidden) {
      sendToNoAccess(router);
      return { tone: 'problem', text: USER_MESSAGES.forbidden };
    }
    return null;
  }

  const [formState, formAction, pending] = useActionState(async (_prev: FormState, fd: FormData): Promise<FormState> => {
    let state: UserActionState;
    try {
      state = await grantUserRole({ email: text(fd, 'email'), fullName: text(fd, 'fullName'), role: text(fd, 'role') });
    } catch {
      state = { error: USER_MESSAGES.unreachable };
    } finally {
      inFlight.current = false;
    }
    const access = handledAccess(state);
    if (access) return { note: access };
    if (state.ok) {
      if (state.users) setUsers(state.users);
      if (state.temporaryPassword) {
        setOneTime({ email: state.email ?? '', password: state.temporaryPassword });
        requestAnimationFrame(() => passwordRef.current?.focus());
        return { done: true };
      }
      return { done: true, note: { tone: 'done', text: USER_MESSAGES.granted } };
    }
    if (state.fields) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return { fields: state.fields, note: { tone: 'problem', text: USER_MESSAGES.checkFields } };
    }
    return { note: { tone: 'problem', text: state.error ?? USER_MESSAGES.unreachable } };
  }, {});

  function submit(e: FormEvent<HTMLFormElement>) {
    if (pending || inFlight.current) {
      e.preventDefault();
      return;
    }
    // A new grant: the last one-time password goes at once.
    setOneTime(null);
    setCopyNote(null);
    setListNote(null);
    const fd = new FormData(e.currentTarget);
    const values = { email: text(fd, 'email'), fullName: text(fd, 'fullName'), role: text(fd, 'role') as EssRole };
    const check = checkGrant(values);
    if (!check.ok) {
      e.preventDefault();
      setChecked(check.fields);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setChecked(null);
    setSent(values);
    inFlight.current = true;
  }

  function hidePassword() {
    setOneTime(null);
    setCopyNote(null);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.focus());
  }

  async function copyPassword() {
    if (!oneTime) return;
    try {
      await navigator.clipboard.writeText(oneTime.password);
      setCopyNote({ tone: 'done', text: USER_MESSAGES.copied });
    } catch {
      setCopyNote({ tone: 'problem', text: USER_MESSAGES.copyFailed });
    }
  }

  const focusIn = (selector: string) => requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(selector)?.focus());

  function askRemove(grantId: string) {
    setConfirming(grantId);
    setListNote(null);
    focusIn(`[data-keep="${grantId}"]`);
  }

  function keep(grantId: string) {
    setConfirming(null);
    focusIn(`[data-remove="${grantId}"]`);
  }

  function remove(user: AdminUser) {
    if (inFlight.current) return;
    inFlight.current = true;
    startRemoving(async () => {
      let state: UserActionState;
      try {
        state = await removeUserRole(user.grantId);
      } catch {
        state = { error: USER_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      const access = handledAccess(state);
      if (access) {
        setListNote(access);
        return;
      }
      setConfirming(null);
      if (state.users) setUsers(state.users);
      if (state.ok) {
        setListNote({ tone: 'done', text: `${personName(user)} no longer has ${ROLE_LABELS[user.role]} access.` });
      } else {
        setListNote({ tone: 'problem', text: state.error ?? USER_MESSAGES.unreachable });
        if (state.error === USER_MESSAGES.gone && !state.users) router.refresh();
      }
      requestAnimationFrame(() => listNoteRef.current?.focus());
    });
  }

  const fields = checked ?? formState.fields ?? {};
  const keepValues = formState.done ? EMPTY : sent;
  const busy = pending || removing;

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} action={formAction} onSubmit={submit} noValidate className="glass flex flex-col gap-4 rounded-[24px] p-4 text-ink sm:p-5" aria-labelledby="grant-form-h">
        <h2 id="grant-form-h" className="text-xl font-bold">
          Give access
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" hint="If this email has no account yet, one is made for them." error={fields.email}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                maxLength={254}
                defaultValue={keepValues.email}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field label="Name (optional)" hint="Used only when a new account is made." error={fields.fullName}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="fullName"
                autoComplete="off"
                maxLength={120}
                defaultValue={keepValues.fullName}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2" aria-describedby={fields.role ? 'grant-role-error' : undefined}>
          <legend className="mb-1 text-base font-semibold">Role</legend>
          {(['ESS_STAFF', 'ESS_ADMIN'] as const).map((role) => (
            <label key={role} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-line px-3 py-2.5 has-checked:border-cool">
              <input type="radio" name="role" value={role} defaultChecked={keepValues.role === role} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--cool)]" />
              <span>
                <span className="font-semibold">{ROLE_LABELS[role]}</span>
                <span className="block text-sm text-muted">{ROLE_HINTS[role]}</span>
              </span>
            </label>
          ))}
          {fields.role && (
            <p id="grant-role-error" className="text-sm font-semibold text-heat-text">
              {fields.role}
            </p>
          )}
        </fieldset>
        {formState.note && !pending && (
          <p role={formState.note.tone === 'done' ? 'status' : 'alert'} className={cn('font-semibold', formState.note.tone === 'done' ? 'text-cool' : 'text-heat-text')}>
            {formState.note.text}
          </p>
        )}
        <PendingButton pending={pending} pendingLabel="Giving access…" className="self-start">
          Give access
        </PendingButton>
      </form>

      {oneTime && (
        <div ref={passwordRef} tabIndex={-1} aria-labelledby="one-time-h" role="region" className="glass-strong flex flex-col gap-3 rounded-[24px] border border-cool/40 p-4 text-ink outline-none sm:p-5">
          <h2 id="one-time-h" className="text-xl font-bold">
            One-time password
          </h2>
          <p className="font-semibold">{USER_MESSAGES.created}</p>
          <p className="text-sm text-muted break-words">For {oneTime.email}</p>
          <code translate="no" className="rounded-2xl border border-line bg-surface px-4 py-3 font-mono text-lg break-all select-all">
            {oneTime.password}
          </code>
          <p className="text-muted">{USER_MESSAGES.passwordNote}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={copyPassword}>
              Copy
            </Button>
            <Button variant="glass" size="sm" onClick={hidePassword}>
              Hide it
            </Button>
            <span role="status" className={cn('text-sm font-semibold', copyNote?.tone === 'problem' ? 'text-heat-text' : 'text-cool')}>
              {copyNote?.text}
            </span>
          </div>
          <p className="text-sm text-muted">It is shown only this once.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 id="users-h" className="text-xl font-bold text-ink">
          People with access
        </h2>
        <p className="text-muted">{USER_MESSAGES.pysAdmins}</p>
        <p ref={listNoteRef} tabIndex={-1} role={listNote?.tone === 'problem' ? 'alert' : 'status'} className={cn('font-semibold outline-none', listNote?.tone === 'problem' ? 'text-heat-text' : 'text-cool', !listNote && 'sr-only')}>
          {listNote?.text}
        </p>
        {users.length === 0 ? (
          <div className="glass rounded-[24px] p-5 text-ink">
            <p className="text-lg font-bold">No one has been given access yet</p>
            <p className="mt-1 text-muted">Use the form above to give someone ESS Staff or ESS Admin access.</p>
          </div>
        ) : (
          <ul ref={listRef} aria-label="People with access" className="glass flex flex-col rounded-[24px] text-ink">
            {users.map((u) => {
              const who = personName(u);
              const label = ROLE_LABELS[u.role];
              const since = formatDate(u.grantedAt);
              return (
                <li key={u.grantId} className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                      <p className="font-semibold break-words">
                        <span>{who}</span>
                        {isOwnRow(u, myEmail) && <span className="ml-2 font-normal text-muted">(you)</span>}
                      </p>
                      {u.email && u.email !== who && <p className="text-sm break-words text-muted">{u.email}</p>}
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-3 py-0.5 text-sm font-semibold', u.role === 'ESS_ADMIN' ? 'bg-heat/12 text-heat-text' : 'bg-cool/12 text-cool')}>{label}</span>
                        {since && <span className="text-sm text-muted">Since {since}</span>}
                      </span>
                    </div>
                    {isOwnAdminRow(u, myEmail) ? (
                      <p className="text-sm text-muted">Another ESS Admin can remove this.</p>
                    ) : (
                      confirming !== u.grantId && (
                        <Button variant="glass" size="sm" aria-label={`Remove ${label} access for ${who}`} data-remove={u.grantId} disabled={busy} onClick={() => askRemove(u.grantId)}>
                          Remove
                        </Button>
                      )
                    )}
                  </div>
                  {confirming === u.grantId && (
                    <div className="rounded-2xl border border-heat/40 bg-heat/8 p-3">
                      <p className="font-semibold break-words">
                        Remove {label} access for {who}
                        {u.email && u.email !== who ? ` (${u.email})` : ''}? They will no longer be able to use the admin area as {label}.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <PendingButton type="button" size="sm" pending={removing} pendingLabel="Removing…" disabled={pending} onClick={() => remove(u)}>
                          Yes, remove
                        </PendingButton>
                        <Button variant="glass" size="sm" data-keep={u.grantId} disabled={busy} onClick={() => keep(u.grantId)}>
                          Keep it
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
