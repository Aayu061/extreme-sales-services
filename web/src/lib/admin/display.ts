import type { AdminCatalogDisplay, DisplayPatchItem } from './types';

/**
 * "Services shown": which services and AMC plans the website lists, and in what order. Prices are
 * not changed here (they are set in PYS). The screen edits a copy of PYS's lists and sends PYS only
 * the rows whose shown flag or place changed (PATCH /catalog-display { items }).
 *
 * PYS rules mirrored here (catalogDisplayPatchSchema, strict): 1–200 items; each
 * { type: 'SERVICE' | 'AMC', code: /^[A-Za-z0-9-]{1,60}$/ (trimmed), isPublic?: boolean,
 * displayOrder?: whole number 0–1,00,000 }. The site also refuses an item that changes nothing.
 */

export type DisplayKind = DisplayPatchItem['type'];

/** One row on the screen. */
export interface DisplayRow {
  type: DisplayKind;
  code: string;
  name: string;
  isPublic: boolean;
  /** false = switched off in PYS: never on the website, whatever "shown" says. */
  isActive: boolean;
  displayOrder: number;
}

export const DISPLAY_MESSAGES = {
  invalid: 'These changes could not be saved. Reload the page and try again.',
  notSaved: 'PYS could not save these changes. Reload the page and try again.',
  gone: 'One of these is no longer in PYS. Reload the page to see the current list.',
  saved: 'Saved. The website shows the change now.',
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
} as const;

const CODE_RE = /^[A-Za-z0-9-]{1,60}$/;
const MAX_ORDER = 100_000;
const MAX_ITEMS = 200;

/** `list` with the row at `index` moved one place (-1 up, 1 down). At an edge nothing moves. Always a new list. */
export function moveItem<T>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const out = [...list];
  const to = index + dir;
  if (!Number.isInteger(index) || index < 0 || index >= out.length || to < 0 || to >= out.length) return out;
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

/** PYS's lists as screen rows, in display order (rows with the same number keep PYS's order). */
export function displayRows(display: AdminCatalogDisplay): { services: DisplayRow[]; amcPlans: DisplayRow[] } {
  const rows = (type: DisplayKind, list: AdminCatalogDisplay['services']): DisplayRow[] =>
    list
      .map((s, i) => ({ row: { type, code: s.code, name: s.name, isPublic: s.isPublic, isActive: s.isActive, displayOrder: s.displayOrder }, i }))
      .sort((a, b) => a.row.displayOrder - b.row.displayOrder || a.i - b.i)
      .map((x) => x.row);
  return { services: rows('SERVICE', display.services), amcPlans: rows('AMC', display.amcPlans) };
}

const sameOrder = (a: readonly DisplayRow[], b: readonly DisplayRow[]) => a.length === b.length && a.every((r, i) => r.code === b[i].code);

/**
 * The place numbers for `now`'s rows. Unmoved: the saved numbers. Moved: the saved numbers handed
 * out again in the new order (so a swap changes just two rows); if the saved numbers have ties
 * (PYS's default is 100) or are out of PYS's range, the list is numbered 10, 20, 30 … instead.
 */
function placeNumbers(saved: readonly DisplayRow[], now: readonly DisplayRow[]): number[] {
  if (sameOrder(saved, now)) return now.map((r) => saved.find((s) => s.code === r.code)?.displayOrder ?? r.displayOrder);
  const slots = saved.map((r) => r.displayOrder).sort((a, b) => a - b);
  const usable =
    slots.length === now.length &&
    slots.every((n, i) => Number.isInteger(n) && n >= 0 && n <= MAX_ORDER && (i === 0 || n > slots[i - 1]));
  return usable ? slots : now.map((_, i) => (i + 1) * 10);
}

/** What to send PYS for one group: only rows whose shown flag or place changed, with only what changed. */
export function displayChanges(saved: readonly DisplayRow[], now: readonly DisplayRow[]): DisplayPatchItem[] {
  const before = new Map(saved.map((r) => [r.code, r]));
  const places = placeNumbers(saved, now);
  const items: DisplayPatchItem[] = [];
  now.forEach((row, i) => {
    const was = before.get(row.code);
    if (!was) return;
    const item: DisplayPatchItem = { type: row.type, code: row.code };
    if (row.isPublic !== was.isPublic) item.isPublic = row.isPublic;
    if (places[i] !== was.displayOrder) item.displayOrder = places[i];
    if (item.isPublic !== undefined || item.displayOrder !== undefined) items.push(item);
  });
  return items;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The server action's own check of what the browser sent (never trusted as it is). */
export function checkDisplayItems(raw: unknown): { ok: true; items: DisplayPatchItem[] } | { ok: false } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ITEMS) return { ok: false };
  const items: DisplayPatchItem[] = [];
  const seen = new Set<string>();
  for (const it of raw) {
    if (!isObject(it)) return { ok: false };
    if (Object.keys(it).some((k) => !['type', 'code', 'isPublic', 'displayOrder'].includes(k))) return { ok: false };
    if (it.type !== 'SERVICE' && it.type !== 'AMC') return { ok: false };
    const code = typeof it.code === 'string' ? it.code.trim() : '';
    if (!CODE_RE.test(code)) return { ok: false };
    const item: DisplayPatchItem = { type: it.type, code };
    if (it.isPublic !== undefined) {
      if (typeof it.isPublic !== 'boolean') return { ok: false };
      item.isPublic = it.isPublic;
    }
    if (it.displayOrder !== undefined) {
      const n = it.displayOrder;
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_ORDER) return { ok: false };
      item.displayOrder = n;
    }
    if (item.isPublic === undefined && item.displayOrder === undefined) return { ok: false };
    const key = `${item.type}:${item.code}`;
    if (seen.has(key)) return { ok: false };
    seen.add(key);
    items.push(item);
  }
  return { ok: true, items };
}
