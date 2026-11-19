'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  addLine,
  BASKET_KEY,
  EMPTY_BASKET,
  parseBasket,
  removeLine,
  setLineAc,
  setQuantity,
  type Basket,
  type LineAc,
  type NewLine,
} from '@/lib/basket';

/**
 * The basket shared by every page on this device (localStorage). If the browser blocks storage
 * (private mode, full disk) the basket still works for this visit, kept in memory.
 */
const CHANGE_EVENT = 'ess-basket-change';
let memory: string | null = null;
let cache: { raw: string | null; basket: Basket } = { raw: null, basket: EMPTY_BASKET };

function readRaw(): string | null {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(BASKET_KEY);
  } catch {
    return null;
  }
}

function snapshot(): Basket {
  const raw = readRaw();
  if (raw !== cache.raw) cache = { raw, basket: parseBasket(raw) };
  return cache.basket;
}

function write(b: Basket) {
  const raw = JSON.stringify(b);
  try {
    window.localStorage.setItem(BASKET_KEY, raw);
    memory = null;
  } catch {
    memory = raw;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === BASKET_KEY || e.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const serverSnapshot = () => EMPTY_BASKET;

export function useBasket() {
  const basket = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const add = useCallback((line: NewLine) => {
    const { basket: next, result } = addLine(snapshot(), line);
    if (result !== 'full') write(next);
    return result;
  }, []);
  const remove = useCallback((key: string) => write(removeLine(snapshot(), key)), []);
  const setQty = useCallback((key: string, q: number) => write(setQuantity(snapshot(), key, q)), []);
  const setAc = useCallback((key: string, ac: LineAc | undefined) => write(setLineAc(snapshot(), key, ac)), []);
  const clear = useCallback(() => write(EMPTY_BASKET), []);
  return { basket, add, remove, setQuantity: setQty, setAc, clear };
}
