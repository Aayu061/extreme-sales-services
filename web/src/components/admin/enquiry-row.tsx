'use client';

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone } from 'lucide-react';
import { closeEnquiry, sendPrice, type EnquiryActionState } from '@/app/admin/actions/enquiries';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ENQUIRY_MESSAGES, NOTE_MAX, telHref, whatsappHref } from '@/lib/admin/enquiries';
import { priceError } from '@/lib/admin/money';
import { formatReceived } from '@/lib/admin/requests';
import type { AdminEnquiryLine } from '@/lib/admin/types';
import { formatInr } from '@/lib/format';
import { normalizeIndianMobile } from '@/lib/request-schema';
import { PendingButton } from './pending-button';

export interface EnquiryNotice {
  tone: 'done' | 'problem';
  text: string;
}

type Result = (state: EnquiryActionState, done: string) => void;

/**
 * What to do with an action's answer. An ended session goes to sign in again (coming back to this
 * page and tab); no access goes to the no-access page; a line changed elsewhere refreshes the list.
 * The address used for "next" is this page's own (/admin/enquiries?tab=…), never customer data.
 */
function useResult(onNotice: ((n: EnquiryNotice) => void) | undefined, setMessage: (m: string | null) => void): Result {
  const router = useRouter();
  return (state, done) => {
    if (state.authError) {
      setMessage(ENQUIRY_MESSAGES.signIn);
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/admin/login?${new URLSearchParams({ expired: '1', next })}`);
    } else if (state.forbidden) {
      setMessage(ENQUIRY_MESSAGES.forbidden);
      router.replace('/admin/no-access');
    } else if (state.conflict) {
      const text = state.error ?? ENQUIRY_MESSAGES.alreadyUpdated;
      if (onNotice) onNotice({ tone: 'problem', text });
      else setMessage(text);
      router.refresh();
    } else if (state.ok) {
      setMessage(null);
      onNotice?.({ tone: 'done', text: done });
    } else if (state.error) {
      setMessage(state.error);
    }
  };
}

function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
      {children}
    </p>
  );
}

/** "Send price": the price per AC (GST included) and an optional note the customer sees. */
function PriceForm({ lineId, onResult }: { lineId: string; onResult: Result }) {
  // A second submit while one is on its way is ignored: the button is disabled once React has
  // re-rendered, and this ref covers a click that lands before that.
  const inFlight = useRef(false);
  const [checked, setChecked] = useState<{ total?: string }>({});
  // What was last sent, so a refused price stays in the box after the form resets.
  const [sent, setSent] = useState({ total: '', note: '' });
  const [state, formAction, pending] = useActionState(async (prev: EnquiryActionState, fd: FormData): Promise<EnquiryActionState> => {
    let result: EnquiryActionState;
    try {
      result = await sendPrice(lineId, prev, fd);
    } catch {
      result = { error: ENQUIRY_MESSAGES.unreachable };
    } finally {
      inFlight.current = false;
    }
    onResult(result, ENQUIRY_MESSAGES.priceSent);
    return result;
  }, {});

  function submit(e: FormEvent<HTMLFormElement>) {
    if (pending || inFlight.current) {
      e.preventDefault();
      return;
    }
    const fd = new FormData(e.currentTarget);
    const total = String(fd.get('total') ?? '');
    const problem = priceError(total);
    setChecked({ total: problem ?? undefined });
    if (problem) {
      e.preventDefault();
      return;
    }
    inFlight.current = true;
    setSent({ total, note: String(fd.get('note') ?? '') });
  }

  const totalError = checked.total ?? state.fields?.total;
  const keep = state.ok ? { total: '', note: '' } : sent;
  return (
    <form action={formAction} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Price per AC (incl. GST)" hint="For one AC, GST included, e.g. 40,500." error={totalError} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="total"
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            defaultValue={keep.total}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      <Field label="Note for the customer" hint="Shown to the customer" error={state.fields?.note}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="note" rows={2} maxLength={NOTE_MAX} defaultValue={keep.note} aria-describedby={describedBy} aria-invalid={invalid || undefined} />
        )}
      </Field>
      <PendingButton pending={pending} pendingLabel="Sending…" size="sm" className="self-start">
        Send price
      </PendingButton>
    </form>
  );
}

type CloseResult = 'SOLD' | 'NOT_TAKEN';
const CLOSE_TEXT: Record<CloseResult, { button: string; question: string; yes: string; done: string }> = {
  SOLD: { button: 'Sold', question: 'Mark as sold?', yes: 'Yes, mark as sold', done: ENQUIRY_MESSAGES.sold },
  NOT_TAKEN: { button: 'Not taken', question: 'Mark as not taken?', yes: 'Yes, mark as not taken', done: ENQUIRY_MESSAGES.notTaken },
};

/** "Sold" / "Not taken", each asking first in the row itself. */
function CloseButtons({ lineId, onResult }: { lineId: string; onResult: Result }) {
  const [asking, setAsking] = useState<CloseResult | null>(null);
  const [closing, startClosing] = useTransition();
  const inFlight = useRef(false);
  const yesRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (asking) yesRef.current?.focus();
  }, [asking]);

  function close(result: CloseResult) {
    if (inFlight.current) return;
    inFlight.current = true;
    startClosing(async () => {
      let state: EnquiryActionState;
      try {
        state = await closeEnquiry(lineId, result);
      } catch {
        state = { error: ENQUIRY_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      onResult(state, CLOSE_TEXT[result].done);
    });
  }

  if (asking) {
    const text = CLOSE_TEXT[asking];
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <p className="font-semibold">{text.question}</p>
        <div className="flex flex-wrap gap-3">
          <PendingButton ref={yesRef} type="button" size="sm" pending={closing} pendingLabel="Saving…" onClick={() => close(asking)}>
            {text.yes}
          </PendingButton>
          <Button
            variant="glass"
            size="sm"
            disabled={closing}
            onClick={() => {
              setAsking(null);
              requestAnimationFrame(() => openerRef.current?.focus());
            }}
          >
            No, go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {(Object.keys(CLOSE_TEXT) as CloseResult[]).map((result) => (
        <Button
          key={result}
          variant="glass"
          size="sm"
          onClick={(e) => {
            openerRef.current = e.currentTarget;
            setAsking(result);
          }}
        >
          {CLOSE_TEXT[result].button}
        </Button>
      ))}
    </div>
  );
}

function QuoteSummary({ line }: { line: AdminEnquiryLine }) {
  if (!line.quote) return null;
  const { total, note } = line.quote;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-lg font-bold tabular-nums">Price sent {formatInr(total)}</p>
      <p className="text-sm text-muted tabular-nums">
        {line.quantity > 1 ? `Per AC, GST included. For ${line.quantity} ACs: ${formatInr(total * line.quantity)}` : 'Per AC, GST included.'}
      </p>
      {note && (
        <div className="mt-1">
          <p className="text-sm text-muted">Note shown to the customer</p>
          <p>{note}</p>
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE: Record<string, { text: string; className: string }> = {
  FULFILLED: { text: 'Sold', className: 'bg-cool/10 text-cool' },
  CANCELLED: { text: 'Not taken', className: 'bg-line/60 text-ink' },
};

const linkStyles = 'inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline break-all';

/** The customer to call, with Call and WhatsApp (shown only here, behind sign-in). */
function Customer({ customer }: { customer: AdminEnquiryLine['customer'] }) {
  const tel = telHref(customer.phone);
  const wa = whatsappHref(customer.phone);
  const mobile = normalizeIndianMobile(customer.phone);
  const place = [customer.area, customer.city, customer.pincode].filter(Boolean).join(', ');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Customer</p>
      <p className="font-semibold">{customer.name}</p>
      <p className="tabular-nums">{mobile ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : customer.phone}</p>
      <div className="flex flex-wrap gap-2">
        {tel && (
          <a href={tel} aria-label={`Call ${customer.name}`} className={buttonStyles({ variant: 'glass', size: 'sm' })}>
            <Phone aria-hidden="true" size={18} />
            Call
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${customer.name} (opens in a new tab)`}
            className={buttonStyles({ variant: 'glass', size: 'sm' })}
          >
            <MessageCircle aria-hidden="true" size={18} />
            WhatsApp
          </a>
        )}
      </div>
      {customer.email && (
        <a href={`mailto:${customer.email}`} className={linkStyles}>
          {customer.email}
        </a>
      )}
      {place && <p>{place}</p>}
      {customer.message && (
        <div>
          <p className="text-sm text-muted">Message</p>
          <p className="whitespace-pre-line">{customer.message}</p>
        </div>
      )}
    </div>
  );
}

