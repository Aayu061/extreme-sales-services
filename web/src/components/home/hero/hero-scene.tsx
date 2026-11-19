'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { AC_FRAMES, acMaskEllipse, coverRect, faceMatrix, type AcFrame } from '@/lib/hero-geometry';

gsap.registerPlugin(useGSAP);

const PHONE = '(max-width: 760px)';
const REDUCE = '(prefers-reduced-motion: reduce)';

/* ------------------------------------------------------------------ LED display */

const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc',
  '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', O: 'abcdef', N: 'ceg',
};

/** Seven-segment digits as SVG rects, laid out in the display's 100 × 46 drawing space. */
function segmentRects(text: string): Array<{ x: number; y: number; w: number; h: number; key: string }> {
  const chars = text.replace('°', '').split('');
  const w = 18;
  const h = 30;
  const t = 3.6;
  const total = chars.length * 22 + (text.includes('°') ? 10 : 0);
  const x0 = 50 - total / 2 + 2;
  const out: Array<{ x: number; y: number; w: number; h: number; key: string }> = [];
  chars.forEach((ch, i) => {
    const x = x0 + i * 22;
    const y = 8;
    const R: Record<string, [number, number, number, number]> = {
      a: [x + t, y, w - 2 * t, t],
      d: [x + t, y + h - t, w - 2 * t, t],
      g: [x + t, y + h / 2 - t / 2, w - 2 * t, t],
      f: [x, y + t, t, h / 2 - t * 1.5],
      b: [x + w - t, y + t, t, h / 2 - t * 1.5],
      e: [x, y + h / 2 + t / 2, t, h / 2 - t * 1.5],
      c: [x + w - t, y + h / 2 + t / 2, t, h / 2 - t * 1.5],
    };
    for (const s of SEGMENTS[ch] ?? '') {
      const r = R[s];
      out.push({ x: r[0], y: r[1], w: r[2], h: r[3], key: `${i}${s}` });
    }
  });
  return out;
}

function Display({ id, frame, text }: { id: string; frame: AcFrame; text: string }) {
  const rects = segmentRects(text);
  const chars = text.replace('°', '').length;
  const degX = 50 - (chars * 22 + 10) / 2 + 2 + chars * 22 + 3;
  const digits = (fill: string) => (
    <>
      {rects.map((r) => (
        <rect key={r.key} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.6} fill={fill} />
      ))}
      {text.includes('°') && <circle cx={degX} cy={11} r={3} fill="none" stroke={fill} strokeWidth={2} />}
    </>
  );
  return (
    <g transform={faceMatrix(frame.face, 0.67, 0.3, 0.94, 0.66, 100, 46)}>
      <rect width={100} height={46} rx={10} fill={`url(#${id}-gloss)`} />
      <path d="M8 4 H92 Q96 4 96 8 V14 Q50 20 4 12 V8 Q4 4 8 4 Z" fill="#fff" opacity={0.07} />
      <rect x={0.75} y={0.75} width={98.5} height={44.5} rx={9.5} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={1.5} />
      <g transform="skewX(-8) translate(4 0)" filter={`url(#${id}-soft)`} opacity={0.9}>
        {digits('#59c8ff')}
      </g>
      <g transform="skewX(-8) translate(4 0)">{digits('#eefbff')}</g>
    </g>
  );
}

/* ------------------------------------------------------------------ AC overlay */

