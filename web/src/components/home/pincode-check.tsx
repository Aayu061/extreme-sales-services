'use client';

import { useState, type FormEvent } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'done'; tone: 'yes' | 'no' | 'error'; message: string };

export type PincodeAnswer = { serviceable: boolean; area: string | null } | { error: string };

/** Asks this site's server whether ESS covers a 6-digit pincode (used here and on /book). */
export async function checkPincode(pincode: string): Promise<PincodeAnswer> {
  try {
    const res = await fetch(`/api/serviceability/${pincode}`);
    const body = (await res.json()) as { serviceable?: boolean; area?: string | null; error?: string };
    if (!res.ok) return { error: body.error ?? 'Could not check right now. Please call us.' };
    return { serviceable: Boolean(body.serviceable), area: body.area ?? null };
  } catch {
    return { error: 'Could not check right now. Please call us.' };
  }
}

/** Pincode check: spaces are ignored, anything but 6 digits is caught before any request. */
export function PincodeCheck() {
  const [value, setValue] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pincode = value.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(pincode)) {
      setState({ kind: 'done', tone: 'error', message: 'Enter a 6-digit pincode.' });
      return;
    }
    setState({ kind: 'checking' });
    const answer = await checkPincode(pincode);
    if ('error' in answer) {
      setState({ kind: 'done', tone: 'error', message: answer.error });
    } else if (answer.serviceable) {
      setState({ kind: 'done', tone: 'yes', message: `Yes, we cover ${answer.area ?? 'your area'}.` });
    } else {
      setState({ kind: 'done', tone: 'no', message: "We don't cover this pincode yet. Call us and we'll see what we can do." });
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="pincode" className="text-sm font-semibold">
        Your pincode
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={8}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 400071"
          className="neu-inset tabular min-h-12 w-full min-w-0 rounded-full px-5 text-lg text-ink placeholder:text-muted/70"
        />
        <button type="submit" className={buttonStyles()} disabled={state.kind === 'checking'}>
          Check
        </button>
      </div>
      <p aria-live="polite" className={cn('mt-3 min-h-6 font-semibold', state.kind === 'done' && state.tone === 'yes' ? 'text-cool' : state.kind === 'done' && state.tone === 'error' ? 'text-heat' : 'text-ink')}>
        {state.kind === 'checking' ? 'Checking…' : state.kind === 'done' ? state.message : ''}
      </p>
    </form>
  );
}