/**
 * One AC line: what was asked for, the customer to call, and what to do next (send a price; mark
 * it sold or not taken; or how it ended). A card on phones; three columns on wide screens.
 */
export function EnquiryRow({ line, onNotice }: { line: AdminEnquiryLine; onNotice?: (n: EnquiryNotice) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const onResult = useResult(onNotice, setMessage);
  const badge = STATUS_BADGE[line.status];

  return (
    <article aria-label={line.productName} className="glass rounded-[24px] p-5 text-ink">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">{line.productName}</h3>
          <p className="text-sm text-muted tabular-nums">
            Request <span className="font-semibold text-ink">{line.intakeNumber}</span> · {formatReceived(line.receivedAt)}
          </p>
          <p>Quantity: {line.quantity}</p>
          <p className="tabular-nums">{line.listedPrice !== null ? `Listed at ${formatInr(line.listedPrice)} per AC` : 'No listed price (price on request)'}</p>
          {line.notes && (
            <div>
              <p className="text-sm text-muted">Customer&apos;s note on this AC</p>
              <p>{line.notes}</p>
            </div>
          )}
        </div>

        <Customer customer={line.customer} />

        <div className="flex flex-col gap-4">
          {badge && <p className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>{badge.text}</p>}
          {line.status === 'QUOTE_PENDING' ? <PriceForm lineId={line.lineId} onResult={onResult} /> : <QuoteSummary line={line} />}
          {line.status === 'QUOTED' && <CloseButtons lineId={line.lineId} onResult={onResult} />}
          {message && <Problem>{message}</Problem>}
        </div>
      </div>
    </article>
  );
}

/**
 * The lines of one tab. What was just done ("Price sent…", "Marked as sold.") is noted here, above
 * the list, because the line itself moves to another tab once the list refreshes.
 */
export function EnquiryList({ lines, emptyText }: { lines: readonly AdminEnquiryLine[]; emptyText: string }) {
  const [notice, setNotice] = useState<EnquiryNotice | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // The row that was acted on is about to leave this tab: keep keyboard focus on what happened.
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);
  return (
    <div className="flex flex-col gap-4">
      <div role="status">
        {notice?.tone === 'done' && (
          <p ref={noticeRef} tabIndex={-1} className="rounded-2xl bg-cool/10 px-4 py-3 font-semibold text-ink">
            {notice.text}
          </p>
        )}
      </div>
      {notice?.tone === 'problem' && (
        <p ref={noticeRef} tabIndex={-1} role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
          {notice.text}
        </p>
      )}
      {lines.length === 0 ? (
        <p className="glass rounded-[24px] p-6 text-lg font-bold text-ink">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {lines.map((line) => (
            <li key={line.lineId}>
              <EnquiryRow line={line} onNotice={setNotice} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
