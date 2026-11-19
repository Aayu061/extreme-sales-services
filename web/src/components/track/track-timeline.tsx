import { CalendarDays, Check, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/cn';
import { formatDate, formatInr } from '@/lib/format';
import type { TrackResult } from '@/lib/pys/types';
import { ITEM_STATUS_LABEL, SLOT_LABEL, timelineSteps, visitText } from '@/lib/track';

/** A request's progress: status, the six steps, visit details and every item. */
export function TrackTimeline({ result: r }: { result: TrackResult }) {
  const steps = timelineSteps(r);
  const visit = visitText(r);
  const preferred = [formatDate(r.preferred.date), r.preferred.slot ? SLOT_LABEL[r.preferred.slot] : null].filter(Boolean).join(', ');

  return (
    <div className="pop-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Request {r.requestNumber ?? r.intakeNumber}</p>
          <p className="tabular text-xl font-extrabold">{r.trackingCode}</p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <ol className="grid gap-3 md:grid-cols-6 md:gap-2" aria-label="Progress">
        {steps.map((s) => (
          <li key={s.step} aria-current={s.state === 'current' ? 'step' : undefined} className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
            <span
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                s.state === 'done' && 'bg-cool text-white dark:text-[#0b0a1f]',
                s.state === 'current' && 'track-current bg-taxi text-taxi-ink',
                s.state === 'todo' && 'bg-line text-muted',
              )}
            >
              {s.state === 'done' ? <Check aria-hidden="true" size={18} /> : s.step}
            </span>
            <span className={cn('text-sm', s.state === 'current' ? 'font-bold' : s.state === 'todo' ? 'text-muted' : '')}>{s.label}</span>
          </li>
        ))}
      </ol>
      {r.status.sideState && <p className="text-sm font-semibold text-heat">Right now: {r.status.label}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {visit ? (
          <p className="flex gap-2">
            <CalendarDays aria-hidden="true" size={20} className="shrink-0 text-cool" />
            <span>
              <span className="block text-sm text-muted">Visit</span>
              {visit}
            </span>
          </p>
        ) : preferred ? (
          <p className="flex gap-2">
            <CalendarDays aria-hidden="true" size={20} className="shrink-0 text-cool" />
            <span>
              <span className="block text-sm text-muted">You asked for</span>
              {preferred}
            </span>
          </p>
        ) : null}
        {r.area && (
          <p className="flex gap-2">
            <MapPin aria-hidden="true" size={20} className="shrink-0 text-cool" />
            <span>
              <span className="block text-sm text-muted">Area</span>
              {r.area}
            </span>
          </p>
        )}
      </div>

      {r.items.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {r.items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span>
                <span className="font-semibold">{it.name}</span>
                {it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}
                <span className="item-status block text-sm text-muted">{ITEM_STATUS_LABEL[it.status]}</span>
              </span>
              <span className="tabular font-bold">{it.price ? formatInr(it.price.total) : 'Price after inspection'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
