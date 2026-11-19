'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useBasket } from '@/components/basket/use-basket';
import { useRequestSubmit } from '@/components/forms/use-request-submit';
import { Button } from '@/components/ui/button';
import { priceLine } from '@/lib/basket-pricing';
import type { NewLine } from '@/lib/basket';
import { cn } from '@/lib/cn';
import type { Catalog } from '@/lib/pys/types';
import { todayIst } from '@/lib/request-schema';
import { BasketSummary } from './basket-summary';
import { Confirmation } from './confirmation';
import { StepDetails, EMPTY_DETAILS, type DetailsValue } from './step-details';
import { StepItems } from './step-items';
import { StepWhere, EMPTY_WHERE, type WhereValue } from './step-where';

type Step = 1 | 2 | 3;
const STEP_NAMES = ['What you need', 'Where and when', 'Your details'] as const;

/** Reads ?service= / ?amc= from "Book this" links and turns it into a basket line. */
function lineFromQuery(q: URLSearchParams, catalog: Pick<Catalog, 'services' | 'amcPlans'>): NewLine | null {
  const svc = q.get('service')?.toUpperCase();
  if (svc) {
    const s = catalog.services.find((x) => x.code === svc && x.isPublic && x.isActive);
    return s ? { type: 'SERVICE', ref: s.code, name: s.name } : null;
  }
  const amc = q.get('amc')?.toUpperCase();
  if (amc) {
    const p = catalog.amcPlans.find((x) => x.code.toUpperCase() === amc || x.planCode.toUpperCase() === amc);
    return p ? { type: 'AMC', ref: p.code, name: p.name } : null;
  }
  return null;
}

function whereErrors(w: WhereValue): Record<string, string> {
  const e: Record<string, string> = {};
  if (w.line.trim().length < 3) e['address.line'] = 'Enter your flat, building and street.';
  if (w.city === 'Other' && w.cityOther.trim().length < 2) e['address.city'] = 'Enter your city.';
  const pin = w.pincode.replace(/\s+/g, '');
  if (pin && !/^[1-9]\d{5}$/.test(pin)) e['address.pincode'] = 'Pincode is 6 digits.';
  if (w.date && w.date < todayIst()) e['when.date'] = 'Choose today or a later date.';
  return e;
}

/**
 * /book: services and AMC plans in three steps, sent to PYS as one basket. New ACs are not booked
 * here: they are enquired about on /enquiry.
 */
