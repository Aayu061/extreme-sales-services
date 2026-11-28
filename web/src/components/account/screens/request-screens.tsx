import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { AccountTabs, BackLink, EmptyState, InfoList, Panel, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { isPortalRef, portalGet, portalPath } from '@/lib/account';
import { cn } from '@/lib/cn';
import { billStatusBadge, formatDate, formatDateTime, formatRupees, formatTime, requestTypeLabel, visitStateBadge } from '@/lib/portal-format';
import { accountHref } from '@/lib/portal-links';
import type { PortalRequestDetail, PortalRequests, RequestFilter } from '@/lib/portal-types';

const FILTERS: ReadonlyArray<{ id: RequestFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

/** ?filter= from the address; anything unknown means "all". */
export function requestFilter(v: string | string[] | undefined): RequestFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return s === 'open' || s === 'completed' ? s : 'all';
}

/** /account/requests: every request with Open / Completed / All filters. */
export async function RequestsScreen({ filter }: { filter: RequestFilter }) {
  const r = await portalGet<PortalRequests>(`/portal/requests?filter=${filter}`);
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { requests } = r.data;
  return (
    <>
      <AccountTabs current="requests" />
      <h2 className="mb-4 text-2xl">Service history</h2>
      <nav aria-label="Show requests" className="mb-5">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <li key={f.id}>
              <Link
                href={accountHref.requests(f.id)}
                aria-current={f.id === filter ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-base transition-colors duration-150',
                  f.id === filter ? 'border-cyan bg-cyan-wash font-semibold text-navy' : 'border-line bg-paper text-navy hover:border-cyan',
                )}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {requests.length === 0 ? (
        <EmptyState
          title={filter === 'open' ? 'No open requests' : filter === 'completed' ? 'No completed requests yet' : 'No service requests yet'}
          action={{ href: '/book', label: 'Book a service' }}
        >
          {filter === 'open' ? 'Everything you asked for is done.' : 'Requests you send us show here, with their visits and reports.'}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((q) => (
            <li key={q.number} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-ink">
              <div className="min-w-0">
                <h3 className="text-lg">
                  <Link href={accountHref.request(q.number)} className="hover:text-cool hover:underline">
                    {requestTypeLabel(q.type)} · <span className="tabular">{q.number}</span>
                  </Link>
                </h3>
                <p className="text-sm text-muted">
                  Requested {formatDate(q.createdAt)}
                  {q.ac ? ` · ${q.ac.label}` : ''}
                  {q.visit ? ` · Visit ${formatDateTime(q.visit.date, q.visit.startTime)}` : ''}
                  {q.visit?.technicianFirstName ? ` · Technician: ${q.visit.technicianFirstName}` : ''}
                </p>
                {(q.hasReport || q.billNumber) && (
                  <p className="mt-1 text-sm">
                    {q.hasReport ? 'Report ready' : ''}
                    {q.hasReport && q.billNumber ? ' · ' : ''}
                    {q.billNumber && (
                      <Link href={accountHref.bill(q.billNumber)} className={linkClass}>
                        Bill {q.billNumber}
                      </Link>
                    )}
                  </p>
                )}
              </div>
              <StatusBadge status={q.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** /account/requests/[number]: status timeline, visits, reports and the bill. */
export async function RequestDetailScreen({ number }: { number: string }) {
  if (!isPortalRef(number)) notFound();
  const r = await portalGet<PortalRequestDetail>(portalPath('/portal/requests', number), { detail: true });
  if (r.kind === 'not-found') notFound();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const q = r.data.request;

  return (
    <>
      <AccountTabs current="requests" />
      <BackLink href={accountHref.requests()}>All requests</BackLink>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="req-title" className="glass rounded-3xl p-5 text-ink sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="req-title" className="text-2xl">
                {requestTypeLabel(q.type)} · <span className="tabular">{q.number}</span>
              </h2>
              <p className="mt-1 text-muted">Requested {formatDate(q.createdAt)}</p>
            </div>
            <StatusBadge status={q.status} />
          </div>
          <InfoList
            className="mt-4"
            items={[
              ['AC', q.ac ? <Link key="ac" href={accountHref.ac(q.ac.id)} className={linkClass}>{q.ac.label}</Link> : null],
              ['What you told us', q.description],
            ]}
          />
        </section>

        {q.timeline.length > 0 && (
          <Panel id="req-steps" title="Progress">
            <ol className="flex flex-col gap-3">
              {q.timeline.map((t, i) => (
                <li key={`${t.label}-${i}`} className="flex items-center gap-3">
                  <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cool text-white dark:text-[#0b0a1f]">
                    <Check size={16} />
                  </span>
                  <span>
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block text-sm text-muted">
                      {formatDate(t.at)}
                      {formatTime(t.at) && /T/.test(t.at) ? `, ${formatTime(t.at)}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Panel id="req-visits" title="Visits">
            {q.visits.length === 0 ? (
              <p className="text-muted">No visit booked yet. We will call you to fix a time.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {q.visits.map((v, i) => (
                  <li key={`${v.date}-${i}`} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="block font-semibold">{formatDateTime(v.date, v.startTime)}</span>
                      {v.technicianFirstName && <span className="block text-sm text-muted">Technician: {v.technicianFirstName}</span>}
                    </span>
                    <StatusBadge status={visitStateBadge(v.state)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel id="req-reports" title="Reports">
            {q.reports.length === 0 ? (
              <p className="text-muted">The service report shows here after the visit.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {q.reports.map((rep) => (
                  <li key={rep.reportNumber}>
                    <Link href={accountHref.report(rep.reportNumber)} className={linkClass}>
                      Report {rep.reportNumber}
                    </Link>
                    <span className="text-sm text-muted"> · {formatDate(rep.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {q.bill && (
          <Panel id="req-bill" title="Bill">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                <Link href={accountHref.bill(q.bill.number)} className={linkClass}>
                  Invoice {q.bill.number}
                </Link>
                <span className="block text-sm text-muted">
                  Total <span className="tabular">{formatRupees(q.bill.total)}</span>
                  {q.bill.balance > 0 ? (
                    <>
                      {' '}
                      · Balance <span className="tabular">{formatRupees(q.bill.balance)}</span>
                    </>
                  ) : null}
                </span>
              </p>
              <StatusBadge status={billStatusBadge(q.bill.status)} />
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
