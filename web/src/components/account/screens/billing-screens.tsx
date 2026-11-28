import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { buttonStyles } from '@/components/ui/button';
import { AccountTabs, BackLink, EmptyState, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { PrintButton } from '@/components/account/print-button';
import { isPortalRef, portalGet, portalPath } from '@/lib/account';
import { billStatusBadge, formatDate, formatRupees, paymentMethodLabel } from '@/lib/portal-format';
import { accountHref } from '@/lib/portal-links';
import type { PortalBill, PortalBilling } from '@/lib/portal-types';

const th = 'py-2 pr-4 text-left text-sm font-semibold text-muted';
const thNum = 'py-2 text-right text-sm font-semibold text-muted';

/** /account/billing: what is due, what was paid this year, and every bill. */
export async function BillingScreen() {
  const r = await portalGet<PortalBilling>('/portal/billing');
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { totals, bills } = r.data;
  return (
    <>
      <AccountTabs current="billing" />
      <h2 className="mb-4 text-2xl">Billing</h2>
      <section aria-labelledby="bill-totals" className="mb-6">
        <h3 id="bill-totals" className="sr-only">
          Totals
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-3xl p-5 text-ink">
            <dt className="text-sm text-muted">Total due</dt>
            <dd className="tabular text-2xl font-extrabold">{formatRupees(totals.due)}</dd>
          </div>
          <div className="glass rounded-3xl p-5 text-ink">
            <dt className="text-sm text-muted">Paid this year (from 1 April)</dt>
            <dd className="tabular text-2xl font-extrabold">{formatRupees(totals.paidThisYear)}</dd>
          </div>
        </dl>
      </section>
      {bills.length === 0 ? (
        <EmptyState title="No bills yet">Bills for your services and AMC show here, with a copy you can print.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {bills.map((b) => (
            <li key={b.number} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-ink">
              <div className="min-w-0">
                <h3 className="text-lg">
                  <Link href={accountHref.bill(b.number)} className="hover:text-cool hover:underline">
                    Invoice <span className="tabular">{b.number}</span>
                  </Link>
                </h3>
                <p className="text-sm text-muted">
                  {formatDate(b.date)} · {b.forLabel}
                </p>
                <p className="tabular mt-1 text-sm">
                  Total {formatRupees(b.total)} · Paid {formatRupees(b.paid)} · <span className="font-semibold">Balance {formatRupees(b.balance)}</span>
                </p>
              </div>
              <StatusBadge status={billStatusBadge(b.status)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The company's UPI ID: the one in PYS's pay link (buildUpiPayLink) and on its QR in public/images/payments. */
export const UPI_ID = '7977805245-1@okbizaxis';

/** The same "upi://pay?…" link as the invoice email; nothing else is ever used as a payment link. */
export function safeUpiLink(link: string | null | undefined): string | null {
  return link && /^upi:\/\/pay\?[^\s"'<>]+$/i.test(link) ? link : null;
}

/** /account/billing/[number]: the "Tax Invoice & Payment Receipt", printable, with Pay by UPI while a balance is due. */
export async function BillScreen({ number }: { number: string }) {
  if (!isPortalRef(number)) notFound();
  const r = await portalGet<PortalBill>(portalPath('/portal/billing', number), { detail: true });
  if (r.kind === 'not-found') notFound();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { bill: b, business } = r.data;
  const upi = b.balance > 0 ? safeUpiLink(b.upiLink) : null;

  return (
    <>
      <AccountTabs current="billing" />
      <BackLink href={accountHref.billing()}>All bills</BackLink>
      <article aria-labelledby="inv-title" className="print-sheet glass flex flex-col gap-6 rounded-3xl p-5 text-ink sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xl font-extrabold">{business.legalName}</p>
            {business.gstin && <p className="tabular text-sm">GSTIN: {business.gstin}</p>}
            {business.address && <p className="text-sm text-muted">{business.address}</p>}
            <p className="text-sm text-muted">{[business.phone, business.email].filter(Boolean).join(' · ')}</p>
          </div>
          <PrintButton />
        </header>

        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-line pt-5">
          <div>
            <h2 id="inv-title" className="text-2xl">
              Tax Invoice &amp; Payment Receipt
            </h2>
            <p className="mt-1">
              Invoice <span className="tabular font-semibold">{b.number}</span> · {formatDate(b.date)}
            </p>
            <p className="text-sm text-muted">
              For: {b.forLabel}
              {b.requestNumber && (
                <>
                  {' · '}
                  <Link href={accountHref.request(b.requestNumber)} className={linkClass}>
                    Request {b.requestNumber}
                  </Link>
                </>
              )}
            </p>
          </div>
          <StatusBadge status={billStatusBadge(b.status)} />
        </div>

        <section aria-labelledby="inv-to">
          <h3 id="inv-to" className="text-sm font-semibold text-muted">
            Bill to
          </h3>
          <p className="font-semibold">{b.customer.name}</p>
          {b.customer.code && <p className="tabular text-sm">Customer code: {b.customer.code}</p>}
          {b.customer.phone && <p className="tabular text-sm">{b.customer.phone}</p>}
          {b.customer.address && <p className="text-sm text-muted">{b.customer.address}</p>}
        </section>

        <table className="w-full">
          <caption className="sr-only">Invoice amounts</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={th}>
                Description
              </th>
              <th scope="col" className={thNum}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="tabular">
            <tr className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                {b.forLabel} (taxable value)
              </th>
              <td className="py-2 text-right">{formatRupees(b.taxable)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                GST ({b.gstRate}%)
              </th>
              <td className="py-2 text-right">{formatRupees(b.gst)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left font-extrabold">
                Total (incl. GST)
              </th>
              <td className="py-2 text-right font-extrabold">{formatRupees(b.total)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                Paid
              </th>
              <td className="py-2 text-right">{formatRupees(b.paid)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 text-left font-extrabold">
                Balance due
              </th>
              <td className="py-2 text-right font-extrabold">{formatRupees(b.balance)}</td>
            </tr>
          </tbody>
        </table>

        <section aria-labelledby="inv-payments">
          <h3 id="inv-payments" className="text-lg">
            Payments received
          </h3>
          {b.payments.length === 0 ? (
            <p className="mt-2 text-muted">No payments received yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <caption className="sr-only">Payments received for this invoice</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={th}>
                      Date
                    </th>
                    <th scope="col" className={th}>
                      Method
                    </th>
                    <th scope="col" className={th}>
                      Reference
                    </th>
                    <th scope="col" className={thNum}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {b.payments.map((p, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4">{formatDate(p.date)}</td>
                      <td className="py-2 pr-4">
                        {paymentMethodLabel(p.method)}
                        {p.kind === 'REVERSAL' ? ' (reversed)' : ''}
                      </td>
                      <td className="py-2 pr-4">{p.referenceLast4 ? `••••${p.referenceLast4}` : '—'}</td>
                      <td className="py-2 text-right">{formatRupees(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {upi && (
          <section aria-labelledby="inv-pay" className="no-print rounded-2xl border border-line p-5">
            <h3 id="inv-pay" className="text-lg">
              Pay by UPI
            </h3>
            <p className="mt-1 text-muted">Pay the balance of {formatRupees(b.balance)} with any UPI app on your phone.</p>
            <a href={upi} className={`${buttonStyles({ size: 'lg' })} mt-4`}>
              <Smartphone aria-hidden="true" size={20} />
              Pay {formatRupees(b.balance)} by UPI
            </a>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* The company's own Google Pay business QR (the same one PYS prints on invoices). It is a fixed code, so
                  it does not carry the amount: the steps beside it say what to enter. */}
              <Image
                src="/images/payments/ess-upi-qr.jpg"
                alt={`UPI QR code for Extreme Sales & Services, UPI ID ${UPI_ID}`}
                width={720}
                height={1024}
                sizes="(min-width: 640px) 280px, 200px"
                className="h-auto w-[200px] shrink-0 rounded-xl border border-line bg-white sm:w-[280px]"
              />
              <div className="text-sm">
                <p className="font-semibold text-ink">On a computer? Scan this with any UPI app on your phone.</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                  <li>
                    Enter <span className="tabular font-semibold text-ink">{formatRupees(b.balance)}</span> as the amount.
                  </li>
                  <li>
                    Write <span className="tabular font-semibold text-ink">{b.number}</span> in the note, so we can match your payment.
                  </li>
                </ol>
                <p className="mt-2 text-muted">
                  UPI ID: <span className="tabular font-semibold text-ink">{UPI_ID}</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm">Our staff confirm each payment when it reaches us, so this bill may take a little while to show as paid.</p>
          </section>
        )}
      </article>
    </>
  );
}
