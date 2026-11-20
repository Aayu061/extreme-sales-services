import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface StatusTab {
  key: string;
  label: string;
  /** Shown after the label, e.g. "Price sent (3)". Leave out for no number. */
  count?: number;
  href: string;
}

/**
 * Status tabs as plain links (the tab lives in the address, e.g. ?tab=sent), so each one can be
 * opened, reloaded or shared, and works before the page script loads. The current one is marked
 * with aria-current="page".
 */
export function StatusTabs({ tabs, current, label }: { tabs: readonly StatusTab[]; current: string; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold tabular-nums',
                  active ? 'border-cool bg-cool/10 text-cool' : 'glass border-line text-ink hover:bg-[var(--glass-strong)]',
                )}
              >
                {tab.count === undefined ? tab.label : `${tab.label} (${tab.count})`}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
