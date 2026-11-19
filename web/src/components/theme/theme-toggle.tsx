'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Saved theme key; the inline script in the root layout reads the same key before first paint. */
export const THEME_KEY = 'ess-theme';

/** Runs in <head> before paint: light unless the visitor chose dark earlier. */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const getTheme = (): 'light' | 'dark' => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
const getServerTheme = (): 'light' | 'dark' => 'light';

/** Moon / sun button in the header. The site is light by default. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice simply lasts for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={next === 'dark' ? 'Dark mode' : 'Light mode'}
      className="inline-flex size-11 items-center justify-center rounded-full text-navy transition-[background-color,transform] duration-150 hover:bg-cyan-wash active:scale-90"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
    </button>
  );
}
