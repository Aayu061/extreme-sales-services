'use client';

import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const HOT = [255, 170, 110]; // Mumbai afternoon
const COOL = [110, 220, 245]; // comfortable

function mix(from: number[], to: number[], t: number) {
  const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

/**
 * The hero's one orchestrated moment: a split AC whose display settles from 34° to 24° while
 * cool air flows out of it. The numeral warms-to-cools in colour as it counts down.
 * Reduced motion shows 24° straight away with still airflow lines.
 */
export function HeroAc({ from = 34, to = 24 }: { from?: number; to?: number }) {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(from);
  const value = reduce ? to : animated;
  const progress = from === to ? 1 : (from - value) / (from - to);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(from, to, {
      duration: 2.2,
      delay: 0.4,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to, reduce]);

  return (
    <svg
      viewBox="0 0 480 380"
      role="img"
      aria-label={`An air conditioner cooling the room to ${to} degrees`}
      className="h-auto w-full max-w-130 drop-shadow-[0_24px_40px_rgb(2_20_50/0.35)]"
    >
      {/* Indoor unit */}
      <rect x="24" y="36" width="432" height="138" rx="28" fill="#ffffff" />
      <rect x="24" y="36" width="432" height="138" rx="28" fill="url(#ac-sheen)" />
      {[62, 74, 86].map((y) => (
        <line key={y} x1="56" x2="300" y1={y} y2={y} stroke="#dbe6ef" strokeWidth="3" strokeLinecap="round" />
      ))}
      {/* Louvre */}
      <path d="M44 146 H436 a10 10 0 0 1 -8 14 H52 a10 10 0 0 1 -8 -14 Z" fill="#d3e2ee" />
      <path d="M70 160 H410" stroke="#b9cfe0" strokeWidth="3" strokeLinecap="round" />

      {/* Display */}
      <rect x="318" y="62" width="112" height="66" rx="14" fill="#0f2340" />
      <text
        x="364"
        y="112"
        textAnchor="middle"
        fontSize="44"
        fontWeight="700"
        fill={mix(HOT, COOL, progress)}
        style={{ fontVariantNumeric: 'tabular-nums', fontStretch: '125%' }}
      >
        {value}
      </text>
      <text x="401" y="90" fontSize="24" fontWeight="700" fill={mix(HOT, COOL, progress)}>
        °
      </text>
      {/* Power light turns green once the room is comfortable */}
      <circle cx="300" cy="118" r="5" fill={progress >= 1 ? '#3fd08a' : '#c9d6e2'} />

      {/* Cool air */}
      <g className="airflow" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.85">
        <path d="M96 186 C 86 230, 120 260, 100 300 S 90 350, 110 372" />
        <path d="M190 186 C 180 236, 214 262, 196 306 S 188 352, 204 374" opacity="0.7" />
        <path d="M284 186 C 274 230, 308 262, 290 302 S 282 350, 298 372" />
        <path d="M378 186 C 368 236, 402 262, 384 306 S 376 352, 392 374" opacity="0.7" />
      </g>

      <defs>
        <linearGradient id="ac-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#e8f0f6" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
