import { describe, expect, it } from 'vitest';
import { serviceAnswer } from '@/lib/answer';
import { fixtureServices } from './helpers/catalog';

describe('serviceAnswer', () => {
  it('gives the live "from" price and booking links for a priced service', () => {
    expect(serviceAnswer('SVC-DIAG', fixtureServices)).toEqual({
      serviceName: 'Diagnosis visit',
      priceText: 'From ₹529.82',
      bookHref: '/book?service=SVC-DIAG',
      detailHref: '/services/svc-diag',
    });
  });

  it('says "Price after inspection" for repairs priced after diagnosis', () => {
    const a = serviceAnswer('SVC-PCB', fixtureServices);
    expect(a.priceText).toBe('Price after inspection');
    expect(a.bookHref).toBe('/book?service=SVC-PCB');
  });

  it('never invents a price when the service is missing from the catalog', () => {
    expect(serviceAnswer('SVC-NOPE', fixtureServices)).toEqual({
      serviceName: null,
      priceText: 'Call us for this one',
      bookHref: null,
      detailHref: null,
    });
    expect(serviceAnswer('SVC-GAS', []).priceText).toBe('Call us for this one');
  });
});
