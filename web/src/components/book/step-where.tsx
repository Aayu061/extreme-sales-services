'use client';

import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui/field';
import { checkPincode } from '@/components/home/pincode-check';
import { cn } from '@/lib/cn';
import { todayIst } from '@/lib/request-schema';

export interface WhereValue {
  line: string;
  area: string;
  landmark: string;
  city: string;
  cityOther: string;
  pincode: string;
  date: string;
  slot: '' | 'MORNING' | 'AFTERNOON' | 'EVENING';
}

export const EMPTY_WHERE: WhereValue = { line: '', area: '', landmark: '', city: 'Mumbai', cityOther: '', pincode: '', date: '', slot: '' };

const SLOTS = [
  { value: 'MORNING', label: 'Morning (9–12)' },
  { value: 'AFTERNOON', label: 'Afternoon (12–3)' },
  { value: 'EVENING', label: 'Evening (3–6:30)' },
] as const;

const plusDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Step 2: the visit address and an optional preferred date and time of day. */
export function StepWhere({ value, onChange, errors }: { value: WhereValue; onChange: (v: WhereValue) => void; errors: Record<string, string> }) {
  const [pinNote, setPinNote] = useState<{ tone: 'yes' | 'no'; text: string } | null>(null);
  const set = <K extends keyof WhereValue>(k: K, v: WhereValue[K]) => onChange({ ...value, [k]: v });
  const today = todayIst();

  async function onPinBlur() {
    const pin = value.pincode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(pin)) return setPinNote(null);
    const a = await checkPincode(pin);
    if ('error' in a) setPinNote(null);
    else setPinNote(a.serviceable ? { tone: 'yes', text: `We cover ${a.area ?? 'this area'}.` } : { tone: 'no', text: "We don't usually cover this pincode; we'll call you to confirm." });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Flat, building and street" required error={errors['address.line'] ?? errors.address}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} autoComplete="street-address" value={value.line} onChange={(e) => set('line', e.target.value)} />
          )}
        </Field>
      </div>
      <Field label="Area" error={errors['address.area']}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.area} onChange={(e) => set('area', e.target.value)} />}
      </Field>
      <Field label="Landmark" error={errors['address.landmark']}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.landmark} onChange={(e) => set('landmark', e.target.value)} />}
      </Field>
      <Field label="City" required error={value.city === 'Other' ? undefined : errors['address.city']}>
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} value={value.city} onChange={(e) => set('city', e.target.value)}>
            <option>Mumbai</option>
            <option>Thane</option>
            <option>Navi Mumbai</option>
            <option>Other</option>
          </Select>
        )}
      </Field>
      {value.city === 'Other' && (
        <Field label="Your city" required error={errors['address.city']}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.cityOther} onChange={(e) => set('cityOther', e.target.value)} />}
        </Field>
      )}
      <Field
        label="Pincode"
        error={errors['address.pincode']}
        hint={pinNote ? <span className={cn('font-semibold', pinNote.tone === 'yes' ? 'text-cool' : 'text-heat')}>{pinNote.text}</span> : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={7}
            className="tabular"
            value={value.pincode}
            onChange={(e) => set('pincode', e.target.value)}
            onBlur={onPinBlur}
          />
        )}
      </Field>
      <Field label="Preferred date" hint="Optional. We confirm the exact time by phone." error={errors['when.date']}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="date" aria-describedby={describedBy} aria-invalid={invalid || undefined} min={today} max={plusDays(today, 60)} value={value.date} onChange={(e) => set('date', e.target.value)} />
        )}
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-base font-semibold">Preferred time (optional)</p>
        <div role="radiogroup" aria-label="Preferred time" className="neu-inset grid grid-cols-1 gap-1 rounded-[26px] p-1 sm:inline-grid sm:grid-cols-3">
          {SLOTS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={value.slot === s.value}
              onClick={() => set('slot', value.slot === s.value ? '' : s.value)}
              className={cn('min-h-11 rounded-full px-4 text-sm font-semibold', value.slot === s.value ? 'neu-raised text-ink' : 'text-muted hover:text-ink')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
