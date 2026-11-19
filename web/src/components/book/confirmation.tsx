'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';

/** Shown after the request reaches ESS: the tracking code to keep, and what happens next. */
export function Confirmation({ trackingCode }: { trackingCode: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="pop-in text-center" role="status">
      <CheckCircle2 aria-hidden="true" size={52} className="mx-auto text-cool" />
      <h2 className="mt-3 text-3xl">Request sent</h2>
      <p className="mt-2 text-muted">Your tracking code</p>
      <p className="tabular mt-1 text-[clamp(28px,6vw,40px)] font-extrabold tracking-wide">{trackingCode}</p>
      <button type="button" onClick={copy} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-cool hover:underline">
        <Copy aria-hidden="true" size={16} /> {copied ? 'Copied' : 'Copy code'}
      </button>
      <p className="mx-auto mt-4 max-w-md text-muted">
        We&apos;ll call you to confirm the visit and the price before any extra work. Keep this code to track your request.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/track?code=${encodeURIComponent(trackingCode)}`} className={buttonStyles({ size: 'md' })}>
          Track this request
        </Link>
        <Link href="/" className={buttonStyles({ variant: 'quiet', size: 'md' })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
