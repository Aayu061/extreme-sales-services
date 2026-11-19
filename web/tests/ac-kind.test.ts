import { describe, expect, it } from 'vitest';
import { acTypeTiles, kindOf } from '@/lib/ac-kind';
import products from '../dev/fixtures/products.json';
import type { Product } from '@/lib/pys/types';

const fixtureProducts = products as unknown as Product[];

describe('kindOf', () => {
  it('reads the AC type from the product name', () => {
    expect(kindOf('Voltas 1.5 Ton 3-Star Window AC (Copper Condenser)')).toBe('window');
    expect(kindOf('Blue Star 4.0 TR Floor Standing Tower AC')).toBe('tower');
    expect(kindOf('Mitsubishi Electric 2.0 TR 4-Way Ceiling Cassette Inverter AC')).toBe('cassette');
    expect(kindOf('Daikin 1.0 Ton 3-Star Inverter Split AC (FTKL Series)')).toBe('split');
  });
});

describe('acTypeTiles', () => {
  it('always gives the four types in order, with the lowest in-stock price for each', () => {
    const tiles = acTypeTiles(fixtureProducts);
    expect(tiles.map((t) => t.label)).toEqual(['Split', 'Window', 'Cassette', 'Floor-standing']);
    expect(tiles.find((t) => t.kind === 'window')!.from).toBe(28990);
    expect(tiles.find((t) => t.kind === 'split')!.from).toBe(33990);
    expect(tiles.find((t) => t.kind === 'tower')!.href).toBe('/shop?type=tower');
  });

  it('shows no price when nothing of that type is in stock with a price', () => {
    expect(acTypeTiles([]).every((t) => t.from === null)).toBe(true);
    const outOfStock = fixtureProducts.map((p) => ({ ...p, inStock: false }));
    expect(acTypeTiles(outOfStock).every((t) => t.from === null)).toBe(true);
  });
});
