'use client';

import { Star } from '@/components/site/footnote';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEnquiry } from '@/components/basket/use-basket';
import { Confirmation } from '@/components/book/confirmation';
import { ConsentFields, type ConsentValue } from '@/components/forms/consent-fields';
import { EMPTY_CONSENT, EMPTY_PERSON, PersonFields, type PersonValue } from '@/components/forms/contact-form';
import { useRequestSubmit } from '@/components/forms/use-request-submit';
import { checkPincode } from '@/components/home/pincode-check';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { basketTotals, priceLine } from '@/lib/basket-pricing';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';
import type { Product } from '@/lib/pys/types';

const NO_CATALOG = { services: [], amcPlans: [] };

/**
 * /enquiry: the customer's AC enquiry list (several ACs) sent to ESS as one PRODUCT_ENQUIRY.
 * PYS staff approve it, then each AC's seller sends a price. Nothing is booked or paid here.
 */
export function EnquiryFlow({ products, productsKnown = true, phone }: { products: Product[]; productsKnown?: boolean; phone: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const { basket, add, has, remove, setQuantity, clear } = useEnquiry();
  const submit = useRequestSubmit();
  const [install, setInstall] = useState<Record<string, boolean>>({});
  const [person, setPerson] = useState<PersonValue>(EMPTY_PERSON);
  const [city, setCity] = useState('Mumbai');
  const [cityOther, setCityOther] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinNote, setPinNote] = useState<{ tone: 'yes' | 'no'; text: string } | null>(null);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const prefilled = useRef(false);
  const done = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLDivElement>(null);

  // AC links (?product=): add it once, then tidy the address bar.
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const id = query.get('product');
    if (!id) return;
    const p = products.find((x) => x.id === id);
    if (p && !has('PRODUCT', p.id)) add({ type: 'PRODUCT', ref: p.id, name: p.name });
    router.replace(pathname, { scroll: false });
  }, [query, products, has, add, router, pathname]);

  const priced = useMemo(() => basket.lines.map((l) => priceLine(l, NO_CATALOG, products, { productsUnknown: !productsKnown })), [basket, products, productsKnown]);
  const totals = basketTotals(priced);
  const unavailable = totals.unavailable > 0;
  const f = submit.fields;

  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submit.fields]);

  useEffect(() => {
    if (submit.state !== 'done') return;
    clear();
    done.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    done.current?.focus();
  }, [submit.state, clear]);

  async function onPinBlur() {
    const pin = pincode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(pin)) return setPinNote(null);
    const a = await checkPincode(pin);
    if ('error' in a) setPinNote(null);
    else setPinNote(a.serviceable ? { tone: 'yes', text: `We deliver to ${a.area ?? 'this area'}.` } : { tone: 'no', text: "We don't usually deliver here; we'll call you to check." });
  }

  async function send() {
    const sentLines = basket.lines;
    const fields = await submit.send((ref) => ({
      kind: 'PRODUCT_ENQUIRY',
      ref,
      items: sentLines.map((l) => ({ type: 'PRODUCT' as const, ref: l.ref, quantity: l.quantity, ...(install[l.key] ? { notes: 'Installation needed' } : {}) })),
      contact: person,
      city: city === 'Other' ? cityOther : city,
      area,
      pincode: pincode.replace(/\s+/g, ''),
      message,
      consent: { privacy: consent.privacy as true, marketing: consent.marketing },
      hp: consent.hp,
      elapsedMs: submit.elapsedMs(),
    }));
    setLineErrors(
      Object.fromEntries(
        Object.entries(fields)
          .filter(([k]) => /^items\.\d+$/.test(k) && sentLines[Number(k.split('.')[1])])
          .map(([k, v]) => [sentLines[Number(k.split('.')[1])].key, v]),
      ),
    );
  }

  if (submit.state === 'done' && submit.result) {
    return (
      <div ref={done} tabIndex={-1} className="glass-strong scroll-mt-28 rounded-[30px] p-6 text-ink outline-none sm:p-10">
        <Confirmation
          trackingCode={submit.result.trackingCode}
          title="Enquiry sent"
          note="We check your enquiry, then the seller sends you a price for each AC. Keep this code to follow it."
        />
      </div>
    );
  }

  if (priced.length === 0) {
    return (
      <div className="glass-strong rounded-[30px] p-8 text-center text-ink">
        <p className="text-xl font-extrabold">Your AC enquiry is empty</p>
        <p className="mt-2 text-muted">Add the ACs you want a price for, then send them together.</p>
        <Link href="/shop" className="glass mt-5 inline-flex min-h-12 items-center rounded-full px-5 font-semibold">
          Shop ACs
        </Link>
      </div>
    );
  }

  const sending = submit.state === 'sending';
  return (
    <div ref={form} className="space-y-6">
      <section aria-labelledby="enq-acs" className="glass-strong rounded-[30px] p-5 text-ink sm:p-8">
        <h2 id="enq-acs" className="text-2xl">
          ACs you&apos;re asking about
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {priced.map((p) => {
            const l = p.line;
            const name = p.status === 'ok' ? p.label : l.name;
            return (
              <li key={l.key} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/shop/${encodeURIComponent(l.ref)}`} className="font-bold hover:text-cool hover:underline">
                      {name}
                    </Link>
                    {p.status === 'unavailable' ? (
                      <p className="mt-1 text-sm font-semibold text-heat">No longer available</p>
                    ) : p.unchecked ? (
                      <p className="mt-1 text-sm text-muted">Couldn&apos;t check this AC right now; the seller will confirm it.</p>
                    ) : (
                      <p className="tabular mt-1 text-sm">{p.unit === null ? 'Price on request' : `${formatInr(p.unit)} each, listed price incl. GST`}</p>
                    )}
                    {lineErrors[l.key] && <p className="mt-1 text-sm font-semibold text-heat">{lineErrors[l.key]}</p>}
                  </div>
                  <button type="button" onClick={() => remove(l.key)} aria-label={`Remove ${name}`} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-heat/10 hover:text-heat">
                    <Trash2 aria-hidden="true" size={18} />
                  </button>
                </div>
                {p.status === 'ok' && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        aria-label={`Installation needed for ${name}`}
                        checked={Boolean(install[l.key])}
                        onChange={(e) => setInstall({ ...install, [l.key]: e.target.checked })}
                        className="size-5 accent-[var(--cool)]"
                      />
                      Installation needed
                    </label>
                    <div className="neu-inset ml-auto inline-flex items-center gap-1 rounded-full p-1">
                      <button type="button" aria-label={`Fewer ${name}`} disabled={l.quantity <= 1} onClick={() => setQuantity(l.key, l.quantity - 1)} className="neu-raised inline-flex size-9 items-center justify-center rounded-full disabled:opacity-40">
                        <Minus aria-hidden="true" size={16} />
                      </button>
                      <span className="tabular w-7 text-center font-bold">{l.quantity}</span>
                      <button type="button" aria-label={`More ${name}`} disabled={l.quantity >= 20} onClick={() => setQuantity(l.key, l.quantity + 1)} className="neu-raised inline-flex size-9 items-center justify-center rounded-full disabled:opacity-40">
                        <Plus aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <section aria-label="Listed total" className="mt-4 rounded-2xl border border-line bg-surface/60 p-4">
          {totals.known > 0 ? (
            <p className="tabular flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                Listed total incl. GST
                <Star />
              </span>
              <span className="text-2xl font-extrabold">{formatInr(totals.known)}</span>
            </p>
          ) : (
            <p className="font-bold">Prices on request</p>
          )}
          {totals.hasUnpriced && totals.known > 0 && <p className="mt-1 text-sm text-muted">Some ACs are priced on request (not included).</p>}
          {unavailable && <p className="mt-1 text-sm font-semibold text-heat">Remove ACs that are no longer available to send.</p>}
          <p className="mt-1 text-sm text-muted">This is an enquiry, not an order. The seller confirms the final price and stock.</p>
        </section>
        <Link href="/shop" className="mt-4 inline-block text-sm font-semibold text-cool hover:underline">
          Add another AC
        </Link>
      </section>

      <section aria-labelledby="enq-you" className="glass-strong rounded-[30px] p-5 text-ink sm:p-8">
        <h2 id="enq-you" className="text-2xl">
          Your details
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <PersonFields value={person} onChange={setPerson} errors={f} />
          <Field label="City" required error={city === 'Other' ? undefined : f.city}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={city} onChange={(e) => setCity(e.target.value)}>
                <option>Mumbai</option>
                <option>Thane</option>
                <option>Navi Mumbai</option>
                <option>Other</option>
              </Select>
            )}
          </Field>
          {city === 'Other' && (
            <Field label="Your city" required error={f.city}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={cityOther} onChange={(e) => setCityOther(e.target.value)} />}
            </Field>
          )}
          <Field label="Area or locality" hint="Helps the seller quote delivery and installation." error={f.area}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} value={area} onChange={(e) => setArea(e.target.value)} />}
          </Field>
          <Field
            label="Pincode"
            error={f.pincode}
            hint={pinNote ? <span className={cn('font-semibold', pinNote.tone === 'yes' ? 'text-cool' : 'text-heat')}>{pinNote.text}</span> : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input id={id} inputMode="numeric" maxLength={7} className="tabular" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={pincode} onChange={(e) => setPincode(e.target.value)} onBlur={onPinBlur} />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Anything else? (optional)" error={f.message}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} maxLength={1900} placeholder="e.g. replacing an old AC, room size, when you need it" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={message} onChange={(e) => setMessage(e.target.value)} />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ConsentFields value={consent} onChange={setConsent} error={f['consent.privacy']} />
          </div>
        </div>
        {submit.error && (
          <p role="alert" className="mt-5 rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
            {submit.error}
          </p>
        )}
        <Button size="lg" className="mt-6" onClick={() => void send()} disabled={sending || unavailable}>
          {sending ? 'Sending… this can take up to a minute' : 'Send enquiry'}
        </Button>
        <p className="mt-4 text-sm text-muted">
          Prefer to talk? Call us on{' '}
          <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="tabular font-semibold text-cool">
            {phone}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
