import { describe, it, expect } from 'vitest';
import shapes from './fixtures/portal-response-shapes.json';
import * as fx from './helpers/portal-fixtures';

/**
 * Contract check with PYS. tests/fixtures/portal-response-shapes.json is a copy of PYS's
 * server/tests/fixtures/portal-response-shapes.json: the field paths of PYS's real S11b answers. The sample answers
 * the website tests use (helpers/portal-fixtures.ts) must not use a field PYS does not send, or the screens are being
 * tested against data that never arrives. A path below one PYS only ever sent as null or [] cannot be checked and is
 * allowed. When PYS changes an answer on purpose, copy its new file here. See docs/S11b-API-CONTRACT.md.
 */
type Shape = { paths: string[]; nullOrEmpty: string[] };
const PYS = shapes as Record<string, Shape>;

function pathsOf(value: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, at: string) => {
    if (Array.isArray(v)) for (const el of v) walk(el, `${at}[]`);
    else if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v)) {
        out.add(`${at}.${k}`);
        walk(child, `${at}.${k}`);
      }
    }
  };
  walk(value, '$');
  return [...out].sort();
}

/** Website sample data per PYS answer (same names as in the shape file). */
const SAMPLES: Record<string, unknown> = {
  overview: fx.overview(),
  acs: fx.acs(),
  acDetail: fx.acDetail(),
  amcList: fx.amcList(),
  amcDetail: fx.amcDetail(),
  requests: fx.requests(),
  requestDetail: fx.requestDetail(),
  report: fx.report(),
  billing: fx.billing(),
  bill: fx.bill(),
};

describe('website sample data matches what PYS really sends (shared shape file)', () => {
  it('covers every PYS answer in the shape file', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(PYS).sort());
  });

  it.each(Object.keys(SAMPLES))('%s: no field that PYS does not send', (name) => {
    const pys = PYS[name];
    const known = new Set(pys.paths);
    const unchecked = (p: string) => pys.nullOrEmpty.some((n) => p.startsWith(`${n}.`) || p.startsWith(`${n}[]`));
    const extra = pathsOf(SAMPLES[name]).filter((p) => !known.has(p) && !unchecked(p));
    expect(extra).toEqual([]);
  });
});
