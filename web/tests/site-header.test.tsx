// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(cleanup);

async function renderHeader() {
  const { SiteHeader } = await import('@/components/site/site-header');
  return render(<SiteHeader />);
}

describe('SiteHeader page menu (phones and tablets)', () => {
  it('opens a menu with every page and closes it again', async () => {
    await renderHeader();
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    const menu = screen.getByRole('navigation', { name: 'Pages' });
    for (const name of ['Home', 'Services', 'AMC plans', 'Shop ACs', 'Track', 'Contact']) {
      expect(within(menu).getByRole('link', { name })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
  });

  it('closes with the Escape key and when a page is chosen', async () => {
    await renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Pages' })).getByRole('link', { name: 'Services' }));
    expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
  });
});
