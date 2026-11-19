import Link from 'next/link';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import type { AmcCard } from '@/lib/amc';
import { formatInr } from '@/lib/format';

/** AMC plans from PYS: visits, what is covered, and the lowest yearly price incl. GST. */
export function AmcSection({ plans }: { plans: AmcCard[] }) {
  if (plans.length === 0) return null;
  return (
    <section aria-labelledby="amc-heading" className="reveal py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="amc-heading" className="text-[clamp(30px,3.6vw,48px)]">
              Yearly AMC plans
            </h2>
            <p className="mt-2 max-w-[56ch] text-lg text-muted">Regular service visits for your split and window ACs, priced per AC for a year.</p>
          </div>
          <Link href="/amc" className={buttonStyles({ variant: 'glass' })}>
            Compare plans
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <li key={p.code}>
              <Link
                href={`/amc#${p.code.toLowerCase()}`}
                className="glass flex h-full flex-col rounded-3xl p-6 text-ink transition-transform duration-200 hover:-translate-y-1"
              >
                <h3 className="text-lg leading-snug [font-stretch:100%]">{p.name}</h3>
                <p className="mt-2 text-sm text-muted">{p.visitsPerYear} service visits a year</p>
                {p.covers.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {p.covers.map((c) => (
                      <li key={c} className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-cool" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-5">
                  <p className="tabular text-xl font-extrabold">{p.fromTotal !== null ? `From ${formatInr(p.fromTotal)}` : 'Price on request'}</p>
                  {p.fromTotal !== null && <p className="text-sm text-muted">a year, incl. GST</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
