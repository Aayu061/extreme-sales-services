'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { TrackResult } from '@/lib/pys/types';
import { normalizeIndianMobile } from '@/lib/request-schema';
import { TrackTimeline } from './track-timeline';

/**
 * Tracking code + the mobile used on the request. The mobile number is only sent in the request
 * body; it never goes into the address bar or browser storage.
 */
export function TrackForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ code?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const c = code.trim().toUpperCase();
    const p = normalizeIndianMobile(phone);
    const next = {
      code: c.length < 6 || c.length > 20 ? 'Enter the tracking code from your confirmation.' : undefined,
      phone: p ? undefined : 'Enter the 10-digit mobile number you used.',
    };
    setErrors(next);
    if (next.code || next.phone) return;
    setBusy(true);
    setFailure(null);
    try {
      const res = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, phone: p }) });
      const json = (await res.json().catch(() => ({}))) as TrackResult & { error?: string };
      if (res.ok) setResult(json);
      else setFailure(json.error ?? 'Could not check right now. Please try again in a minute or call us.');
    } catch {
      setFailure('We could not reach our server. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="glass-strong rounded-[30px] p-5 text-ink sm:p-8">
        <TrackTimeline result={result} />
        <Button
          variant="quiet"
          size="md"
          className="mt-6"
          onClick={() => {
            setResult(null);
            setPhone('');
          }}
        >
          Check another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="glass-strong rounded-[30px] p-5 text-ink sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tracking code" required error={errors.code}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="code" aria-describedby={describedBy} aria-invalid={invalid || undefined} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="ESS-XXXX-XXXX" className="tabular uppercase" value={code} onChange={(e) => setCode(e.target.value)} />
          )}
        </Field>
        <Field label="Mobile number" required error={errors.phone}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="tel" inputMode="tel" autoComplete="tel" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="tabular" value={phone} onChange={(e) => setPhone(e.target.value)} />
          )}
        </Field>
      </div>
      {failure && (
        <p role="alert" className="mt-4 rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
          {failure}
        </p>
      )}
      <Button type="submit" size="md" className="mt-5" disabled={busy}>
        {busy ? 'Checking… this can take up to a minute' : 'Track'}
      </Button>
    </form>
  );
}

/** Reads ?code= from a confirmation link (inside Suspense on the page). */
export function TrackFromLink() {
  const code = useSearchParams().get('code') ?? '';
  return <TrackForm key={code} initialCode={code.slice(0, 20)} />;
}
