import { Star } from '@/components/site/footnote';
import Link from 'next/link';
import { CalendarCheck, ClipboardList, Wrench } from 'lucide-react';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import { amcHighlights, lowestAmc, type AmcCard } from '@/lib/amc';
import { formatInr } from '@/lib/format';

const WHAT_YOU_GET = [
  { icon: CalendarCheck, title: 'Visits on a schedule', text: 'Your AC is serviced through the year, so you do not have to remember.' },
  { icon: Wrench, title: 'Complaints covered', text: 'Plans with complaint cover include extra visits when something goes wrong.' },
  { icon: ClipboardList, title: 'One price for the year', text: 'Pay once per AC. The price depends on the AC type and size.' },
];

/** Why this plan is shown: the cheapest first, then what the others add. */
function highlightLabel(p: AmcCard, i: number): string {
  if (i === 0) return 'Lowest price';
  if (p.covers.includes('Gas charging')) return 'Includes gas charging';
  if (p.covers.includes('Spare parts')) return 'Includes spare parts';
  return 'More visits';
}

/**
 * A short introduction to AMC on the home page: what it is, the starting price and three plans
 * that show the range. The full comparison of every plan lives on /amc.
 */
export function AmcSection({ plans }: { plans: AmcCard[] }) {
  const highlights = amcHighlights(plans);
  const from = lowestAmc(plans);
  if (highlights.length === 0) return null;

  return (
    <section aria-labelledby="amc-heading" className="reveal py-8 sm:py-12">
      <Container>
        <div className="glass grid gap-8 rounded-[30px] p-6 text-ink sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 id="amc-heading" className="text-[clamp(30px,3.6vw,48px)]">
              Never think about AC service again
            </h2>
            <p className="mt-3 text-lg text-muted">
              An Annual Maintenance Contract (AMC) is a yearly plan for your AC. {plans.length} plans for split and window ACs
              {from !== null && (
                <>
                  , <strong className="tabular text-ink">from {formatInr(from)} a year</strong> incl. GST<Star mark="**" />
                </>
              )}
              .
            </p>
            <ul className="mt-6 space-y-4">
              {WHAT_YOU_GET.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cool/15 text-cool">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    <span className="block text-sm text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/amc" className={`${buttonStyles({ size: 'lg' })} mt-8`}>
              Compare all {plans.length} plans
            </Link>
          </div>

          <ul className="grid content-center gap-3">
            {highlights.map((p, i) => (
              <li key={p.code}>
                {/* The whole card opens the plan on /amc through a stretched link on the plan name (its ::after
                    covers the card), so the note star can stay a link of its own: no link inside a link. */}
                <div className="relative flex flex-col gap-3 rounded-3xl sm:flex-row sm:items-center sm:justify-between sm:gap-6 border border-[var(--glass-line)] bg-white/10 p-5 transition-transform duration-200 hover:-translate-y-0.5 has-[.plan-link:focus-visible]:outline-[3px] has-[.plan-link:focus-visible]:outline-solid has-[.plan-link:focus-visible]:outline-[var(--cool)] has-[.plan-link:focus-visible]:outline-offset-2">
                  <span className="min-w-0 sm:flex-1">
                    <span className="block text-sm font-semibold text-cool">{highlightLabel(p, i)}</span>
                    <Link
                      href={`/amc#${p.code.toLowerCase()}`}
                      className="plan-link block text-lg font-bold after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
                    >
                      {p.name}
                    </Link>
                    <span className="block text-sm text-muted">
                      {p.visitsPerYear} service visits a year{p.covers.length ? `. ${p.covers.join(', ')}.` : ''}
                    </span>
                  </span>
                  <span className="sm:text-right">
                    <span className="tabular block text-xl font-extrabold">From {formatInr(p.fromTotal!)}</span>
                    <span className="block text-xs text-muted">
                      a year, incl. GST
                      <span className="relative z-10">
                        <Star mark="**" />
                      </span>
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
