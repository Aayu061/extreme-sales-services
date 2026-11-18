import type { CatalogService, PriceBreakup } from '@/lib/pys/types';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,199 — whole rupees when the amount is whole, otherwise with paise. */
export function formatInr(amount: number): string {
  return Number.isInteger(amount) ? inr.format(amount) : inrPaise.format(amount);
}

/** How a service price reads on the site: exact, "from", or "after inspection". */
export function servicePriceText(service: Pick<CatalogService, 'pricingModel' | 'price'>): string {
  if (service.pricingModel === 'QUOTE_AFTER_DIAGNOSIS' || !service.price) return 'Price after inspection';
  return service.pricingModel === 'FROM' ? `From ${formatInr(service.price.total)}` : formatInr(service.price.total);
}

/** "₹1,016 + ₹183 GST (18%)" for the price breakup. */
export function gstBreakupText(price: PriceBreakup): string {
  if (!price.gstRatePercent) return `${formatInr(price.total)} (no GST)`;
  return `${formatInr(price.base)} + ${formatInr(price.gst)} GST (${price.gstRatePercent}%)`;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** "2026-11-25" → "Wed, 25 Nov 2026" (India time; same wording as the PYS emails). */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const part = (type: string) => dateFmt.formatToParts(d).find((p) => p.type === type)?.value ?? '';
  return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`;
}

/** Lowest GST-inclusive price across the catalog items given (for "from ₹…" summaries). */
export function lowestTotal(prices: Array<PriceBreakup | null | undefined>): number | null {
  const totals = prices.filter((p): p is PriceBreakup => Boolean(p)).map((p) => p.total);
  return totals.length ? Math.min(...totals) : null;
}
