'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  addLine,
  BASKET_KEY,
  BOOKING_TYPES,
  EMPTY_BASKET,
  ENQUIRY_KEY,
  ENQUIRY_TYPES,
  parseBasket,
  removeLine,
  setLineAc,
  setQuantity,
  splitLegacyBasket,
  type Basket,
  type LineAc,
  type LineType,
  type NewLine,
} from '@/lib/basket';

/**
 * Two lists saved on this device (localStorage): the booking basket (services + AMC plans) and the
 * AC enquiry list (new ACs). If the browser blocks storage (private mode, full disk) a list still
 * works for this visit, kept in memory.
 */
const CHANGE_EVENT = 'ess-basket-change';
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string) {
  try {
    window.localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
}

/** ACs saved in the booking basket by an older version of the site move to the enquiry list. */
function moveLegacyAcs() {
  const moved = splitLegacyBasket(readRaw(BASKET_KEY), readRaw(ENQUIRY_KEY));
  if (!moved) return;
  writeRaw(BASKET_KEY, JSON.stringify(moved.basket));
  writeRaw(ENQUIRY_KEY, JSON.stringify(moved.enquiry));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function createList(key: string, types: readonly LineType[]) {
  let cache: { raw: string | null; basket: Basket } = { raw: null, basket: EMPTY_BASKET };
  const snapshot = (): Basket => {
    const raw = readRaw(key);
    if (raw !== cache.raw) cache = { raw, basket: parseBasket(raw, types) };
    return cache.basket;
  };
  const write = (b: Basket) => {
    writeRaw(key, JSON.stringify(b));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  const subscribe = (onChange: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === BASKET_KEY || e.key === null) onChange();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    moveLegacyAcs();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  };
  return { snapshot, write, subscribe };
}

const serverSnapshot = () => EMPTY_BASKET;
const bookings = createList(BASKET_KEY, BOOKING_TYPES);
const enquiries = createList(ENQUIRY_KEY, ENQUIRY_TYPES);

function useList(list: ReturnType<typeof createList>) {
  const basket = useSyncExternalStore(list.subscribe, list.snapshot, serverSnapshot);
  const add = useCallback(
    (line: NewLine) => {
      const { basket: next, result } = addLine(list.snapshot(), line);
      if (result === 'added') list.write(next);
      return result;
    },
    [list],
  );
  /** Whether this item (any AC details) is already saved: reads the store itself, not the last render. */
  const has = useCallback((type: LineType, ref: string) => list.snapshot().lines.some((l) => l.type === type && l.ref === ref), [list]);
  const remove = useCallback((key: string) => list.write(removeLine(list.snapshot(), key)), [list]);
  const setQty = useCallback((key: string, q: number) => list.write(setQuantity(list.snapshot(), key, q)), [list]);
  const setAc = useCallback((key: string, ac: LineAc | undefined) => list.write(setLineAc(list.snapshot(), key, ac)), [list]);
  const clear = useCallback(() => list.write(EMPTY_BASKET), [list]);
  return { basket, add, has, remove, setQuantity: setQty, setAc, clear };
}

/** Services and AMC plans to book. */
export const useBasket = () => useList(bookings);
/** New ACs to ask about. */
export const useEnquiry = () => useList(enquiries);
