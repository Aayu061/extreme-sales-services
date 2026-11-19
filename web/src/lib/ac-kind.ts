import type { Product } from '@/lib/pys/types';

/** The four AC shapes ESS sells, as shown in the drawings and the "New ACs" tiles. */
export type AcKind = 'split' | 'window' | 'tower' | 'cassette';

/** Reads the AC type from a product name (catalog has no type field yet). */
export function kindOf(name: string): AcKind {
  const n = name.toLowerCase();
  if (n.includes('window')) return 'window';
  if (n.includes('tower') || n.includes('floor standing')) return 'tower';
  if (n.includes('cassette') || n.includes('ceiling') || n.includes('ductable')) return 'cassette';
  return 'split';
}

export interface AcTypeTile {
  kind: AcKind;
  label: 'Split' | 'Window' | 'Cassette' | 'Floor-standing';
  /** Lowest in-stock price incl. GST for this type; null = show "See models". */
  from: number | null;
  href: string;
}

const TILES: ReadonlyArray<Pick<AcTypeTile, 'kind' | 'label'>> = [
  { kind: 'split', label: 'Split' },
  { kind: 'window', label: 'Window' },
  { kind: 'cassette', label: 'Cassette' },
  { kind: 'tower', label: 'Floor-standing' },
];

export function acTypeTiles(products: Product[]): AcTypeTile[] {
  return TILES.map(({ kind, label }) => {
    const prices = products
      .filter((p) => p.inStock && typeof p.price === 'number' && kindOf(p.name) === kind)
      .map((p) => p.price as number);
    return { kind, label, from: prices.length ? Math.min(...prices) : null, href: `/shop?type=${kind}` };
  });
}