function AcOverlay({ id, frame, text, className }: { id: string; frame: AcFrame; text: string; className: string }) {
  const [[x0, y0], [x1, y1]] = frame.vent;
  const { dx, dy, n } = frame.flow;
  const ribbons = Array.from({ length: n }, (_, i) => {
    const k = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k + 4;
    const spread = (i - n / 2) * 18;
    return `M${x} ${y} C ${x - 30} ${y + dy * 0.3}, ${x + dx * 0.45 + spread} ${y + dy * 0.55}, ${x + dx + spread * 2} ${y + dy}`;
  });
  return (
    <svg
      className={className}
      viewBox={`0 0 ${frame.image.w} ${frame.image.h}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-air`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9f6ff" />
          <stop offset=".5" stopColor="#35adff" stopOpacity=".75" />
          <stop offset="1" stopColor="#1e6bff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fdcff" stopOpacity=".8" />
          <stop offset="1" stopColor="#2a7bff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3140" />
          <stop offset=".45" stopColor="#0a0d14" />
          <stop offset="1" stopColor="#05070b" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={`${id}-cblur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      {/* ESS wordmark on the panel */}
      <g transform={faceMatrix(frame.face, 0.05, 0.44, 0.27, 0.76, 100, 40)}>
        <text
          x={2}
          y={33}
          fontSize={40}
          fontWeight={800}
          fill="#161a22"
          transform="skewX(-14)"
          letterSpacing={-1}
          style={{ fontFamily: 'var(--font-archivo)', fontStretch: '125%' }}
        >
          ESS
        </text>
      </g>

      <Display id={id} frame={frame} text={text} />

      {/* The open slot lights up from inside */}
      <g className="hero-vent" opacity={0}>
        <line x1={x0} y1={y0 + 3} x2={x1} y2={y1 + 2} stroke="#4fc3ff" strokeWidth={12} strokeLinecap="round" filter={`url(#${id}-glow)`} />
        <line x1={x0 + 6} y1={y0 + 3} x2={x1 - 6} y2={y1 + 2} stroke="#e6fbff" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* Cool air: a soft cone of light and ribbons that keep flowing */}
      <g className="hero-flows" opacity={0} style={{ mixBlendMode: 'screen' }}>
        <path
          d={`M${x0} ${y0} L${x1} ${y1} L${x1 + dx * 0.6} ${y1 + dy} L${x0 + dx * 1.35} ${y0 + dy * 0.9} Z`}
          fill={`url(#${id}-cone)`}
          filter={`url(#${id}-cblur)`}
        />
        {ribbons.map((d) => (
          <g key={d}>
            <path className="hero-wide" d={d} fill="none" stroke={`url(#${id}-air)`} strokeWidth={44} strokeLinecap="round" filter={`url(#${id}-glow)`} opacity={0.8} />
            <path className="hero-core" d={d} fill="none" stroke={`url(#${id}-air)`} strokeWidth={4} strokeLinecap="round" strokeDasharray="120 70" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ weather */

interface Drop { x: number; y: number; r: number; v: number; trail: Array<[number, number]> }
interface Speck { x: number; y: number; r: number; vx: number; vy: number; a: number }

/**
 * Live layers over the hero photo: the AC display, vent glow and cool air (in the photo's own
 * coordinates), raindrops on the window glass at night and dust in the sunlight by day, the
 * switch-on intro, and gentle depth on desktop. Reduced motion shows the final state, still.
 */
export function HeroScene() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [display, setDisplay] = useState('--');

  // Flap-closed layer: an ellipse around the AC, recomputed when the hero resizes.
  useEffect(() => {
    const layer = document.getElementById('hero-closed');
    const box = root.current;
    if (!layer || !box) return;
    const place = () => {
      const frame = matchMedia(PHONE).matches ? AC_FRAMES.phone : AC_FRAMES.desktop;
      const e = acMaskEllipse(frame, box.clientWidth, box.clientHeight);
      layer.style.setProperty('--acx', `${e.cx}px`);
      layer.style.setProperty('--acy', `${e.cy}px`);
      layer.style.setProperty('--acrx', `${e.rx}px`);
      layer.style.setProperty('--acry', `${e.ry}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Raindrops (night) or dust (day) on a canvas; paused off-screen, in background tabs and for reduced motion.
  useEffect(() => {
    const cv = canvas.current;
    const box = root.current;
    if (!cv || !box || matchMedia(REDUCE).matches) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let W = 0;
    let H = 0;
    let drops: Drop[] = [];
    let dust: Speck[] = [];
    let raf = 0;
    let visible = true;

    const windowRect = () => {
      const frame = matchMedia(PHONE).matches ? AC_FRAMES.phone : AC_FRAMES.desktop;
      return coverRect(W, H, frame.image.w, frame.image.h, frame.window);
    };
    const newDrop = (anywhere: boolean): Drop => {
      const wr = windowRect();
      return {
        x: wr.x + Math.random() * wr.w,
        y: anywhere ? wr.y + Math.random() * wr.h : wr.y - 10,
        r: Math.random() * 2.2 + 0.8,
        v: Math.random() < 0.25 ? Math.random() * 3 + 1.5 : Math.random() * 0.25,
        trail: [],
      };
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wr = windowRect();
      const density = matchMedia(PHONE).matches ? 18000 : 9000;
      drops = Array.from({ length: Math.round((wr.w * wr.h) / density) }, () => newDrop(true));
      dust = Array.from({ length: 40 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.2 - 0.05,
        a: Math.random() * 0.5 + 0.2,
      }));
    };
    const frameStep = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      if (document.documentElement.dataset.theme === 'dark') {
        const wr = windowRect();
        ctx.save();
        ctx.beginPath();
        ctx.rect(wr.x, wr.y, wr.w, wr.h);
        ctx.clip();
        drops.forEach((d, i) => {
          d.y += d.v;
          if (d.v > 1) {
            d.x += (Math.random() - 0.5) * 0.6;
            d.trail.push([d.x, d.y]);
            if (d.trail.length > 18) d.trail.shift();
          }
          if (Math.random() < 0.002) d.v = Math.random() * 3 + 1.5;
          if (d.y > wr.y + wr.h + 10) {
            drops[i] = newDrop(false);
            return;
          }
          if (d.trail.length > 1) {
            ctx.strokeStyle = 'rgba(200,225,255,.10)';
            ctx.lineWidth = d.r * 0.9;
            ctx.beginPath();
            ctx.moveTo(d.trail[0][0], d.trail[0][1]);
            d.trail.forEach(([tx, ty]) => ctx.lineTo(tx, ty));
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(210,232,255,.28)';
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, d.r * 0.8, d.r, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath();
          ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.35, d.r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else {
        dust.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -5) {
            p.y = H + 5;
            p.x = Math.random() * W;
          }
          ctx.fillStyle = `rgba(255,236,190,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      raf = requestAnimationFrame(frameStep);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frameStep);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(box);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', start);
    };
  }, []);

  // The AC switches on once (GSAP), then the air keeps flowing; depth on desktop pointer moves.
  useGSAP(
    () => {
      const hero = root.current?.closest('section');
      if (!hero) return;
      const q = gsap.utils.selector(hero);
      if (matchMedia(REDUCE).matches) {
        setDisplay('24°');
        gsap.set(q('.hero-vent'), { opacity: 1 });
        gsap.set(q('.hero-flows'), { opacity: 0.8 });
        gsap.set(q('#hero-closed'), { opacity: 0 });
        return;
      }
      const words = q('.hero-word');
      const tl = gsap.timeline({ delay: 0.3 });
      tl.from(q('#hero-copy'), { x: -40, opacity: 0, duration: 0.9, ease: 'power3.out' })
        .from(words, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 }, '-=0.6')
        .from(q('.hero-dock, .hero-offer'), { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4')
        .add(() => setDisplay('ON'), '-=0.2')
        .to(q('#hero-closed'), { opacity: 0, duration: 0.9, ease: 'power2.inOut' })
        .to(q('.hero-vent'), { opacity: 1, duration: 0.6 }, '-=0.4')
        .add(() => setDisplay('28°'))
        .to(q('.hero-flows'), { opacity: 1, duration: 1.4, ease: 'power2.out' })
        .add(() => {
          const v = { t: 28 };
          gsap.to(v, { t: 24, duration: 2, ease: 'power1.inOut', onUpdate: () => setDisplay(`${Math.round(v.t)}°`) });
        }, '<');
      gsap.to(q('.hero-core'), { strokeDashoffset: -300, duration: 3, ease: 'none', repeat: -1 });
      gsap.to(q('.hero-wide'), { opacity: 0.45, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.25 });

      if (matchMedia(PHONE).matches) return;
      const move = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        gsap.to(q('.hero-layer'), { x: -nx * 14, y: -ny * 10, duration: 1.2, ease: 'power3.out' });
        gsap.to(q('#hero-copy'), { x: nx * 6, y: ny * 4, duration: 1.2, ease: 'power3.out' });
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
    { scope: root },
  );

  return (
    <div ref={root} className="hero-layer pointer-events-none absolute -inset-[2%]">
      <AcOverlay id="ac-desk" frame={AC_FRAMES.desktop} text={display} className="absolute inset-0 size-full max-[760px]:hidden" />
      <AcOverlay id="ac-phone" frame={AC_FRAMES.phone} text={display} className="absolute inset-0 size-full min-[761px]:hidden" />
      <canvas ref={canvas} className="absolute inset-0 size-full dark:mix-blend-screen" />
    </div>
  );
}
