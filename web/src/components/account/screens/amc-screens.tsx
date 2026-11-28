import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Minus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { AccountTabs, BackLink, EmptyState, InfoList, Panel, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { RenewForm } from '@/components/account/renew-form';
import { isPortalRef, portalGet, portalPath } from '@/lib/account';
import { acCountText, amcStatusBadge, formatDate, formatMonth, formatRupees, formatTime, humanize, serviceTypeLabel, visitStateBadge, visitsLeftText } from '@/lib/portal-format';
import { accountHref } from '@/lib/portal-links';
import type { PortalAmcDetail, PortalAmcList } from '@/lib/portal-types';

const CURRENT = new Set(['ACTIVE', 'EXPIRING_SOON', 'PENDING']);

/** /account/amc: current contracts first, then old ones (PYS sorts them). */
export async function AmcListScreen() {
  const r = await portalGet<PortalAmcList>('/portal/amc');
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { contracts } = r.data;
  const current = contracts.filter((c) => CURRENT.has(c.status.toUpperCase()));
  const old = contracts.filter((c) => !CURRENT.has(c.status.toUpperCase()));

  const list = (items: typeof contracts) => (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((c) => (
        <li key={c.id} className="glass flex flex-col gap-2 rounded-3xl p-5 text-ink">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-lg">
              <Link href={accountHref.amc(c.id)} className="hover:text-cool hover:underline">
                {c.plan ?? 'AMC'}
              </Link>
            </h3>
            <StatusBadge status={amcStatusBadge(c.status)} />
          </div>
          <p className="text-sm text-muted">
            <span className="tabular">{c.contractNumber}</span> · {acCountText(c.acCount)}
          </p>
          <p className="text-sm">
            {formatDate(c.startDate)} to {formatDate(c.endDate)}
          </p>
          <p className="text-sm font-semibold">Visits: {visitsLeftText(c)}</p>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <AccountTabs current="amc" />
      <h2 className="mb-4 text-2xl">Your AMC contracts</h2>
      {contracts.length === 0 ? (
        <EmptyState title="No AMC contract yet" action={{ href: '/amc', label: 'See AMC plans' }}>
          An AMC covers regular services and complaints for your ACs.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {current.length > 0 && list(current)}
          {old.length > 0 && (
            <section aria-labelledby="amc-old">
              <h2 id="amc-old" className="mb-4 text-xl">
                Previous contracts
              </h2>
              {list(old)}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Included({ yes, children }: { yes: boolean; children: string }) {
  return (
    <li className="flex items-center gap-2">
      {yes ? <Check aria-hidden="true" size={18} className="text-success" /> : <Minus aria-hidden="true" size={18} className="text-muted" />}
      <span className={yes ? '' : 'text-muted'}>
        {children}
        <span className="sr-only">{yes ? ': included' : ': not included'}</span>
      </span>
    </li>
  );
}

/** /account/amc/[id]: the contract, what it includes, visits by type, the visit timeline and Renew. */
export async function AmcDetailScreen({ id }: { id: string }) {
  if (!isPortalRef(id)) notFound();
  const r = await portalGet<PortalAmcDetail>(portalPath('/portal/amc', id), { detail: true });
  if (r.kind === 'not-found') notFound();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const c = r.data.contract;
  const v = c.visits;

  return (
    <>
      <AccountTabs current="amc" />
      <BackLink href={accountHref.amcList()}>All AMC contracts</BackLink>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="amc-title" className="glass rounded-3xl p-5 text-ink sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="amc-title" className="text-2xl">
                {c.plan ?? 'AMC'}
              </h2>
              <p className="tabular mt-1 text-muted">{c.contractNumber}</p>
            </div>
            <StatusBadge status={amcStatusBadge(c.status)} />
          </div>
          <InfoList
            className="mt-4"
            items={[
              ['Starts', formatDate(c.startDate)],
              ['Ends', formatDate(c.endDate)],
              ['Visits', humanize(c.frequency) || null],
              ['Amount', <span key="amt" className="tabular">{formatRupees(c.amount)}</span>],
            ]}
          />
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel id="amc-includes" title="What is included">
            <ul className="flex flex-col gap-2">
              <Included yes={c.includes.gasCharging}>Gas charging</Included>
              <Included yes={c.includes.spareParts}>Spare parts</Included>
              <Included yes={c.includes.unlimitedComplaints}>Unlimited complaints</Included>
            </ul>
            {c.coverageSummary && <p className="mt-3 text-sm text-muted">{c.coverageSummary}</p>}
          </Panel>
          <Panel id="amc-acs" title="ACs covered">
            {c.acs.length === 0 ? (
              <p className="text-muted">No ACs listed on this contract.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {c.acs.map((a) => (
                  <li key={a.id}>
                    <Link href={accountHref.ac(a.id)} className={linkClass}>
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel id="amc-visits" title="Visits">
          <p className="text-lg font-extrabold">
            {v.used} used{typeof v.left === 'number' ? `, ${v.left} left` : ''}
            {v.total ? ` of ${v.total}` : ''}
          </p>
          {v.byType.length > 0 && (
            <p className="mt-1 text-muted">{v.byType.map((t) => `${serviceTypeLabel(t.type)} ${t.used} of ${t.total}`).join(' · ')}</p>
          )}
          {c.timeline.length > 0 && (
            <ol className="mt-5 flex flex-col gap-3" aria-label="Visit timeline">
              {c.timeline.map((t) => {
                const badge = visitStateBadge(t.state);
                const when =
                  t.state === 'PLANNED' || !t.date
                    ? formatMonth(t.month ?? t.date) ?? 'Date to be fixed'
                    : `${formatDate(t.date)}${t.startTime ? `, ${formatTime(t.startTime)}` : ''}`;
                return (
                  <li key={t.visitNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                    <span>
                      <span className="block font-semibold">
                        Visit {t.visitNumber}
                        {t.serviceType ? ` · ${serviceTypeLabel(t.serviceType)}` : ''}
                      </span>
                      <span className="block text-sm text-muted">
                        {when}
                        {t.technicianFirstName ? ` · Technician: ${t.technicianFirstName}` : ''}
                      </span>
                      {t.reportNumber && (
                        <Link href={accountHref.report(t.reportNumber)} className={`${linkClass} text-sm`}>
                          View report {t.reportNumber}
                        </Link>
                      )}
                    </span>
                    <StatusBadge status={badge} />
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel id="amc-renew" title="Renew">
          {c.renewalRequestedAt ? (
            <p role="status">You asked to renew on {formatDate(c.renewalRequestedAt)}. We will call you to confirm.</p>
          ) : c.canRenew ? (
            <>
              <p className="mb-4 text-muted">Send us a renewal request and we will call you to confirm. Nothing is charged online.</p>
              <RenewForm contractId={c.id} contractNumber={c.contractNumber} />
            </>
          ) : CURRENT.has(c.status.toUpperCase()) ? (
            <p className="text-muted">You can ask to renew from 30 days before the end date ({formatDate(c.endDate)}).</p>
          ) : (
            <p className="text-muted">
              This contract has ended.{' '}
              <Link href="/amc" className={linkClass}>
                See AMC plans
              </Link>{' '}
              to start a new one.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
