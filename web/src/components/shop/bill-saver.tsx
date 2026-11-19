'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { BILL_ASSUMPTIONS, billEstimate, type AcAge } from '@/lib/bill-saver';
import { cn } from '@/lib/cn';
import { formatInr } from '@/lib/format';

const SIZES = [1, 1.5, 2] as const;
const AGES: ReadonlyArray<{ value: AcAge; label: string }> = [
  { value: 'new', label: 'Under 3 years' },
  { value: 'mid', label: '3–7 years' },
  { value: 'old', label: '8+ years' },
];

function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div role="radiogroup" aria-label={label} className="neu-inset inline-flex flex-wrap gap-1 rounded-[26px] p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn('min-h-11 rounded-full px-4 text-sm font-semibold transition-colors', o.value === value ? 'neu-raised text-ink' : 'text-muted hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Bill saver": rough monthly AC electricity cost now, after a service, and with a new 5-star inverter. */
export function BillSaver() {
  const id = useId();
  const [tonnage, setTonnage] = useState<1 | 1.5 | 2>(1.5);
  const [age, setAge] = useState<AcAge>('mid');
  const [hours, setHours] = useState(8);
  const [tariff, setTariff] = useState<number>(BILL_ASSUMPTIONS.defaultTariff);
  const e = billEstimate({ tonnage, age, hoursPerDay: hours, tariff });
  const bars = [
    { label: 'Your AC now', value: e.now, tone: 'bg-heat' },
    { label: 'After a service', value: e.afterService, tone: 'bg-cool' },
    { label: 'New 5-star inverter AC', value: e.newInverter, tone: 'bg-taxi' },
  ];
  const a = BILL_ASSUMPTIONS;

  return (
    <section aria-labelledby={`${id}-h`} className="glass mt-12 rounded-[30px] p-6 text-ink sm:p-8">
      <h2 id={`${id}-h`} className="text-[clamp(26px,3vw,36px)]">
        Bill saver
      </h2>
      <p className="mt-1 text-muted">See roughly what your AC costs to run each month, and how much a service or a new AC could save.</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <Segmented label="AC size" options={SIZES.map((s) => ({ value: s, label: `${s} ton` }))} value={tonnage} onChange={setTonnage} />
          <Segmented label="Age of your AC" options={AGES} value={age} onChange={setAge} />
          <div>
            <label htmlFor={`${id}-hours`} className="mb-2 block text-sm font-semibold">
              Hours a day: <span className="tabular">{hours}</span>
            </label>
            <input id={`${id}-hours`} type="range" min={1} max={24} value={hours} onChange={(ev) => setHours(Number(ev.target.value))} className="w-full accent-[var(--cool)]" />
          </div>
          <div>
            <label htmlFor={`${id}-tariff`} className="mb-2 block text-sm font-semibold">
              Your unit rate (₹ per unit, see your bill)
            </label>
            <input
              id={`${id}-tariff`}
              type="number"
              inputMode="decimal"
              min={1}
              max={30}
              step={0.5}
              value={tariff}
              onChange={(ev) => setTariff(Number(ev.target.value))}
              className="glass tabular min-h-11 w-32 rounded-full px-4 text-ink"
            />
          </div>
        </div>
        <div>
          <ul className="space-y-4" aria-live="polite">
            {bars.map((b) => (
              <li key={b.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{b.label}</span>
                  <span className="tabular text-xl font-extrabold">{formatInr(b.value)} / month</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--line)]">
                  <div className={cn('h-full rounded-full transition-[width] duration-500 ease-standard', b.tone)} style={{ width: `${Math.max(4, (b.value / Math.max(1, e.now)) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted">
            Rough estimate, not a promise. It assumes {a.kwPerTonNow} kW per ton for your AC now (more for older ACs), {a.afterServiceSaving * 100}% better after a service,{' '}
            {a.kwPerTonNewInverter} kW per ton for a new 5-star inverter, and {a.daysPerMonth} days a month. Your bill also depends on room size, sun and settings.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/services/svc-jet-wash" className="text-cool underline-offset-4 hover:underline">
              Book a service
            </Link>
            <Link href="/shop?star=5" className="text-cool underline-offset-4 hover:underline">
              See 5-star ACs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
