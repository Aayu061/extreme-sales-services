/**
 * The customer's request basket: services, AMC plans and new ACs sent to PYS as one request.
 * It only remembers what was chosen (never prices or personal details); prices are looked up
 * from the live catalog every time it is shown. Limits match PYS (30 lines, 1–20 of each).
 */

export type LineType = 'SERVICE' | 'AMC' | 'PRODUCT';
export type AcType = 'SPLIT' | 'WINDOW' | 'CASSETTE' | 'TOWER' | 'UNKNOWN';

export interface LineAc {
  type?: AcType;
  tonnage?: number;
}

export interface BasketLine {
  key: string;
  type: LineType;
  /** Service code, AMC plan code or product id. */
  ref: string;
  /** Shown if the live catalog cannot be reached. */
  name: string;
  quantity: number;
  ac?: LineAc;
}

export interface Basket {
  v: 1;
  lines: BasketLine[];
}

export interface NewLine {
  type: LineType;
  ref: string;
  name: string;
  quantity?: number;
  ac?: LineAc;
}

export const BASKET_KEY = 'ess-basket';
/** New ACs are enquired about, not booked: they live in their own list. */
export const ENQUIRY_KEY = 'ess-enquiry';
export const BOOKING_TYPES: readonly LineType[] = ['SERVICE', 'AMC'];
export const ENQUIRY_TYPES: readonly LineType[] = ['PRODUCT'];
export const MAX_LINES = 30;
export const MAX_QTY = 20;
export const EMPTY_BASKET: Basket = Object.freeze({ v: 1, lines: [] }) as unknown as Basket;

const LINE_TYPES: readonly LineType[] = ['SERVICE', 'AMC', 'PRODUCT'];
const AC_TYPES: readonly AcType[] = ['SPLIT', 'WINDOW', 'CASSETTE', 'TOWER', 'UNKNOWN'];

const clampQty = (q: number) => Math.min(MAX_QTY, Math.max(1, Math.round(q)));

export function lineKey(type: LineType, ref: string, ac?: LineAc): string {
  return `${type}:${ref}:${ac?.type ?? ''}:${ac?.tonnage ?? ''}`;
}

/** Drops empty AC fields so "no AC details" always looks the same. */
function cleanAc(ac?: LineAc): LineAc | undefined {
  if (!ac) return undefined;
  const out: LineAc = {};
  if (ac.type && AC_TYPES.includes(ac.type)) out.type = ac.type;
  if (typeof ac.tonnage === 'number' && Number.isFinite(ac.tonnage) && ac.tonnage > 0 && ac.tonnage <= 50) out.tonnage = ac.tonnage;
  return out.type || out.tonnage !== undefined ? out : undefined;
}

/** Adds a line. Tapping Add again for the same item changes nothing ('exists'): quantity is set with the stepper. */
export function addLine(b: Basket, line: NewLine): { basket: Basket; result: 'added' | 'exists' | 'full' } {
  const ac = cleanAc(line.ac);
  const key = lineKey(line.type, line.ref, ac);
  const qty = clampQty(line.quantity ?? 1);
  if (b.lines.some((l) => l.key === key)) return { basket: b, result: 'exists' };
  if (b.lines.length >= MAX_LINES) return { basket: b, result: 'full' };
  const next: BasketLine = { key, type: line.type, ref: line.ref, name: line.name, quantity: qty, ...(ac ? { ac } : {}) };
  return { basket: { v: 1, lines: [...b.lines, next] }, result: 'added' };
}

export function removeLine(b: Basket, key: string): Basket {
  return { v: 1, lines: b.lines.filter((l) => l.key !== key) };
}

export function setQuantity(b: Basket, key: string, q: number): Basket {
  return { v: 1, lines: b.lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(q) } : l)) };
}

/** Changes a line's AC details; if that makes it the same as another line, the two are merged. */
export function setLineAc(b: Basket, key: string, ac: LineAc | undefined): Basket {
  const line = b.lines.find((l) => l.key === key);
  if (!line) return b;
  const cleaned = cleanAc(ac);
  const newKey = lineKey(line.type, line.ref, cleaned);
  if (newKey === key) return b;
  const target = b.lines.find((l) => l.key === newKey);
  if (target) {
    return {
      v: 1,
      lines: b.lines
        .filter((l) => l.key !== key)
        .map((l) => (l.key === newKey ? { ...l, quantity: clampQty(l.quantity + line.quantity) } : l)),
    };
  }
  const moved: BasketLine = { key: newKey, type: line.type, ref: line.ref, name: line.name, quantity: line.quantity, ...(cleaned ? { ac: cleaned } : {}) };
  return { v: 1, lines: b.lines.map((l) => (l.key === key ? moved : l)) };
}

/** Reads a saved basket; anything broken, old or unexpected is dropped rather than trusted. */
export function parseBasket(raw: string | null, types: readonly LineType[] = LINE_TYPES): Basket {
  if (!raw) return EMPTY_BASKET;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_BASKET;
  }
  if (!data || typeof data !== 'object' || (data as { v?: unknown }).v !== 1 || !Array.isArray((data as { lines?: unknown }).lines)) {
    return EMPTY_BASKET;
  }
  let basket: Basket = { v: 1, lines: [] };
  for (const item of (data as { lines: unknown[] }).lines) {
    if (!item || typeof item !== 'object') continue;
    const l = item as Record<string, unknown>;
    if (!types.includes(l.type as LineType)) continue;
    if (typeof l.ref !== 'string' || !l.ref.trim() || l.ref.length > 100) continue;
    if (typeof l.quantity !== 'number' || !Number.isInteger(l.quantity)) continue;
    const name = typeof l.name === 'string' ? l.name.slice(0, 200) : l.ref;
    const ac = l.ac && typeof l.ac === 'object' ? (l.ac as LineAc) : undefined;
    basket = addLine(basket, { type: l.type as LineType, ref: l.ref.trim(), name, quantity: l.quantity, ac }).basket;
  }
  return basket.lines.length ? basket : EMPTY_BASKET;
}

/**
 * Before the AC enquiry list existed, ACs were saved in the booking basket. This moves them across
 * once. Returns null when there is nothing to move.
 */
export function splitLegacyBasket(basketRaw: string | null, enquiryRaw: string | null): { basket: Basket; enquiry: Basket } | null {
  const legacy = parseBasket(basketRaw, ENQUIRY_TYPES);
  if (!legacy.lines.length) return null;
  let enquiry = parseBasket(enquiryRaw, ENQUIRY_TYPES);
  for (const l of legacy.lines) enquiry = addLine(enquiry, l).basket;
  return { basket: parseBasket(basketRaw, BOOKING_TYPES), enquiry };
}
