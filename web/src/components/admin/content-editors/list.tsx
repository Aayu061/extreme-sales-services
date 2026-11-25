'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockFields } from '@/lib/admin/content';

/** What every block's fields get from the editor. */
export interface FieldsProps<T> {
  value: T;
  onChange: (next: T) => void;
  errors: BlockFields;
  /** Read only (ESS Staff on business and legal details). */
  disabled: boolean;
}

/** Runs `pick(root)` after the next render and focuses what it returns (lists change, then focus moves). */
export function useFocusAfterRender() {
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<((root: HTMLElement) => HTMLElement | null) | null>(null);
  useEffect(() => {
    const pick = pending.current;
    if (!pick || !root.current) return;
    pending.current = null;
    pick(root.current)?.focus();
  });
  return {
    root,
    focusLater: (pick: (root: HTMLElement) => HTMLElement | null) => {
      pending.current = pick;
    },
  };
}

const enabled = (el: HTMLElement | null) => (el && !el.hasAttribute('disabled') ? el : null);

/**
 * A list of items (offers, questions, legal sections) that can be added, removed and moved. Each
 * item keeps its own key while it moves, so focus can follow it: after "Move down" the focus is on
 * the same item's move button in its new place.
 */
export function useItemList<T>(items: readonly T[], setItems: (next: T[]) => void, make: () => T) {
  const counter = useRef(0);
  const [keys, setKeys] = useState<string[]>(() => items.map((_, i) => `k${i}`));
  // If the list was replaced from outside (after saving), keep a key per item.
  const safeKeys = keys.length === items.length ? keys : items.map((_, i) => keys[i] ?? `x${i}`);
  const { root, focusLater } = useFocusAfterRender();
  const firstInput = (key: string) => (r: HTMLElement) => r.querySelector<HTMLElement>(`[data-item="${key}"] input, [data-item="${key}"] textarea`);

  return {
    root,
    keys: safeKeys,
    focusLater,
    add() {
      const key = `n${counter.current++}`;
      setItems([...items, make()]);
      setKeys([...safeKeys, key]);
      focusLater(firstInput(key));
    },
    remove(i: number) {
      const neighbour = safeKeys[i + 1] ?? safeKeys[i - 1];
      setItems(items.filter((_, j) => j !== i));
      setKeys(safeKeys.filter((_, j) => j !== i));
      focusLater((r) => (neighbour ? firstInput(neighbour)(r) : r.querySelector<HTMLElement>('[data-list-add]')));
    },
    move(i: number, by: -1 | 1) {
      const j = i + by;
      if (j < 0 || j >= items.length) return;
      const swap = <X,>(list: readonly X[]) => {
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      };
      const key = safeKeys[i];
      setItems(swap(items));
      setKeys(swap(safeKeys));
      const dir = by < 0 ? 'up' : 'down';
      const other = by < 0 ? 'down' : 'up';
      focusLater(
        (r) =>
          enabled(r.querySelector<HTMLElement>(`[data-item="${key}"] [data-move="${dir}"]`)) ??
          r.querySelector<HTMLElement>(`[data-item="${key}"] [data-move="${other}"]`),
      );
    },
  };
}

/** "Up", "Down", "Remove" for one item; the names say which item ("Move section 2 up"). */
export function ItemControls({
  noun,
  index,
  count,
  onMove,
  onRemove,
  removeLabel,
}: {
  noun: string;
  index: number;
  count: number;
  onMove?: (by: -1 | 1) => void;
  onRemove: () => void;
  removeLabel?: string;
}) {
  const n = index + 1;
  return (
    <div className="flex flex-wrap gap-2">
      {onMove && (
        <>
          <Button variant="glass" size="sm" data-move="up" aria-label={`Move ${noun} ${n} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" size={18} />
            Up
          </Button>
          <Button variant="glass" size="sm" data-move="down" aria-label={`Move ${noun} ${n} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden="true" size={18} />
            Down
          </Button>
        </>
      )}
      <Button variant="glass" size="sm" aria-label={removeLabel ?? `Remove ${noun} ${n}`} onClick={onRemove}>
        <Trash2 aria-hidden="true" size={18} />
        Remove
      </Button>
    </div>
  );
}

/** "Add …" under a list. `kind="paragraph"` is the one inside a legal section (focus goes back to it). */
export function AddButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  kind = 'list',
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  kind?: 'list' | 'paragraph';
}) {
  const marker = kind === 'list' ? { 'data-list-add': '' } : { 'data-add-paragraph': '' };
  return (
    <Button variant="glass" size="sm" {...marker} aria-label={ariaLabel} onClick={onClick} disabled={disabled} className="self-start">
      <Plus aria-hidden="true" size={18} />
      {children}
    </Button>
  );
}

/** A message about a whole list ("Add at least one section."), shown under it. */
export function ListProblem({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-semibold text-heat-text">{message}</p>;
}

/** One item in a list: a glass card with its own legend ("Offer 1"). */
export function ItemCard({ itemKey, legend, children }: { itemKey: string; legend: string; children: ReactNode }) {
  return (
    <fieldset data-item={itemKey} className="min-w-0 rounded-[20px] border border-line p-4">
      <legend className="px-1 text-base font-bold text-ink">{legend}</legend>
      <div className="mt-2 flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}
