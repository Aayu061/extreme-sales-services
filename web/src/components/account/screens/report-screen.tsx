import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountTabs, BackLink, InfoList, Panel, PortalFallback, linkClass } from '@/components/account/portal-ui';
import { PrintButton } from '@/components/account/print-button';
import { isPortalRef, portalGet, portalPath } from '@/lib/account';
import { formatDate, formatShortDate, formatTime, kgText, readable, serviceTypeLabel } from '@/lib/portal-format';
import { accountHref } from '@/lib/portal-links';
import type { PortalReport } from '@/lib/portal-types';

type Photo = PortalReport['report']['photos'][number];

/** Only the private bucket's signed https links are shown as photos. */
const safePhoto = (url: string) => /^https:\/\/[^\s"'<>]+$/.test(url);

/** "Before service photo, 4 Oct 2026" (numbered when there are several of one kind). */
export function photoAlt(kind: Photo['kind'], date: string, n: number, of: number): string {
  return `${kind === 'BEFORE' ? 'Before' : 'After'} service photo${of > 1 ? ` ${n}` : ''}, ${formatShortDate(date)}`;
}

function PhotoGroup({ title, photos, kind, date }: { title: string; photos: Photo[]; kind: Photo['kind']; date: string }) {
  if (!photos.length) return null;
  return (
    <div>
      <h3 className="text-lg">{title}</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => {
          const alt = photoAlt(kind, date, i + 1, photos.length);
          return (
            <li key={p.url}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-line">
                {/* Signed 10-minute links to a private bucket: next/image cannot cache them, so a plain lazy image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={alt} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                <span className="no-print sr-only"> (opens the full photo in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** /account/reports/[number]: the customer copy of a service report, with photos and Print / Save as PDF. */
export async function ReportScreen({ number }: { number: string }) {
  if (!isPortalRef(number)) notFound();
  const r = await portalGet<PortalReport>(portalPath('/portal/reports', number), { detail: true });
  if (r.kind === 'not-found') notFound();
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const { report: rep, business } = r.data;
  const photos = rep.photos.filter((p) => safePhoto(p.url));
  const before = photos.filter((p) => p.kind === 'BEFORE');
  const after = photos.filter((p) => p.kind === 'AFTER');
  const time = [formatTime(rep.startTime), formatTime(rep.endTime)].filter(Boolean).join(' to ');

  return (
    <>
      <AccountTabs current="requests" />
      <BackLink href={rep.requestNumber ? accountHref.request(rep.requestNumber) : accountHref.requests()}>
        {rep.requestNumber ? `Request ${rep.requestNumber}` : 'Service history'}
      </BackLink>
      <article aria-labelledby="rep-title" className="print-sheet flex flex-col gap-6">
        <section className="glass rounded-3xl p-5 text-ink sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{business.legalName}</p>
              <h2 id="rep-title" className="text-2xl">
                Service report <span className="tabular">{rep.number}</span>
              </h2>
            </div>
            <PrintButton />
          </div>
          <InfoList
            className="mt-4"
            items={[
              ['Date', formatDate(rep.date)],
              ['Time', time || null],
              ['Service', serviceTypeLabel(rep.serviceType) ?? (rep.visitKind === 'AMC' ? 'AMC visit' : null)],
              ['Technician', rep.technicianFirstName],
              [
                'Request',
                rep.requestNumber ? (
                  <Link key="req" href={accountHref.request(rep.requestNumber)} className={linkClass}>
                    {rep.requestNumber}
                  </Link>
                ) : null,
              ],
              ['AMC contract', rep.contractNumber],
              ['Site', rep.site ? `${rep.site.name}, ${rep.site.address}` : null],
            ]}
          />
        </section>

        {(rep.workDescription || rep.observations || rep.actionTaken || rep.recommendation || rep.outcome) && (
          <Panel id="rep-summary" title="Summary">
            <InfoList
              className="sm:grid-cols-1"
              items={[
                ['Work requested', rep.workDescription],
                ['What we found', rep.observations],
                ['What we did', rep.actionTaken],
                ['Recommendation', rep.recommendation],
                ['Outcome', readable(rep.outcome)],
              ]}
            />
          </Panel>
        )}

        {rep.acs.length > 0 && (
          <Panel id="rep-acs" title={rep.acs.length === 1 ? 'Your AC' : 'Your ACs'}>
            <ul className="flex flex-col gap-5">
              {rep.acs.map((a, i) => (
                <li key={a.ac?.id ?? i} className="rounded-2xl border border-line p-4">
                  <h3 className="text-lg">
                    {a.ac ? (
                      <Link href={accountHref.ac(a.ac.id)} className="hover:text-cool hover:underline">
                        {a.label}
                      </Link>
                    ) : (
                      a.label
                    )}
                  </h3>
                  <InfoList
                    className="mt-2"
                    items={[
                      ['Problem reported', a.faultReported],
                      ['What we found', a.findings],
                      ['Work done', a.workDone],
                      ['Gas added', kgText(a.refrigerantKg)],
                      ['Condition after', readable(a.conditionAfter)],
                      ['Outcome', readable(a.outcome)],
                    ]}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {rep.parts.length > 0 && (
          <Panel id="rep-parts" title="Parts used">
            <table className="w-full text-left">
              <caption className="sr-only">Parts used in this visit</caption>
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Part
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody>
                {rep.parts.map((p, i) => (
                  <tr key={`${p.name}-${i}`} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="tabular py-2 text-right">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {photos.length > 0 && (
          <Panel id="rep-photos" title="Photos">
            <div className="flex flex-col gap-5">
              <PhotoGroup title="Before" photos={before} kind="BEFORE" date={rep.date} />
              <PhotoGroup title="After" photos={after} kind="AFTER" date={rep.date} />
              <p className="no-print text-sm text-muted">Tap a photo to open it full size. For your privacy, photo links work for 10 minutes; refresh the page to see them again.</p>
            </div>
          </Panel>
        )}

        <p className="text-sm text-muted">
          {business.legalName}
          {business.phone ? ` · ${business.phone}` : ''}
          {business.email ? ` · ${business.email}` : ''}
        </p>
      </article>
    </>
  );
}
