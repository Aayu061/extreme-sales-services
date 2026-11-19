import { describe, expect, it } from 'vitest';
import { activeOffers } from '@/lib/offers';

// 20 Nov 2026, 00:30 in India = 19 Nov 2026 19:00 UTC.
const justAfterMidnightIst = new Date('2026-11-19T19:00:00Z');

describe('activeOffers', () => {
  it('returns nothing for a missing or malformed list', () => {
    expect(activeOffers(undefined, justAfterMidnightIst)).toEqual([]);
    expect(activeOffers({ title: 'x' }, justAfterMidnightIst)).toEqual([]);
  });

  it('drops items without a title or with a link that leaves the site', () => {
    const items = [
      { title: '' },
      { text: 'no title' },
      { title: 'External', href: 'https://example.com' },
      { title: 'Protocol-relative', href: '//example.com' },
      { title: 'Good', href: '/amc' },
      { title: 'No link' },
    ];
    expect(activeOffers(items, justAfterMidnightIst).map((o) => o.title)).toEqual(['Good', 'No link']);
  });

  it('uses the India date for the last day of an offer', () => {
    const items = [
      { title: 'Ended yesterday (India)', endsOn: '2026-11-19' },
      { title: 'Ends today (India)', endsOn: '2026-11-20' },
    ];
    expect(activeOffers(items, justAfterMidnightIst).map((o) => o.title)).toEqual(['Ends today (India)']);
  });
});
