'use client';

import Link from 'next/link';

export interface ConsentValue {
  privacy: boolean;
  marketing: boolean;
  hp: string;
}

/**
 * Privacy consent (required, unticked by default, DPDP Act), optional marketing consent, and a
 * hidden field only bots fill in.
 */
export function ConsentFields({ value, onChange, error }: { value: ConsentValue; onChange: (v: ConsentValue) => void; error?: string }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={value.privacy}
            onChange={(e) => onChange({ ...value, privacy: e.target.checked })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'consent-error' : undefined}
            className="mt-0.5 size-5 shrink-0 accent-[var(--cool)]"
          />
          <span>
            I agree that Extreme Sales &amp; Services may use these details to handle my request, as described in the{' '}
            <Link href="/legal/privacy" className="font-semibold text-cool underline underline-offset-2">
              Privacy notice
            </Link>
            .
          </span>
        </label>
        {error && (
          <p id="consent-error" className="mt-1 pl-8 text-sm font-semibold text-heat">
            {error}
          </p>
        )}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.marketing}
          onChange={(e) => onChange({ ...value, marketing: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-[var(--cool)]"
        />
        <span>Send me service reminders and offers on WhatsApp or email.</span>
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={value.hp} onChange={(e) => onChange({ ...value, hp: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
