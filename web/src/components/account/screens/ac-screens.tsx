import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { buttonStyles } from '@/components/ui/button';
import { AccountTabs, BackLink, EmptyState, InfoList, Panel, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { isPortalRef, portalGet, portalPath } from '@/lib/account';
import {
  acTitle,
  amcStatusBadge,
  coverageBadge,
  formatDate,
  readable,
  kgText,
  maskedSerial,
  serviceTypeLabel,
  starRatingText,
  technologyLabel,
  tonsText,
  acTypeLabel,
} from '@/lib/portal-format';
import { accountHref, bookForAcHref, complaintForAcHref } from '@/lib/portal-links';
import type { PortalAcDetail, PortalAcs } from '@/lib/portal-types';

/** /account/acs: one card per AC with its cover badge; serials show only the last 4 here. */
export async function AcsScreen() {
  const r = await portalGet<PortalAcs>('/portal/acs');
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { acs } = r.data;
  return (
    <>
      <AccountTabs current="acs" />
      <h2 className="mb-4 text-2xl">My ACs</h2>
      {acs.length === 0 ? (
        <EmptyState title="No ACs on record yet" action={{ href: '/book', label: 'Book a service' }}>
          We add them at your first visit.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {acs.map((a) => {
            const badge = coverageBadge(a.coverage);
            const serial = maskedSerial(a.serialLast4);
            return (
              <li key={a.id} className="glass flex flex-col gap-2 rounded-3xl p-5 text-ink">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg">
                    <Link href={accountHref.ac(a.id)} className="hover:text-cool hover:underline">
                      {acTitle(a)}
                    </Link>
                  </h3>
                  {badge && <StatusBadge status={badge} />}
                </div>
                <p className="text-sm text-muted">{[a.room, a.floor ? `Floor ${a.floor}` : null, a.model].filter(Boolean).join(' · ') || a.label}</p>
                {serial && (
                  <p className="text-sm">
                    Serial <span className="tabular">{serial}</span>
                  </p>
                )}
                <p className="text-sm">{a.lastServiceDate ? `Last service ${formatDate(a.lastServiceDate)}` : 'No service on record yet'}</p>
                {a.openRecommendations > 0 && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Lightbulb aria-hidden="true" size={16} className="text-heat-text" />
                    {a.openRecommendations} open recommendation{a.openRecommendations === 1 ? '' : 's'}
                  </p>
                )}
                <Link href={accountHref.ac(a.id)} className={`${linkClass} mt-auto pt-1 text-sm`} aria-label={`Details for ${acTitle(a)}${a.room ? `, ${a.room}` : ''}`}>
                  Details and history
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** /account/acs/[id]: specs with the full serials (owner decision D1), warranty, AMC cover, history and advice. */
export async function AcDetailScreen({ id }: { id: string }) {
  if (!isPortalRef(id)) notFound();
  const r = await portalGet<PortalAcDetail>(portalPath('/portal/acs', id), { detail: true });
  if (r.kind === 'not-found') notFound();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { ac, amc, history, recommendations } = r.data;
  const badge = coverageBadge(ac.warranty.status);
  const amcCovered = amc.some((c) => ['ACTIVE', 'EXPIRING_SOON'].includes(c.status.toUpperCase()));
  const w = ac.warranty;
  const warrantyVisits =
    typeof w.visitsTotal === 'number' && w.visitsTotal > 0
      ? `${w.visitsUsed ?? 0} used, ${Math.max(0, w.visitsTotal - (w.visitsUsed ?? 0))} left of ${w.visitsTotal}`
      : null;

  return (
    <>
      <AccountTabs current="acs" />
      <BackLink href={accountHref.acs()}>All my ACs</BackLink>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ac-title" className="glass rounded-3xl p-5 text-ink sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="ac-title" className="text-2xl">
                {acTitle(ac)}
              </h2>
              <p className="mt-1 text-muted">{ac.label}</p>
            </div>
            {badge && <StatusBadge status={badge} />}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={bookForAcHref(ac, { amcCovered })} className={buttonStyles({ size: 'md' })}>
              Book a service for this AC
            </Link>
            <Link href={complaintForAcHref(ac, { amcCovered })} className={buttonStyles({ size: 'md', variant: 'glass' })}>
              Raise a complaint for this AC
            </Link>
          </div>
        </section>

        <Panel id="ac-specs" title="Details">
          <InfoList
            items={[
              ['Brand', ac.brand],
              ['Model', ac.model],
              ['Type', ac.type ? acTypeLabel(ac.type) : null],
              ['Size', tonsText(ac.tons)],
              ['Technology', technologyLabel(ac.technology)],
              ['Star rating', starRatingText(ac.starRating)],
              ['Room', ac.room],
              ['Floor', ac.floor],
              ['Installed on', formatDate(ac.installedOn)],
              ['Purchased on', formatDate(ac.purchasedOn)],
              ['Indoor serial', ac.serials.indoor && <span className="tabular">{ac.serials.indoor}</span>],
              ['Outdoor serial', ac.serials.outdoor && <span className="tabular">{ac.serials.outdoor}</span>],
              ['Serial', ac.serials.unit && <span className="tabular">{ac.serials.unit}</span>],
              ['Condition at the last visit', ac.condition ? readable(ac.condition) : null],
              ['Site', ac.site ? `${ac.site.name}, ${ac.site.address}` : null],
            ]}
          />
        </Panel>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel id="ac-warranty" title="Warranty">
            {w.start || w.end || badge ? (
              <InfoList
                className="sm:grid-cols-1"
                items={[
                  ['Status', badge?.label],
                  ['Starts', formatDate(w.start)],
                  ['Ends', formatDate(w.end)],
                  ['Warranty visits', warrantyVisits],
                ]}
              />
            ) : (
              <p className="text-muted">No warranty details on record.</p>
            )}
          </Panel>
          <Panel id="ac-amc" title="AMC cover">
            {amc.length === 0 ? (
              <p className="text-muted">
                This AC is not on an AMC.{' '}
                <Link href="/amc" className={linkClass}>
                  See AMC plans
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {amc.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <Link href={accountHref.amc(c.id)} className={linkClass}>
                        {c.plan ?? 'AMC'} · {c.contractNumber}
                      </Link>
                      <span className="block text-sm text-muted">Until {formatDate(c.endDate)}</span>
                    </span>
                    <StatusBadge status={amcStatusBadge(c.status)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {recommendations.length > 0 && (
          <Panel id="ac-advice" title="Open recommendations">
            <ul className="flex flex-col gap-3">
              {recommendations.map((rec, i) => (
                <li key={`${rec.reportNumber}-${i}`} className="flex items-start gap-2">
                  <Lightbulb aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-heat-text" />
                  <span>
                    {rec.text}
                    <span className="block text-sm text-muted">
                      Advised {formatDate(rec.date)} ·{' '}
                      <Link href={accountHref.report(rec.reportNumber)} className={linkClass}>
                        Report {rec.reportNumber}
                      </Link>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel id="ac-history" title="Service history">
          {history.length === 0 ? (
            <p className="text-muted">No visits on record for this AC yet.</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l-2 border-line pl-4">
              {history.map((h) => (
                <li key={h.reportNumber} className="relative">
                  <span aria-hidden="true" className="absolute top-1.5 -left-[23px] size-3 rounded-full bg-cool" />
                  <h3 className="text-lg">
                    {formatDate(h.date)} · {serviceTypeLabel(h.serviceType) ?? (h.visitKind === 'AMC' ? 'AMC visit' : 'Visit')}
                  </h3>
                  <InfoList
                    className="mt-2"
                    items={[
                      ['Problem reported', h.faultReported],
                      ['What we found', h.findings],
                      ['Work done', h.workDone],
                      ['Parts replaced', h.parts.length ? h.parts.map((p) => (p.quantity > 1 ? `${p.name} × ${p.quantity}` : p.name)).join(', ') : null],
                      ['Gas added', kgText(h.refrigerantKg)],
                      ['Condition after', h.conditionAfter ? readable(h.conditionAfter) : null],
                      ['Outcome', h.outcome ? readable(h.outcome) : null],
                      ['Technician', h.technicianFirstName],
                    ]}
                  />
                  <p className="mt-2 text-sm">
                    <Link href={accountHref.report(h.reportNumber)} className={linkClass}>
                      View report {h.reportNumber}
                      {h.photoCount > 0 ? ` (${h.photoCount} photo${h.photoCount === 1 ? '' : 's'})` : ''}
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
