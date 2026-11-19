'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ConsentFields, type ConsentValue } from './consent-fields';
import { useRequestSubmit } from './use-request-submit';

export interface PersonValue {
  name: string;
  phone: string;
  email: string;
}

/** Name, mobile and email: the same three fields on every form. */
export function PersonFields({ value, onChange, errors }: { value: PersonValue; onChange: (v: PersonValue) => void; errors: Record<string, string> }) {
  return (
    <>
      <Field label="Your name" required error={errors['contact.name']}>
        {({ id, describedBy, invalid }) => <Input id={id} autoComplete="name" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />}
      </Field>
      <Field label="Mobile number" required error={errors['contact.phone']}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="tel" inputMode="tel" autoComplete="tel" className="tabular" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        )}
      </Field>
      <div className="sm:col-span-2">
        <Field label="Email (optional)" error={errors['contact.email']}>
          {({ id, describedBy, invalid }) => <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />}
        </Field>
      </div>
    </>
  );
}

export const EMPTY_PERSON: PersonValue = { name: '', phone: '', email: '' };
export const EMPTY_CONSENT: ConsentValue = { privacy: false, marketing: false, hp: '' };

/** "Send us a message" on /contact; lands in the PYS approval inbox as a CONTACT request. */
export function ContactForm() {
  const submit = useRequestSubmit();
  const [person, setPerson] = useState<PersonValue>(EMPTY_PERSON);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit.send((ref) => ({
      kind: 'CONTACT',
      ref,
      contact: person,
      message,
      consent: { privacy: consent.privacy as true, marketing: consent.marketing },
      hp: consent.hp,
      elapsedMs: submit.elapsedMs(),
    }));
  }

  if (submit.state === 'done' && submit.result) {
    return (
      <p role="status" className="pop-in rounded-2xl bg-cool/10 p-5 font-semibold text-ink">
        {`Message sent. Your reference is ${submit.result.trackingCode}. We'll reply within our opening hours.`}
      </p>
    );
  }

  const f = submit.fields;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <PersonFields value={person} onChange={setPerson} errors={f} />
      <div className="sm:col-span-2">
        <Field label="Message" required error={f.message}>
          {({ id, describedBy, invalid }) => <Textarea id={id} maxLength={2000} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ConsentFields value={consent} onChange={setConsent} error={f['consent.privacy']} />
      </div>
      {submit.error && (
        <p role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat sm:col-span-2">
          {submit.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="md" disabled={submit.state === 'sending'}>
          {submit.state === 'sending' ? 'Sending… this can take up to a minute' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
