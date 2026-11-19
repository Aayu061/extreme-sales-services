import { describe, expect, it } from 'vitest';
import products from '../dev/fixtures/products.json';
import { kindOf } from '@/lib/ac-kind';
import { DEFAULT_FILTERS, filterProducts, parseShopFilters, shopFacets, shopQuery, starOf, tonnageOf } from '@/lib/shop';
import type { Product } from '@/lib/pys/types';

const all = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];
const brands = shopFacets(all).brands;
const parse = (q: string) => parseShopFilters(new URLSearchParams(q), brands);
const byId = (id: string) => all.find((p) => p.id === id)!;

describe('parseShopFilters', () => {
  it('ignores unknown or broken values and matches brands without caring about case', () => {
    expect(parse('type=rocket&max=abc&star=9&brand=daikin&ton=huge&sort=cheap')).toEqual({ ...DEFAULT_FILTERS, brand: 'Daikin' });
  });

  it('round-trips through the address bar', () => {
    const f = parse('sort=price-asc&type=split&ton=1.5&brand=Voltas&star=3&max=50000');
    expect(shopQuery(f)).toBe('type=split&ton=1.5&brand=Voltas&star=3&max=50000&sort=price-asc');
    expect(parse(shopQuery(f))).toEqual(f);
    expect(shopQuery(DEFAULT_FILTERS)).toBe('');
  });
});

describe('reading product details', () => {
  it('finds the tonnage and star rating', () => {
    expect(tonnageOf(byId('CbGQjrQkG6M0D4zx9553'))).toBe(1.5);
    expect(tonnageOf(byId('oI1UpVLd2kug7WqY1ecF'))).toBeNull();
    expect(starOf(byId('eHerqnAtAO41WGbFQvYX'))).toBe(5);
    expect(starOf(byId('TLRbwbHUxbXgBIJ9eCZM'))).toBeNull();
  });
});

describe('filterProducts', () => {
  it('filters by type and size', () => {
    const out = filterProducts(all, parse('type=split&ton=1.5'));
    expect(out.length).toBeGreaterThan(0);
    out.forEach((p) => {
      expect(kindOf(p.name)).toBe('split');
      expect(tonnageOf(p)).toBe(1.5);
    });
  });

  it('keeps only priced ACs up to the chosen price', () => {
    expect(filterProducts(all, parse('max=30000')).map((p) => p.id)).toEqual(['CbGQjrQkG6M0D4zx9553']);
  });

  it('puts price-on-request ACs last when sorting by price', () => {
    const out = filterProducts(all, parse('sort=price-asc'));
    const firstUnpriced = out.findIndex((p) => p.price === null);
    expect(out.slice(firstUnpriced).every((p) => p.price === null)).toBe(true);
    expect(out[0].price).toBe(28990);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterProducts(all, parse('type=cassette&brand=Voltas'))).toEqual([]);
  });
});
