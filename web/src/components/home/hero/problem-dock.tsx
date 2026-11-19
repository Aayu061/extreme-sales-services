'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { serviceAnswer, type PickerService } from '@/lib/answer';
import { DOCK_PROBLEMS, type DockProblemId } from '@/lib/problems';
import { cn } from '@/lib/cn';

/** Small looping icons; the motion stops for people who turn animations off (globals.css). */
const ICONS: Record<DockProblemId, ReactNode> = {
  'not-cooling': (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ff8a3d" strokeWidth="2" strokeLinecap="round">
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z" />
      <path className="dock-rise" d="M12 9v6" strokeWidth="3" />
    </svg>
  ),
  leaking: (
    <svg viewBox="0 0 24 24" fill="#5cc8ff">
      <path className="dock-drip" d="M12 4c-3 4-5 6.6-5 9a5 5 0 0 0 10 0c0-2.4-2-5-5-9Z" />
    </svg>
  ),
  noisy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect className="dock-shake" x="2" y="8" width="13" height="7" rx="3" />
      <path className="dock-wave" d="M18 8.5q2 3 0 6M21 6.5q3.5 5 0 10" stroke="#ff8a3d" />
    </svg>
  ),
  smell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9ccf4a" strokeWidth="2" strokeLinecap="round">
      <path className="dock-rise" d="M7 20q-2-2.5 0-5t0-5M12 20q-2-2.5 0-5t0-5M17 20q-2-2.5 0-5t0-5" />
    </svg>
  ),
  'service-due': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path className="dock-tick" d="m8.5 15 2.5 2.5 4.5-4.5" stroke="#5cc8ff" />
    </svg>
  ),
  gas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 17a9 9 0 0 1 18 0" />
      <path className="dock-needle" d="M12 17 8 10" stroke="#ff8a3d" />
    </svg>
  ),
};

/**
 * The hero's "What's wrong?" dock. Tapping a problem shows the service that answers it with its
 * live price (or "Call us" if PYS did not return it) and a Book link.
 */
export function ProblemDock({ services, className }: { services: PickerService[]; className?: string }) {
  const [selected, setSelected] = useState<DockProblemId | null>(null);
  const problem = DOCK_PROBLEMS.find((p) => p.id === selected) ?? null;
  const answer = problem ? serviceAnswer(problem.serviceCode, services) : null;

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <div aria-live="polite" className="w-full">
        {problem && answer && (
          <div key={problem.id} className="glass pop-in flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[20px] px-5 py-3.5 text-ink">
            <div>
              {answer.serviceName && <p className="text-sm font-semibold text-muted">{answer.serviceName}</p>}
              <p className="tabular text-xl font-extrabold">
                {answer.priceText}
                {answer.priceText.includes('₹') && <span className="ml-2 text-sm font-medium text-muted">incl. GST</span>}
              </p>
            </div>
            {answer.bookHref && (
              <Link href={answer.bookHref} className={buttonStyles({ size: 'sm' })}>
                Book this
              </Link>
            )}
          </div>
        )}
      </div>

      <div
        role="group"
        aria-label="What's wrong with your AC?"
        className="glass grid w-full grid-cols-3 gap-0.5 rounded-[20px] p-1.5 text-ink md:flex md:w-auto md:items-center md:gap-1 md:rounded-[24px] md:p-2"
      >
        <span className="hidden px-2.5 text-sm font-bold whitespace-nowrap md:inline">What&rsquo;s wrong?</span>
        {DOCK_PROBLEMS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === selected}
            onClick={() => setSelected(p.id === selected ? null : p.id)}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-[14px] border border-transparent px-1 py-2 text-[12.5px] font-semibold transition-[background-color,border-color,transform] duration-200 active:scale-95 md:flex-row md:gap-2 md:rounded-2xl md:px-3.5 md:text-sm md:whitespace-nowrap',
              p.id === selected ? 'border-[var(--glass-line)] bg-white/20' : 'hover:border-[var(--glass-line)] hover:bg-white/15',
            )}
          >
            <span aria-hidden="true" className="size-[22px] shrink-0 [&>svg]:size-full">
              {ICONS[p.id]}
            </span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
