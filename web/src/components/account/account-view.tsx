import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { buttonStyles } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { AccountOverview } from '@/lib/account';
import { signOut } from '@/app/(site)/account/actions';

const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : String(v));

/** A signed-in customer's own ACs, AMC contracts and service history (data from PYS, nothing internal). */
export function AccountView({ data }: { data: AccountOverview }) {
  const { customer, acs, amc, requests } = data;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="acct-hello" className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 text-ink">
        <div>
          <h2 id="acct-hello" className="text-2xl">
            Hello, {customer.name}
          </h2>
          <p className="mt-1 text-muted">
            {[customer.companyName, customer.email, customer.phone, customer.city].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/book" className={buttonStyles({ size: 'md' })}>
            Book a service
          </Link>
          <form action={signOut}>
            <button type="submit" className={buttonStyles({ size: 'md', variant: 'glass' })}>
              Sign out
            </button>
          </form>
        </div>
      </section>

      <section aria-labelledby="acct-requests">
        <h2 id="acct-requests" className="text-2xl">
          Your service requests
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-muted">No service requests yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {requests.map((r) => (
              <li key={r.requestNumber} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-ink">
                <div>
                  <p className="font-semibold">{r.requestNumber}</p>
                  <p className="text-sm text-muted">
                    Requested {formatDate(r.createdAt) ?? r.createdAt}
                    {r.visit && ` · Visit ${formatDate(r.visit.date) ?? r.visit.date}${r.visit.startTime ? `, ${r.visit.startTime.slice(0, 5)}` : ''}`}
                    {r.visit?.technicianFirstName && ` · Technician: ${r.visit.technicianFirstName}`}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="acct-amc">
        <h2 id="acct-amc" className="text-2xl">
          Your AMC contracts
        </h2>
        {amc.length === 0 ? (
          <p className="mt-3 text-muted">
            No AMC contract yet.{' '}
            <Link href="/amc" className="font-semibold text-cool underline-offset-4 hover:underline">
              See AMC plans
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {amc.map((c) => (
              <li key={c.contractNumber} className="glass rounded-2xl p-4 text-ink">
                <p className="font-semibold">{c.plan ?? 'AMC'}</p>
                <p className="text-sm text-muted">
                  {c.contractNumber} · {c.status.replace(/_/g, ' ').toLowerCase()}
                </p>
                <p className="mt-2 text-sm">
                  {formatDate(c.startDate) ?? dash(c.startDate)} to {formatDate(c.endDate) ?? dash(c.endDate)}
                  {c.totalVisits ? ` · ${c.totalVisits} visits` : ''} · {c.acCount} AC{c.acCount === 1 ? '' : 's'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="acct-acs">
        <h2 id="acct-acs" className="text-2xl">
          Your ACs
        </h2>
        {acs.length === 0 ? (
          <p className="mt-3 text-muted">No ACs on record yet. We add them at your first visit.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {acs.map((a, i) => (
              <li key={a.tag ?? i} className="glass rounded-2xl p-4 text-ink">
                <p className="font-semibold">
                  {[a.brand, a.tons ? `${a.tons} ton` : null, a.type].filter(Boolean).join(' ') || 'AC'}
                </p>
                <p className="text-sm text-muted">
                  {[a.room, a.model, a.tag].filter(Boolean).join(' · ') || '—'}
                </p>
                {a.warrantyUntil && <p className="mt-1 text-sm">Warranty until {formatDate(a.warrantyUntil) ?? a.warrantyUntil}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
