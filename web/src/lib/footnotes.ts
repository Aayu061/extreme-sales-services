/**
 * Footnote stars: things with conditions carry a star, and the note under the page says what the
 * condition is (owner decision 2026-11-20). The first note on a page is *, the second **.
 */
export const FOOTNOTES = {
  warranty: 'On our work, from the day the work is done. See Terms.',
  inspection: 'We tell you the price before any work.',
  acPrice: 'Listed price incl. GST; final price and stock confirmed by the seller.',
  amc: 'Per AC per year, incl. GST. See Terms.',
} as const;

export type FootnoteId = keyof typeof FOOTNOTES;

export function footnoteMarks<T extends FootnoteId>(ids: readonly T[]): Record<T, string> {
  return Object.fromEntries(ids.map((id, i) => [id, '*'.repeat(i + 1)])) as Record<T, string>;
}
