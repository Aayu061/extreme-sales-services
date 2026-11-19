/**
 * Photo-coordinate maths for the hero: the AC overlay (ESS wordmark, display, airflow) is drawn
 * in the photo's own pixel space, and the rain is clipped to the window, so both stay glued to
 * the photo on every screen size. The photos are shown with object-fit: cover, centred across
 * and anchored to the top (so the AC never slips under the menu on wide screens).
 */

export type Pt = readonly [number, number];
type Quad = readonly [Pt, Pt, Pt, Pt];

export interface AcFrame {
  image: { w: number; h: number };
  /** AC front panel corners as seen in the photo: top-left, top-right, bottom-right, bottom-left. */
  face: Quad;
  /** Centre line of the open air slot under the flap (left end, right end). */
  vent: readonly [Pt, Pt];
  /** Where the cool air travels from the vent, and how many ribbons. */
  flow: { dx: number; dy: number; n: number };
  /** Window glass area for the rain: x0, y0, x1, y1. */
  window: readonly [number, number, number, number];
}

/** Measured on the owner's open-flap photos in web/public/hero (desktop 1672×941, phone 941×1672). */
export const AC_FRAMES: { desktop: AcFrame; phone: AcFrame } = {
  desktop: {
    image: { w: 1672, h: 941 },
    face: [[1240, 155], [1582, 67], [1580, 192], [1240, 253]],
    vent: [[1262, 260], [1566, 214]],
    flow: { dx: -250, dy: 330, n: 9 },
    window: [0, 0, 965, 790],
  },
  phone: {
    image: { w: 941, h: 1672 },
    face: [[522, 300], [861, 203], [860, 345], [522, 415]],
    vent: [[553, 428], [845, 368]],
    flow: { dx: -210, dy: 330, n: 6 },
    window: [0, 140, 470, 1210],
  },
};

const r4 = (n: number) => Math.round(n * 1e4) / 1e4 + 0; // + 0 turns -0 into 0

/** Point on the panel at (u, v), each 0..1 across and down (bilinear). */
export function onFace(face: Quad, u: number, v: number): Pt {
  const top = [face[0][0] + (face[1][0] - face[0][0]) * u, face[0][1] + (face[1][1] - face[0][1]) * u];
  const bot = [face[3][0] + (face[2][0] - face[3][0]) * u, face[3][1] + (face[2][1] - face[3][1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
}

/** SVG matrix laying a w × h drawing onto the panel area u0..u1 / v0..v1, following its angle. */
export function faceMatrix(face: Quad, u0: number, v0: number, u1: number, v1: number, w: number, h: number): string {
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const l = onFace(face, u0, vc);
  const r = onFace(face, u1, vc);
  const t = onFace(face, uc, v0);
  const b = onFace(face, uc, v1);
  const m = onFace(face, uc, vc);
  const hx = [(r[0] - l[0]) / w, (r[1] - l[1]) / w];
  const vy = [(b[0] - t[0]) / h, (b[1] - t[1]) / h];
  const ox = m[0] - (hx[0] * w) / 2 - (vy[0] * h) / 2;
  const oy = m[1] - (hx[1] * w) / 2 - (vy[1] * h) / 2;
  return `matrix(${[hx[0], hx[1], vy[0], vy[1], ox, oy].map(r4).join(' ')})`;
}

/** Where a photo rectangle lands on screen when the photo covers a viewW × viewH box (top-aligned). */
export function coverRect(
  viewW: number,
  viewH: number,
  imgW: number,
  imgH: number,
  rect: readonly [number, number, number, number],
): { x: number; y: number; w: number; h: number } {
  const s = Math.max(viewW / imgW, viewH / imgH);
  const ox = (viewW - imgW * s) / 2;
  return { x: ox + rect[0] * s, y: rect[1] * s, w: (rect[2] - rect[0]) * s, h: (rect[3] - rect[1]) * s };
}

/** Screen ellipse covering the AC panel and the flap below it, for the flap-closed photo layer. */
export function acMaskEllipse(frame: AcFrame, viewW: number, viewH: number): { cx: number; cy: number; rx: number; ry: number } {
  const xs = [...frame.face.map((p) => p[0]), frame.vent[0][0], frame.vent[1][0]];
  const ys = [...frame.face.map((p) => p[1]), frame.vent[0][1] + 40, frame.vent[1][1] + 40];
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const r = coverRect(viewW, viewH, frame.image.w, frame.image.h, [x0, y0, x1, y1]);
  const margin = 40;
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, rx: r.w / 2 + margin, ry: r.h / 2 + margin };
}
