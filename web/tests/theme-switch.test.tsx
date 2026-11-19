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
});
