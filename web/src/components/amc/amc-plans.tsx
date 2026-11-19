'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { AddToRequest } from '@/components/basket/add-to-request';
import { AMC_SIZES, amcCard, amcRateFor, type AmcSizeKey } from '@/lib/amc';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';
import type { CatalogAmcPlan } from '@/lib/pys/types';

const categoryLabel = (c: string) => {
  const t = c.toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Neumorphic single-choice control (AC size, tonnage). */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="neu-inset grid grid-cols-2 gap-1 rounded-[26px] p-1 sm:inline-flex sm:flex-wrap">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors',
            o.value === value ? 'neu-raised text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Every AMC plan with its yearly price for the AC the customer picks. Adding a plan records the
 * AC type and size so PYS prices it the same way.
 */
export function AmcPlans({ plans }: { plans: CatalogAmcPlan[] }) {
  const [sizeKey, setSizeKey] = useState<AmcSizeKey>('splitSmall');
  const size = AMC_SIZES.find((s) => s.key === sizeKey)!;
  const [tonnage, setTonnage] = useState<number>(size.tonnages[size.tonnages.length - 1]);
  const pickSize = (k: AmcSizeKey) => {
    const s = AMC_SIZES.find((x) => x.key === k)!;
    setSizeKey(k);
    setTonnage(s.tonnages[s.tonnages.length - 1]);
  };

  const categories = [...new Set(plans.map((p) => p.category))];
  const hasFlat = plans.some((p) => p.rates.flat);

  return (
    <div>
      <div className="glass flex flex-col gap-4 rounded-3xl p-5 text-ink sm:p-6">
        <p className="font-bold">Which AC is it for?</p>
        <Segmented label="AC type and size" options={AMC_SIZES.map((s) => ({ value: s.key, label: s.label }))} value={sizeKey} onChange={pickSize} />
        <Segmented
          label="AC size in ton"
          options={size.tonnages.map((t) => ({ value: t, label: `${t} ton` }))}
          value={tonnage}
          onChange={setTonnage}
        />
      </div>

      {categories.map((cat) => (
        <section key={cat} aria-labelledby={`amc-${cat}`} className="mt-10">
          <h2 id={`amc-${cat}`} className="text-2xl sm:text-3xl">
            {categoryLabel(cat)}
          </h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans
              .filter((p) => p.category === cat)
              .map((p) => {
                const card = amcCard(p);
                const rate = amcRateFor(p, sizeKey);
                return (
                  <article key={p.code} aria-label={p.name} className="glass flex flex-col rounded-3xl p-6 text-ink">
                    <h3 className="text-xl">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted">{`${p.visitsPerYear} visits a year`}</p>
                    {card.covers.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {card.covers.map((c) => (
                          <li key={c} className="flex items-center gap-2">
                            <Check aria-hidden="true" size={16} className="text-cool" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.coverageSummary && <p className="mt-3 text-sm text-muted">{p.coverageSummary}</p>}
                    <div className="mt-auto pt-5">
                      {rate ? (
                        <p>
                          <span className="tabular text-2xl font-extrabold">{formatInr(rate.total)}</span>
                          <span className="text-sm text-muted"> a year incl. GST{p.rates.flat ? ', any AC' : ''}</span>
                        </p>
                      ) : (
                        <p className="font-semibold text-muted">Not for this AC</p>
                      )}
                      <AddToRequest
                        className="mt-3"
                        disabled={!rate}
                        line={{ type: 'AMC', ref: p.code, name: p.name, ac: p.rates.flat ? undefined : { type: size.type, tonnage } }}
                      />
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}

      <section aria-labelledby="amc-compare" className="mt-12 max-lg:hidden">
        <h2 id="amc-compare" className="text-2xl">
          Compare every plan
        </h2>
        <div className="glass mt-4 overflow-hidden rounded-3xl text-ink">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-line)]">
                <th scope="col" className="p-4">
                  Plan
                </th>
                <th scope="col" className="p-4">
                  Visits
                </th>
                {AMC_SIZES.map((s) => (
                  <th key={s.key} scope="col" className="p-4">
                    {s.label}
                  </th>
                ))}
                {hasFlat && (
                  <th scope="col" className="p-4">
                    Any AC
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="tabular">
              {plans.map((p) => (
                <tr key={p.code} className="border-b border-[var(--glass-line)] last:border-0">
                  <th scope="row" className="p-4 font-semibold">
                    {p.name}
                  </th>
                  <td className="p-4">{p.visitsPerYear}</td>
                  {AMC_SIZES.map((s) => (
                    <td key={s.key} className="p-4">
                      {p.rates[s.key] ? formatInr(p.rates[s.key]!.total) : '—'}
                    </td>
                  ))}
                  {hasFlat && <td className="p-4">{p.rates.flat ? formatInr(p.rates.flat.total) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-6 text-sm text-muted">Prices are per AC per year and include GST.</p>
    </div>
  );
}
