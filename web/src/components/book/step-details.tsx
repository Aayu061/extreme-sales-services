'use client';

import { Field, Input, Textarea } from '@/components/ui/field';
import { ConsentFields, type ConsentValue } from '@/components/forms/consent-fields';

export interface DetailsValue {
  name: string;
  phone: string;
  email: string;
  note: string;
  consent: ConsentValue;
}

export const EMPTY_DETAILS: DetailsValue = { name: '', phone: '', email: '', note: '', consent: { privacy: false, marketing: false, hp: '' } };

/** Step 3: who we call, an optional note, and consent. */
export function StepDetails({ value, onChange, errors }: { value: DetailsValue; onChange: (v: DetailsValue) => void; errors: Record<string, string> }) {
  const set = <K extends keyof DetailsValue>(k: K, v: DetailsValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name" required error={errors['contact.name']}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} autoComplete="name" value={value.name} onChange={(e) => set('name', e.target.value)} />}
      </Field>
      <Field label="Mobile number" required hint="We call or WhatsApp you on this number to confirm." error={errors['contact.phone']}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="tel" inputMode="tel" autoComplete="tel" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="tabular" value={value.phone} onChange={(e) => set('phone', e.target.value)} />
        )}
      </Field>
      <div className="sm:col-span-2">
        <Field label="Email (optional)" error={errors['contact.email']}>
          {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Anything we should know? (optional)" error={errors.message}>
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} maxLength={2000} aria-describedby={describedBy} aria-invalid={invalid || undefined} placeholder="e.g. AC is on the 3rd floor, water dripping since yesterday" value={value.note} onChange={(e) => set('note', e.target.value)} />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ConsentFields value={value.consent} onChange={(c) => set('consent', c)} error={errors['consent.privacy']} />
      </div>
    </div>
  );
}
