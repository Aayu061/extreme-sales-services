// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeSwitch, THEME_KEY } from '@/components/theme/theme-switch';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
});

describe('ThemeSwitch', () => {
  it('switches day to night, saves it, and labels the next action', async () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to night mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    // The label follows the <html> attribute through a MutationObserver (async).
    expect(await screen.findByRole('button', { name: 'Switch to day mode' })).toBeTruthy();
  });

  it('switches back to day', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to day mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('still switches when storage throws (private mode)', () => {
    document.documentElement.dataset.theme = 'light';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to night mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('animates the switch with a view transition when the browser supports it', () => {
    document.documentElement.dataset.theme = 'light';
    const start = vi.fn((update: () => void) => {
      update();
      return { ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: typeof start }).startViewTransition = start;
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to night mode' }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.theme).toBe('dark');
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('switches instantly for people who turn animations off', () => {
    document.documentElement.dataset.theme = 'light';
    const start = vi.fn();
    (document as unknown as { startViewTransition: typeof start }).startViewTransition = start;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<ThemeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to night mode' }));
    expect(start).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe('dark');
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});
