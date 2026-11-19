import { describe, expect, it } from 'vitest';
import { AC_FRAMES, acMaskEllipse, coverRect, faceMatrix, onFace } from '@/lib/hero-geometry';

const square = [[0, 0], [100, 0], [100, 100], [0, 100]] as const;

describe('onFace', () => {
  it('returns the panel corners at (0,0) and (1,1)', () => {
    const face = AC_FRAMES.desktop.face;
    expect(onFace(face, 0, 0)).toEqual(face[0]);
    expect(onFace(face, 1, 1)).toEqual(face[2]);
  });

  it('interpolates inside the panel', () => {
    expect(onFace(square, 0.5, 0.25)).toEqual([50, 25]);
  });
});

describe('faceMatrix', () => {
  it('is the identity for a 100 × 100 drawing on a 100 px square panel', () => {
    expect(faceMatrix(square, 0, 0, 1, 1, 100, 100)).toBe('matrix(1 0 0 1 0 0)');
  });

  it('places a drawing on part of the panel', () => {
    // right half of the square, drawn 50 wide and 100 tall
    expect(faceMatrix(square, 0.5, 0, 1, 1, 50, 100)).toBe('matrix(1 0 0 1 50 0)');
  });
});

describe('coverRect (object-fit: cover, centred across, anchored to the top)', () => {
  it('maps a rectangle 1:1 when the view matches the photo', () => {
    expect(coverRect(1672, 941, 1672, 941, [0, 0, 965, 790])).toEqual({ x: 0, y: 0, w: 965, h: 790 });
  });

  it('crops the sides equally when the view is narrower', () => {
    const r = coverRect(836, 941, 1672, 941, [0, 0, 1672, 941]);
    expect(r.w).toBe(1672);
    expect(r.x).toBe(-418);
  });

  it('keeps the top edge when the view is wider (photo taller than the view)', () => {
    expect(coverRect(1920, 935, 1672, 941, [0, 0, 1672, 941]).y).toBe(0);
  });
});

describe('acMaskEllipse', () => {
  it('covers the AC panel and vent with a margin, in screen pixels', () => {
    const e = acMaskEllipse(AC_FRAMES.desktop, 1672, 941);
    // face spans x 1240..1582, y 67..253; vent reaches y 260 + 40 below for the flap
    expect(e.cx).toBeCloseTo((1240 + 1582) / 2, 0);
    expect(e.rx).toBeGreaterThan((1582 - 1240) / 2);
    expect(e.cy - e.ry).toBeLessThan(67);
    expect(e.cy + e.ry).toBeGreaterThan(260);
  });
});
