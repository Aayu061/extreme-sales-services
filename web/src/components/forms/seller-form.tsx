'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ConsentFields, type ConsentValue } from './consent-fields';
import { EMPTY_CONSENT, EMPTY_PERSON, PersonFields, type PersonValue } from './contact-form';
import { useRequestSubmit } from './use-request-submit';

interface Business {
  name: string;
  city: string;
  gstin: string;
  sells: string;
}

/** Dealer / brand interest for selling on ESS (marketplace opens in a later phase). */
export function SellerForm() {
  const submit = useRequestSubmit();
  const [person, setPerson] = useState<PersonValue>(EMPTY_PERSON);
  const [biz, setBiz] = useState<Business>({ name: '', city: '', gstin: '', sells: '' });
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT);
  const set = <K extends keyof Business>(k: K, v: string) => setBiz({ ...biz, [k]: v });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit.send((ref) => ({
      kind: 'SELLER_INTEREST',
      ref,
      contact: person,
      business: { ...biz, gstin: biz.gstin.trim().toUpperCase() },
      message,
      consent: { privacy: consent.privacy as true, marketing: consent.marketing },
      hp: consent.hp,
      elapsedMs: submit.elapsedMs(),
    }));
  }

  if (submit.state === 'done' && submit.result) {
    return (
      <p role="status" className="pop-in rounded-2xl bg-cool/10 p-5 font-semibold text-ink">
        {`Thanks. Your reference is ${submit.result.trackingCode}.`}
      </p>
    );
  }

  const f = submit.fields;
  const text = (label: string, key: keyof Business, opts: { required?: boolean; hint?: string; upper?: boolean } = {}) => (
    <Field label={label} required={opts.required} hint={opts.hint} error={f[`business.${key}`]}>
      {({ id, describedBy, invalid }) => (
        <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={opts.upper ? 'tabular uppercase' : undefined} value={biz[key]} onChange={(e) => set(key, e.target.value)} />
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <PersonFields value={person} onChange={setPerson} errors={f} />
      {text('Business name', 'name', { required: true })}
      {text('City', 'city', { required: true })}
      {text('GSTIN (optional)', 'gstin', { upper: true })}
      {text('What do you sell?', 'sells', { required: true, hint: 'e.g. split ACs, spares' })}
      <div className="sm:col-span-2">
        <Field label="Message (optional)" error={f.message}>
          {({ id, describedBy, invalid }) => <Textarea id={id} maxLength={1500} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={message} onChange={(e) => setMessage(e.target.value)} />}
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
          {submit.state === 'sending' ? 'Sending… this can take up to a minute' : 'Register interest'}
        </Button>
      </div>
    </form>
  );
}
