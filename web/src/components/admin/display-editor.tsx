'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { saveDisplay, type DisplayActionState } from '@/app/admin/actions/display';
import { Button } from '@/components/ui/button';
import { DISPLAY_MESSAGES, displayChanges, displayRows, moveItem, type DisplayRow } from '@/lib/admin/display';
import type { AdminCatalogDisplay } from '@/lib/admin/types';
import { cn } from '@/lib/cn';
import { PendingButton } from './pending-button';
import { sendToNoAccess, sendToSignInAgain } from '@/lib/admin/access-redirect';

type Group = 'services' | 'amcPlans';
type Rows = Record<Group, DisplayRow[]>;

const GROUPS: ReadonlyArray<{ key: Group; title: string; about: string }> = [
  { key: 'services', title: 'Services', about: 'On the Services page, inside their own group (cleaning, gas, repairs …).' },
  { key: 'amcPlans', title: 'AMC plans', about: 'On the AMC page and in the booking form.' },
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-cool';

/** On/off for "shown on the website". Its name says which row; the row's badge says "Hidden". */
function ShowSwitch({ row, disabled, onToggle }: { row: DisplayRow; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={row.isPublic}
      aria-label={`Show ${row.name} on the website`}
      disabled={disabled}
      onClick={onToggle}
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-full px-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50', focusRing)}
    >
      <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150', row.isPublic ? 'bg-cool' : 'bg-line')}>
        <span
          className={cn(
            'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 motion-reduce:transition-none',
            row.isPublic && 'translate-x-5',
          )}
        />
      </span>
      <span aria-hidden="true">Show</span>
    </button>
  );
}

function RowBadges({ row, unsaved }: { row: DisplayRow; unsaved: boolean }) {
  return (
    <span className="flex flex-wrap gap-2">
      {!row.isPublic && <span className="rounded-full bg-heat/12 px-3 py-0.5 text-sm font-semibold text-heat-text">Hidden</span>}
      {!row.isActive && <span className="rounded-full bg-line/60 px-3 py-0.5 text-sm font-semibold text-ink">Switched off in PYS</span>}
      {unsaved && <span className="rounded-full bg-taxi/30 px-3 py-0.5 text-sm font-semibold text-ink">Not saved yet</span>}
    </span>
  );
}

function DisplayGroup({
  group,
  title,
  about,
  rows,
  unsaved,
  disabled,
  onToggle,
  onMove,
}: {
  group: Group;
  title: string;
  about: string;
  rows: readonly DisplayRow[];
  unsaved: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (group: Group, index: number) => void;
  onMove: (group: Group, index: number, dir: -1 | 1) => void;
}) {
  const headingId = `display-${group}`;
  return (
    <section aria-labelledby={headingId} className="glass rounded-[24px] text-ink">
      <div className="px-4 pt-4 pb-2 sm:px-5">
        <h2 id={headingId} className="text-xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted">{about}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-muted sm:px-5">PYS has none yet.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((row, i) => (
            <li key={row.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 sm:px-5">
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                <p className="font-semibold break-words">
                  <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
                  {row.name}
                </p>
                <p className="text-sm break-words text-muted">{row.code}</p>
                <RowBadges row={row} unsaved={unsaved.has(row.code)} />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <ShowSwitch row={row} disabled={disabled} onToggle={() => onToggle(group, i)} />
                <Button
                  variant="glass"
                  size="sm"
                  className="gap-1 px-3"
                  aria-label={`Move ${row.name} up`}
                  data-move={`${row.code}:up`}
                  disabled={disabled || i === 0}
                  onClick={() => onMove(group, i, -1)}
                >
                  <ChevronUp aria-hidden="true" size={18} />
                  Up
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  className="gap-1 px-3"
                  aria-label={`Move ${row.name} down`}
                  data-move={`${row.code}:down`}
                  disabled={disabled || i === rows.length - 1}
                  onClick={() => onMove(group, i, 1)}
                >
                  <ChevronDown aria-hidden="true" size={18} />
                  Down
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const plural = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;

/**
 * The "Services shown" editor. Changes stay on the screen until "Save changes", which sends PYS
 * only the rows whose shown flag or place changed, in one call (a second press while it is saving
 * does nothing). After saving, PYS's answer becomes the new starting point.
 */
export function DisplayEditor({ display }: { display: AdminCatalogDisplay }) {
  const router = useRouter();
  // Follows a fresh list from the server (after a save, or Reload).
  const incoming = JSON.stringify(display);
  const [seen, setSeen] = useState(incoming);
  const [saved, setSaved] = useState<Rows>(() => displayRows(display));
  const [now, setNow] = useState<Rows>(saved);
  if (seen !== incoming) {
    setSeen(incoming);
    const rows = displayRows(display);
    setSaved(rows);
    setNow(rows);
  }

  const [busy, startBusy] = useTransition();
  const inFlight = useRef(false);
  const [note, setNote] = useState<{ tone: 'done' | 'problem'; text: string } | null>(null);
  const [moved, setMoved] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef<{ code: string; dir: 'up' | 'down' } | null>(null);

  const items = [...displayChanges(saved.services, now.services), ...displayChanges(saved.amcPlans, now.amcPlans)];
  const unsaved = new Set(items.map((it) => it.code));

  useEffect(() => {
    // Keep keyboard focus on the moved row: on the same button, or the other one at an edge.
    const target = focusAfterMove.current;
    if (!target) return;
    focusAfterMove.current = null;
    // Codes are letters, digits and "-" (PYS rule), so they are safe in the selector as they are.
    const pick = (dir: string) => listRef.current?.querySelector<HTMLButtonElement>(`[data-move="${target.code}:${dir}"]`);
    const same = pick(target.dir);
    (same && !same.disabled ? same : pick(target.dir === 'up' ? 'down' : 'up'))?.focus();
  }, [now]);

  function toggle(group: Group, index: number) {
    setNote(null);
    setNow((rows) => ({ ...rows, [group]: rows[group].map((r, i) => (i === index ? { ...r, isPublic: !r.isPublic } : r)) }));
  }

  function move(group: Group, index: number, dir: -1 | 1) {
    const row = now[group][index];
    const list = moveItem(now[group], index, dir);
    if (!row || list.every((r, i) => r === now[group][i])) return;
    setNote(null);
    focusAfterMove.current = { code: row.code, dir: dir === -1 ? 'up' : 'down' };
    setMoved(`${row.name} moved ${dir === -1 ? 'up' : 'down'}, now ${index + dir + 1} of ${list.length}.`);
    setNow({ ...now, [group]: list });
  }

  function undo() {
    setNow(saved);
    setNote(null);
    setMoved('Changes undone.');
  }

  function save() {
    if (inFlight.current || items.length === 0) return;
    inFlight.current = true;
    const sent = items;
    startBusy(async () => {
      let state: DisplayActionState;
      try {
        state = await saveDisplay(sent);
      } catch {
        state = { error: DISPLAY_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      if (state.authError) {
        setNote({ tone: 'problem', text: DISPLAY_MESSAGES.signIn });
        const back = `${window.location.pathname}${window.location.search}`;
        sendToSignInAgain(router, back);
      } else if (state.forbidden) {
        setNote({ tone: 'problem', text: DISPLAY_MESSAGES.forbidden });
        sendToNoAccess(router);
      } else if (state.ok && state.display) {
        const rows = displayRows(state.display);
        setSaved(rows);
        setNow(rows);
        setNote({ tone: 'done', text: DISPLAY_MESSAGES.saved });
      } else {
        setNote({ tone: 'problem', text: state.error ?? DISPLAY_MESSAGES.unreachable });
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="glass rounded-[24px] px-4 py-3 font-semibold text-ink sm:px-5">Prices are set in PYS.</p>
      <p className="sr-only" role="status">
        {moved}
      </p>
      <div ref={listRef} className="flex flex-col gap-5">
        {GROUPS.map((g) => (
          <DisplayGroup key={g.key} group={g.key} title={g.title} about={g.about} rows={now[g.key]} unsaved={unsaved} disabled={busy} onToggle={toggle} onMove={move} />
        ))}
      </div>
      <div className="glass-strong sticky bottom-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] p-4 text-ink">
        <p className="min-w-0 flex-1 basis-48 font-semibold tabular-nums">{items.length ? `${plural(items.length)} not saved yet` : 'No changes'}</p>
        {note && (
          <p role={note.tone === 'done' ? 'status' : 'alert'} className={cn('basis-full font-semibold sm:order-first', note.tone === 'done' ? 'text-cool' : 'text-heat-text')}>
            {note.text}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="glass" size="sm" disabled={busy || items.length === 0} onClick={undo}>
            Undo changes
          </Button>
          <PendingButton type="button" size="sm" pending={busy} pendingLabel="Saving…" disabled={items.length === 0} onClick={save}>
            Save changes
          </PendingButton>
        </div>
      </div>
    </div>
  );
}
