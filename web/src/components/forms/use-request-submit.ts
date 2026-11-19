'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fieldErrors, requestSchema, type SiteRequestInput } from '@/lib/request-schema';

export interface SentRequest {
  trackingCode: string;
  intakeNumber: string;
}

const newRef = () =>
  `web-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

/**
 * Sends a form to /api/request. The details are checked here first (friendly messages, no
 * network call), a tap while sending is ignored, and a retry after an error reuses the same
 * reference so PYS never stores the request twice.
 */
export function useRequestSubmit() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<SentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const ref = useRef<string | null>(null);
  const busy = useRef(false);
  // Started once the form is on screen (reading the clock while the page is pre-built is not allowed).
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const elapsedMs = useCallback(() => (startedAt.current === null ? 0 : Date.now() - startedAt.current), []);

  /** Resolves with the field errors (empty when sent or ignored) so a form can jump to them. */
  const send = useCallback(async (build: (ref: string) => SiteRequestInput): Promise<Record<string, string>> => {
    if (busy.current) return {};
    ref.current ??= newRef();
    const body = build(ref.current);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const f = fieldErrors(parsed.error.issues);
      setFields(f);
      setError('Please check the highlighted details.');
      setState('error');
      return f;
    }
    busy.current = true;
    setState('sending');
    setError(null);
    setFields({});
    try {
      const res = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as Partial<SentRequest> & { error?: string; fields?: Record<string, string> };
      if (res.ok && json.trackingCode) {
        setResult({ trackingCode: json.trackingCode, intakeNumber: json.intakeNumber ?? '' });
        setState('done');
        ref.current = null;
        return {};
      }
      setError(json.error ?? 'We could not send your request right now. Please try again in a minute, or call us.');
      setFields(json.fields ?? {});
      setState('error');
      return json.fields ?? {};
    } catch {
      setError('We could not reach our server. Check your internet and try again, or call us.');
      setState('error');
      return {};
    } finally {
      busy.current = false;
    }
  }, []);

  return { state, result, error, fields, send, elapsedMs };
}