export function BookFlow({ catalog, phone }: { catalog: Pick<Catalog, 'services' | 'amcPlans'>; phone: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const { basket, add, has, remove, setQuantity, setAc, clear } = useBasket();
  const submit = useRequestSubmit();
  const [step, setStep] = useState<Step>(1);
  const [where, setWhere] = useState<WhereValue>(EMPTY_WHERE);
  const [details, setDetails] = useState<DetailsValue>(EMPTY_DETAILS);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const panel = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  // "Book this" links: add the item once (if not already there), then tidy the address bar.
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const q = new URLSearchParams(query.toString());
    if (!q.toString()) return;
    // Old AC links (?product=) belong to the enquiry page now.
    const product = q.get('product');
    if (product) return router.replace(`/enquiry?product=${encodeURIComponent(product)}`, { scroll: false });
    const line = lineFromQuery(q, catalog);
    // Checks the saved list itself, so a second "Book this" never adds a second one.
    if (line && !has(line.type, line.ref)) add(line);
    router.replace(pathname, { scroll: false });
  }, [query, catalog, has, add, router, pathname]);

  const priced = useMemo(() => basket.lines.map((l) => priceLine(l, catalog, [])), [basket, catalog]);
  const unavailable = priced.some((p) => p.status === 'unavailable');
  const errors = { ...submit.fields, ...localErrors };

  // Errors: focus the first highlighted field on the step being shown.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submit.fields, localErrors, step]);

  const done = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (submit.state !== 'done') return;
    clear();
    done.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    done.current?.focus();
  }, [submit.state, clear]);

  const goTo = (s: Step) => {
    setLocalErrors({});
    setStep(s);
    panel.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  function next() {
    if (step === 1) return goTo(2);
    if (step === 2) {
      const e = whereErrors(where);
      if (Object.keys(e).length) return setLocalErrors(e);
      return goTo(3);
    }
  }

  async function send() {
    const sentLines = basket.lines;
    const fields = await submit.send((ref) => ({
      kind: 'BASKET',
      ref,
      // The booking list only ever holds services and AMC plans (ACs live in the enquiry list).
      items: basket.lines.map((l) => ({ type: l.type as 'SERVICE' | 'AMC', ref: l.ref, quantity: l.quantity, ...(l.ac ? { ac: l.ac } : {}) })),
      contact: { name: details.name, phone: details.phone, email: details.email },
      address: {
        line: where.line,
        area: where.area,
        landmark: where.landmark,
        city: where.city === 'Other' ? where.cityOther : where.city,
        pincode: where.pincode.replace(/\s+/g, ''),
      },
      when: { date: where.date || undefined, slot: where.slot || undefined },
      message: details.note,
      consent: { privacy: details.consent.privacy as true, marketing: details.consent.marketing },
      hp: details.consent.hp,
      elapsedMs: submit.elapsedMs(),
    }));
    // Item errors stick to their line (by key), so removing another line never moves them.
    setLineErrors(
      Object.fromEntries(
        Object.entries(fields)
          .filter(([k]) => /^items\.\d+$/.test(k) && sentLines[Number(k.split('.')[1])])
          .map(([k, v]) => [sentLines[Number(k.split('.')[1])].key, v]),
      ),
    );
    // Go back to the step that holds the first problem (a removed item, or the address).
    const keys = Object.keys(fields);
    if (keys.some((k) => k.startsWith('items'))) setStep(1);
    else if (keys.some((k) => k.startsWith('address') || k.startsWith('when'))) setStep(2);
  }

  if (submit.state === 'done' && submit.result) {
    return (
      <div ref={done} tabIndex={-1} className="glass-strong scroll-mt-28 rounded-[30px] p-6 text-ink outline-none sm:p-10">
        <Confirmation trackingCode={submit.result.trackingCode} />
      </div>
    );
  }

  const sending = submit.state === 'sending';

  return (
    <div ref={panel} className="scroll-mt-28">
      <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEP_NAMES.map((name, i) => {
          const n = (i + 1) as Step;
          const passed = n < step;
          return (
            <li key={name}>
              <button
                type="button"
                disabled={!passed}
                onClick={() => goTo(n)}
                aria-current={n === step ? 'step' : undefined}
                className={cn(
                  'glass flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm text-ink disabled:cursor-default',
                  n === step && 'ring-2 ring-taxi',
                )}
              >
                <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-full font-bold', passed ? 'bg-cool text-white' : n === step ? 'bg-taxi text-taxi-ink' : 'bg-line text-muted')}>
                  {passed ? <Check aria-hidden="true" size={16} /> : n}
                </span>
                <span className="font-semibold max-sm:sr-only">{name}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="glass-strong rounded-[30px] p-5 text-ink sm:p-8">
        <h2 className="mb-5 text-2xl">{STEP_NAMES[step - 1]}</h2>
        {step === 1 && <StepItems priced={priced} lineErrors={lineErrors} onQty={setQuantity} onAc={setAc} onRemove={remove} />}
        {step === 2 && <StepWhere value={where} onChange={setWhere} errors={errors} />}
        {step === 3 && <StepDetails value={details} onChange={setDetails} errors={errors} />}

        {priced.length > 0 && <BasketSummary priced={priced} compact={step > 1} />}

        {submit.error && step === 3 && (
          <p role="alert" className="mt-5 rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
            {submit.error}
          </p>
        )}

        {priced.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <Button variant="quiet" size="md" onClick={() => goTo((step - 1) as Step)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button size="md" onClick={next} disabled={step === 1 && unavailable}>
                Continue
              </Button>
            ) : (
              <Button size="lg" onClick={() => void send()} disabled={sending || unavailable}>
                {sending ? 'Sending… this can take up to a minute' : 'Send request'}
              </Button>
            )}
          </div>
        )}
        {step === 3 && (
          <p className="mt-4 text-sm text-muted">
            Prefer to talk? Call us on{' '}
            <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="tabular font-semibold text-cool">
              {phone}
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
