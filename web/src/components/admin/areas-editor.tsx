'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { removeArea, saveArea, type AreaActionState } from '@/app/admin/actions/areas';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { AREA_MESSAGES, checkArea, type AreaFieldErrors } from '@/lib/admin/areas';
import type { AdminServiceArea } from '@/lib/admin/types';
import { cn } from '@/lib/cn';
import { PendingButton } from './pending-button';

interface FormValues {
  pincodePrefix: string;
  label: string;
  isActive: boolean;
  notes: string;
}

const EMPTY: FormValues = { pincodePrefix: '', label: '', isActive: true, notes: '' };

const valuesOf = (a: AdminServiceArea): FormValues => ({ pincodePrefix: a.pincodePrefix, label: a.label, isActive: a.isActive, notes: a.notes ?? '' });

type Note = { tone: 'done' | 'problem'; text: string };

/**
 * The "Pincodes" editor: the prefixes PYS has, a form to add one or change one, and Remove (which
 * asks first, on the page). Each press makes at most one PYS call (a second press while one is
 * running does nothing). PYS's answer (the whole list) replaces the list on the screen.
 */
export function AreasEditor({ areas: fromServer }: { areas: AdminServiceArea[] }) {
  const router = useRouter();
  // Follows a fresh list from the server (after a change, or Reload).
  const incoming = JSON.stringify(fromServer);
  const [seen, setSeen] = useState(incoming);
  const [areas, setAreas] = useState(fromServer);
  if (seen !== incoming) {
    setSeen(incoming);
    setAreas(fromServer);
  }

  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fields, setFields] = useState<AreaFieldErrors>({});
  const [formNote, setFormNote] = useState<Note | null>(null);
  const [listNote, setListNote] = useState<Note | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const listNoteRef = useRef<HTMLParagraphElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  /** The session ended or access was taken away: say so and move to the right page. */
  function handledAccess(state: AreaActionState, show: (n: Note) => void): boolean {
    if (state.authError) {
      show({ tone: 'problem', text: AREA_MESSAGES.signIn });
      const back = `${window.location.pathname}${window.location.search}`;
      router.replace(`/admin/login?${new URLSearchParams({ expired: '1', next: back })}`);
      return true;
    }
    if (state.forbidden) {
      show({ tone: 'problem', text: AREA_MESSAGES.forbidden });
      router.replace('/admin/no-access');
      return true;
    }
    return false;
  }

  function startEdit(a: AdminServiceArea) {
    setEditing(a.pincodePrefix);
    setValues(valuesOf(a));
    setFields({});
    setFormNote(null);
    setListNote(null);
    setConfirming(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      formRef.current?.querySelector<HTMLInputElement>('input[name="label"]')?.focus();
    });
  }

  function stopEdit() {
    setEditing(null);
    setValues(EMPTY);
    setFields({});
    setFormNote(null);
  }

  const focusFirstProblem = () => requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setFormNote(null);
    setListNote(null);
    const checked = checkArea(values);
    if (!checked.ok) {
      setFields(checked.fields);
      focusFirstProblem();
      return;
    }
    if (!editing && areas.some((a) => a.pincodePrefix === checked.input.pincodePrefix)) {
      setFields({ pincodePrefix: AREA_MESSAGES.exists });
      focusFirstProblem();
      return;
    }
    setFields({});
    inFlight.current = true;
    startBusy(async () => {
      let state: AreaActionState;
      try {
        state = await saveArea(checked.input);
      } catch {
        state = { error: AREA_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      if (handledAccess(state, setFormNote)) return;
      if (state.ok && state.areas) {
        setAreas(state.areas);
        setEditing(null);
        setValues(EMPTY);
        setFormNote({ tone: 'done', text: AREA_MESSAGES.saved });
      } else if (state.fields) {
        setFields(state.fields);
        focusFirstProblem();
        setFormNote({ tone: 'problem', text: AREA_MESSAGES.checkFields });
      } else {
        setFormNote({ tone: 'problem', text: state.error ?? AREA_MESSAGES.unreachable });
      }
    });
  }

  const focusIn = (selector: string) => requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(selector)?.focus());

  function askRemove(prefix: string) {
    setConfirming(prefix);
    setListNote(null);
    setFormNote(null);
    focusIn(`[data-keep="${prefix}"]`);
  }

  function keep(prefix: string) {
    setConfirming(null);
    focusIn(`[data-remove="${prefix}"]`);
  }

  function remove(prefix: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    startBusy(async () => {
      let state: AreaActionState;
      try {
        state = await removeArea(prefix);
      } catch {
        state = { error: AREA_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      if (handledAccess(state, setListNote)) return;
      setConfirming(null);
      if (state.ok && state.areas) {
        setAreas(state.areas);
        if (editing === prefix) stopEdit();
        setListNote({ tone: 'done', text: `${prefix} removed.` });
      } else {
        setListNote({ tone: 'problem', text: state.error ?? AREA_MESSAGES.unreachable });
        if (state.error === AREA_MESSAGES.gone) router.refresh();
      }
      requestAnimationFrame(() => listNoteRef.current?.focus());
    });
  }

  const editingArea = editing ? areas.find((a) => a.pincodePrefix === editing) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} noValidate onSubmit={submit} className="glass flex scroll-mt-6 flex-col gap-4 rounded-[24px] p-4 text-ink sm:p-5" aria-labelledby="area-form-h">
        <h2 id="area-form-h" className="text-xl font-bold">
          {editing ? `Change ${editing}` : 'Add a pincode prefix'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Pincode prefix"
            hint={editing ? 'To change the digits, add the new prefix and remove this one.' : 'The first 2 to 6 digits, e.g. 400 for all of Mumbai, or 400088 for one pincode.'}
            error={fields.pincodePrefix}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="pincodePrefix"
                inputMode="numeric"
                autoComplete="off"
                className="tabular-nums read-only:bg-line/40"
                readOnly={Boolean(editing)}
                value={values.pincodePrefix}
                onChange={(e) => set('pincodePrefix', e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field label="Area name" hint="Shown on the contact page, e.g. Mumbai, Thane & Navi Mumbai." error={fields.label}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="label"
                autoComplete="off"
                maxLength={120}
                value={values.label}
                onChange={(e) => set('label', e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex min-h-11 w-fit items-center gap-3 font-semibold">
            <input type="checkbox" className="h-6 w-6 accent-[var(--cool)]" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            We cover these pincodes
          </label>
          <p className="text-sm text-muted">
            Untick to keep the prefix listed but not covered. The longest matching prefix decides, so 400088 not covered takes one pincode out of 400.
          </p>
          {fields.isActive && <p className="text-sm font-semibold text-heat">{fields.isActive}</p>}
        </div>
        <Field label="Notes (only seen here)" error={fields.notes}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="notes"
              maxLength={300}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        {formNote && (
          <p role={formNote.tone === 'done' ? 'status' : 'alert'} className={cn('font-semibold', formNote.tone === 'done' ? 'text-cool' : 'text-heat')}>
            {formNote.text}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <PendingButton pending={busy} pendingLabel="Saving…">
            {editing ? 'Save changes' : 'Add prefix'}
          </PendingButton>
          {editing && (
            <Button variant="glass" onClick={stopEdit} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
        {editing && !editingArea && <p className="text-sm text-muted">This prefix is no longer in the list; saving adds it again.</p>}
      </form>

      <div className="flex flex-col gap-3">
        <h2 id="areas-h" className="text-xl font-bold text-ink">
          Prefixes covered
        </h2>
        <p ref={listNoteRef} tabIndex={-1} role={listNote?.tone === 'problem' ? 'alert' : 'status'} className={cn('font-semibold outline-none', listNote?.tone === 'problem' ? 'text-heat' : 'text-cool', !listNote && 'sr-only')}>
          {listNote?.text}
        </p>
        {areas.length === 0 ? (
          <div className="glass rounded-[24px] p-5 text-ink">
            <p className="text-lg font-bold">No pincodes yet</p>
            <p className="mt-1 text-muted">Until a prefix is added, the pincode check says no area is covered.</p>
          </div>
        ) : (
          <ul ref={listRef} aria-label="Pincode prefixes" className="glass flex flex-col rounded-[24px] text-ink">
            {areas.map((a) => (
              <li key={a.pincodePrefix} className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                    <p className="font-semibold break-words">
                      <span className="mr-3 text-lg tabular-nums">{a.pincodePrefix}</span>
                      <span>{a.label}</span>
                    </p>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-3 py-0.5 text-sm font-semibold', a.isActive ? 'bg-cool/12 text-cool' : 'bg-heat/12 text-heat')}>
                        {a.isActive ? 'Covered' : 'Not covered'}
                      </span>
                      {a.notes && <span className="text-sm break-words text-muted">{a.notes}</span>}
                    </span>
                  </div>
                  {confirming !== a.pincodePrefix && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="glass" size="sm" aria-label={`Edit ${a.pincodePrefix}`} disabled={busy} onClick={() => startEdit(a)}>
                        Edit
                      </Button>
                      <Button variant="glass" size="sm" aria-label={`Remove ${a.pincodePrefix}`} data-remove={a.pincodePrefix} disabled={busy} onClick={() => askRemove(a.pincodePrefix)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                {confirming === a.pincodePrefix && (
                  <div className="rounded-2xl border border-heat/40 bg-heat/8 p-3">
                    <p className="font-semibold">
                      Remove {a.pincodePrefix} ({a.label})? Pincodes starting with {a.pincodePrefix} will no longer be covered, unless a shorter prefix covers them.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PendingButton type="button" size="sm" pending={busy} pendingLabel="Removing…" aria-label={busy ? undefined : `Yes, remove ${a.pincodePrefix}`} onClick={() => remove(a.pincodePrefix)}>
                        Yes, remove
                      </PendingButton>
                      <Button variant="glass" size="sm" data-keep={a.pincodePrefix} disabled={busy} onClick={() => keep(a.pincodePrefix)}>
                        Keep it
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
