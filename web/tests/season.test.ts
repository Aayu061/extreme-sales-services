import { describe, expect, it } from 'vitest';
import { activeOffers, heroOfferCard, seasonNote } from '@/lib/season';

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

describe('seasonNote (Mumbai months, India date)', () => {
  it('suggests a foam wash in the monsoon', () => {
    const n = seasonNote(new Date('2026-07-10T06:00:00Z'));
    expect(n).toEqual({
      kind: 'season',
      title: 'Monsoon AC care',
      text: 'A foam wash clears the musty monsoon smell.',
      href: '/services/svc-foam',
      linkLabel: 'See foam wash',
    });
  });

  it('uses the India date: 31 Oct 20:00 UTC is already 1 Nov in Mumbai', () => {
    expect(seasonNote(new Date('2026-10-31T20:00:00Z')).title).toBe('Plan the year');
  });

  it('covers pre-summer and October', () => {
    expect(seasonNote(new Date('2026-04-15T06:00:00Z')).href).toBe('/services/svc-jet-wash');
    expect(seasonNote(new Date('2026-10-15T06:00:00Z')).title).toBe('October heat');
    expect(seasonNote(new Date('2026-02-15T06:00:00Z')).href).toBe('/amc');
  });
});

describe('heroOfferCard', () => {
  const d = new Date('2026-07-10T06:00:00Z');

  it('falls back to the season note when there are no offers', () => {
    expect(heroOfferCard([], d).kind).toBe('season');
  });

  it('falls back to the season note when the only offer has ended', () => {
    expect(heroOfferCard([{ title: 'Ended', endsOn: '2026-01-01' }], d).kind).toBe('season');
  });

  it('falls back when the only offer links off the site', () => {
    expect(heroOfferCard([{ title: 'Elsewhere', href: 'https://example.com' }], d).kind).toBe('season');
  });

  it('shows the first live offer', () => {
    expect(heroOfferCard([{ title: 'Jet wash week', href: '/services/svc-jet-wash' }], d)).toEqual({
      kind: 'offer',
      title: 'Jet wash week',
      text: '',
      href: '/services/svc-jet-wash',
      linkLabel: 'See the offer',
    });
  });
});
