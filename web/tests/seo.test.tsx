// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import products from '../dev/fixtures/products.json';
import { fixtureCatalog } from './helpers/catalog';
import { localBusinessLd, productLd, serviceLd } from '@/lib/seo';
import { JsonLd } from '@/components/site/json-ld';
import { FALLBACK_IDENTITY } from '@/lib/data';
import type { Product } from '@/lib/pys/types';

const all = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];
const svc = (code: string) => fixtureCatalog.services.find((s) => s.code === code)!;
const SITE = 'https://x.test';

describe('localBusinessLd', () => {
  it('describes the business with only confirmed facts', () => {
    const ld = localBusinessLd(FALLBACK_IDENTITY, SITE) as Record<string, any>;
    expect(ld['@type']).toBe('HVACBusiness');
    expect(ld.taxID).toBe('27ANTPP9778J1ZO');
    expect(ld.url).toBe(SITE);
    expect(ld.address.addressCountry).toBe('IN');
    expect(ld).not.toHaveProperty('aggregateRating');
    expect(ld).not.toHaveProperty('review');
  });
});

describe('serviceLd', () => {
  it('lists a price only when the service has one', () => {
    expect(serviceLd(svc('SVC-PCB'), SITE)).not.toHaveProperty('offers');
    expect((serviceLd(svc('SVC-JET-WASH'), SITE) as Record<string, any>).offers.price).toBe(1414.82);
    expect((serviceLd(svc('SVC-JET-WASH'), SITE) as Record<string, any>).url).toBe(`${SITE}/services/svc-jet-wash`);
  });
});

describe('productLd', () => {
  it('marks stock and seller, and leaves out offers without a price', () => {
    const priced = all.find((p) => p.price !== null)!;
    const ld = productLd({ ...priced, inStock: false }, SITE) as Record<string, any>;
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
    expect(ld.offers.priceCurrency).toBe('INR');
    expect(ld.offers.seller.name).toBe(priced.seller.name);
    expect(productLd(all.find((p) => p.price === null)!, SITE)).not.toHaveProperty('offers');
  });
});

describe('JsonLd', () => {
  it('cannot be broken out of with a closing script tag', () => {
    const { container } = render(<JsonLd data={{ name: 'Bad </script><script>alert(1)</script>' }} />);
    const html = container.innerHTML;
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(container.querySelector('script')!.textContent!).name).toBe('Bad </script><script>alert(1)</script>');
  });
});
