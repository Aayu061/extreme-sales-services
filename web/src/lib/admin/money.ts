/**
 * Prices typed by ESS staff (client-safe). PYS keeps prices as rupees (a number, paise as
 * decimals), GST included, more than 0 and at most ₹1,00,00,000 (enquiryQuoteSchema, `money`
 * in server/src/validators/ess.validator.ts). The browser checks first for a quick message; the
 * server action parses again and only ever sends PYS the number it parsed itself.
 */

/** ₹1,00,00,000 (1 crore): the most PYS accepts for a price. */
export const MAX_PRICE = 10_000_000;

export const PRICE_MESSAGES = {
  invalid: 'Enter the price per AC, e.g. 40,500.',
  tooHigh: 'The price can be at most ₹1,00,00,000 per AC.',
} as const;

/**
 * Optional ₹ / Rs / INR in front, then whole rupees written plainly (40500) or with commas in
 * Indian or international groups (40,500 · 1,50,000 · 150,000), up to two digits of paise, and an
 * optional "/-" at the end. No signs, exponents or words.
 */
const RUPEES = /^(?:₹|rs\.?|inr)?\s*(\d+|\d{1,3}(?:,\d{2})*,\d{3}|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?\s*(?:\/-)?$/i;

/** The amount as a number of rupees, or null when it isn't one (including 0 and above the limit). */
function read(input: string): number | null {
  const m = RUPEES.exec((input ?? '').trim());
  if (!m) return null;
  const whole = m[1].replace(/,/g, '');
  const n = Number(m[2] ? `${whole}.${m[2]}` : whole);
  return Number.isFinite(n) ? n : null;
}

/**
 * "40500", "40,500", "₹40,500", "1,50,000.50", "40500.5" → rupees. 0, negatives, words and anything
 * over 1 crore → null.
 */
export function parseRupees(input: string): number | null {
  const n = read(input);
  if (n === null || n <= 0 || n > MAX_PRICE) return null;
  return Math.round(n * 100) / 100;
}

/** What is wrong with a typed price, in plain words, or null when it is fine. */
export function priceError(input: string): string | null {
  if (parseRupees(input) !== null) return null;
  const n = read(input);
  return n !== null && n > MAX_PRICE ? PRICE_MESSAGES.tooHigh : PRICE_MESSAGES.invalid;
}
