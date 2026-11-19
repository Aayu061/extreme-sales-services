'use client';

import { useSyncExternalStore, type MouseEvent } from 'react';

/** Saved theme key; the inline script in the root layout reads the same key before first paint. */
export const THEME_KEY = 'ess-theme';

/** Runs in <head> before paint: day (light) unless the visitor chose night earlier. */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

type Theme = 'light' | 'dark';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const getTheme = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
const getServerTheme = (): Theme => 'light';

/**
 * Day / night switch: a soft pressed-in track with a raised knob (neumorphic), sun by day and
 * moon by night. The site opens in day mode; the choice is remembered on this device.
 */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const night = theme === 'dark';
  const next: Theme = night ? 'light' : 'dark';

  function apply() {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice lasts for this visit only.
    }
  }

  /** The new mode spreads out in a circle from the switch (where the browser supports it). */
  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) {
      apply();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const root = document.documentElement.style;
    root.setProperty('--vt-x', `${r.left + r.width / 2}px`);
    root.setProperty('--vt-y', `${r.top + r.height / 2}px`);
    doc.startViewTransition(apply);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}
      className="neu-inset relative h-10 w-[76px] shrink-0 cursor-pointer rounded-full"
    >
      <span
        aria-hidden="true"
        className={`neu-raised absolute top-1 left-1 flex size-8 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(.2,.9,.2,1.2)] ${night ? 'translate-x-9' : ''}`}
      >
        {night ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#9fd6ff">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f5a524" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </span>
    </button>
  );
}
