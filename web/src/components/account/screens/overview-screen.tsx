import Link from 'next/link';
import { AlertTriangle, CalendarDays, ClipboardList, IndianRupee, ShieldCheck } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { AccountView } from '@/components/account/account-view';
import { AccountError, AccountTabs, ComingSoon, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { signOut } from '@/app/(site)/account/actions';
import { getAccountState, portalGet } from '@/lib/account';
import { formatDateTime, formatRupees, visitsLeftText } from '@/lib/portal-format';
import { COMPLAINT_SERVICE_CODE, accountHref, alertHref } from '@/lib/portal-links';
import type { AlertKind, PortalOverview } from '@/lib/portal-types';

const ALERT_ACTION: Record<AlertKind, string> = {
  AMC_ENDING: 'Renew your AMC',
  AMC_EXPIRED: 'See your AMC',
  WARRANTY_ENDING: 'See this AC',
  RECOMMENDATION: 'See the advice',
  BILL_DUE: 'View the bill',
};

function SummaryCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="glass flex flex-col gap-1 rounded-3xl p-5 text-ink">
      <p className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="text-cool">
          {icon}
        </span>
        {title}
      </p>
      {children}
    </li>
  );
}

/** /account when PYS has no S11b overview yet: the S11 v1 page from /portal/me. */
async function v1Account() {
  let state;
  try {
    state = await getAccountState();
  } catch {
    return <AccountError />;
  }
  if (state.kind === 'off') return <ComingSoon />;
  if (state.kind === 'signed-out') return <PortalFallback result={{ kind: 'signed-out', ended: false }} />;
  return <AccountView data={state.data} />;
}

/** /account signed in: greeting, four summary cards, alerts and quick actions. */
export async function OverviewScreen() {
  const r = await portalGet<PortalOverview>('/portal/overview', { detail: true });
  if (r.kind === 'not-found') return v1Account();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { customer, nextVisit, amc, billing, openRequests, alerts } = r.data;

  return (
    <>
      <AccountTabs current="overview" />
      <div className="flex flex-col gap-8">
        <section aria-labelledby="acct-hello" className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 text-ink">
          <div className="min-w-0">
            <h2 id="acct-hello" className="text-2xl">
              Hello, {customer.name}
            </h2>
            <p className="mt-1 break-words text-muted">{[customer.companyName, customer.email, customer.phone, customer.city].filter(Boolean).join(' · ')}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className={buttonStyles({ size: 'md', variant: 'glass' })}>
              Sign out
            </button>
          </form>
        </section>

        <section aria-labelledby="acct-summary">
          <h2 id="acct-summary" className="sr-only">
            Summary
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={<CalendarDays size={18} />} title="Next visit">
              {nextVisit ? (
                <>
                  <p className="text-lg font-extrabold">{formatDateTime(nextVisit.date, nextVisit.startTime)}</p>
                  {nextVisit.technicianFirstName && <p className="text-sm">Technician: {nextVisit.technicianFirstName}</p>}
                  {nextVisit.ac && <p className="text-sm text-muted">{nextVisit.ac.label}</p>}
                  {nextVisit.requestNumber && (
                    <Link href={accountHref.request(nextVisit.requestNumber)} className={`${linkClass} text-sm`}>
                      Request {nextVisit.requestNumber}
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-lg font-extrabold">None booked</p>
              )}
            </SummaryCard>
            <SummaryCard icon={<ShieldCheck size={18} />} title="AMC visits left">
              {amc ? (
                <>
                  <p className="text-lg font-extrabold">{visitsLeftText(amc)}</p>
                  <Link href={accountHref.amc(amc.id)} className={`${linkClass} text-sm`}>
                    {amc.plan ?? 'AMC'} {amc.contractNumber}
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-lg font-extrabold">No active AMC</p>
                  <Link href="/amc" className={`${linkClass} text-sm`}>
                    See AMC plans
                  </Link>
                </>
              )}
            </SummaryCard>
            {billing.amountDue > 0 && (
              <SummaryCard icon={<IndianRupee size={18} />} title="Amount due">
                <p className="tabular text-lg font-extrabold">{formatRupees(billing.amountDue)}</p>
                <p className="text-sm text-muted">
                  {billing.unpaidBills} unpaid bill{billing.unpaidBills === 1 ? '' : 's'}
                </p>
                <Link href={accountHref.billing()} className={`${linkClass} text-sm`}>
                  View bills
                </Link>
              </SummaryCard>
            )}
            <SummaryCard icon={<ClipboardList size={18} />} title="Open requests">
              <p className="tabular text-lg font-extrabold">{openRequests}</p>
              <Link href={accountHref.requests(openRequests > 0 ? 'open' : 'all')} className={`${linkClass} text-sm`}>
                {openRequests > 0 ? 'See open requests' : 'See service history'}
              </Link>
            </SummaryCard>
          </ul>
        </section>

        {alerts.length > 0 && (
          <section aria-labelledby="acct-alerts">
            <h2 id="acct-alerts" className="text-2xl">
              Things to look at
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {alerts.map((a, i) => {
                const href = alertHref(a.link);
                return (
                  <li key={`${a.kind}-${i}`} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-ink">
                    <p className="flex items-start gap-2">
                      <AlertTriangle aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-heat-text" />
                      <span>{a.text}</span>
                    </p>
                    {href && (
                      <Link href={href} className={buttonStyles({ size: 'sm', variant: a.kind === 'AMC_ENDING' || a.kind === 'BILL_DUE' ? 'taxi' : 'glass' })}>
                        {ALERT_ACTION[a.kind] ?? 'Open'}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="acct-quick">
          <h2 id="acct-quick" className="text-2xl">
            Quick actions
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/book" className={buttonStyles({ size: 'md' })}>
              Book a service
            </Link>
            <Link href={`/book?service=${COMPLAINT_SERVICE_CODE}`} className={buttonStyles({ size: 'md', variant: 'glass' })}>
              Raise a complaint
            </Link>
            <Link href="/track" className={buttonStyles({ size: 'md', variant: 'glass' })}>
              Track a request
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
