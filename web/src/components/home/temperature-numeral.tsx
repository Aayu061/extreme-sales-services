'use client';

import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * The one orchestrated moment on the site: the numeral settles from Mumbai afternoon heat (34°)
 * to a comfortable 24° once, on load. Reduced motion shows 24° straight away.
 */
export function TemperatureNumeral({ from = 34, to = 24 }: { from?: number; to?: number }) {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(from);
  const value = reduce ? to : animated;

  useEffect(() => {
    if (reduce) return;
    const controls = animate(from, to, {
      duration: 1.4,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to, reduce]);

  return (
    <p className="display tabular select-none text-[clamp(4.5rem,14vw,8.5rem)] leading-none text-cyan" aria-label={`${to} degrees`}>
      <span aria-hidden="true">{value}°</span>
    </p>
  );
}
