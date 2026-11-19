// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

type IoCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let ioCallback: IoCallback | null = null;

beforeEach(() => {
  ioCallback = null;
  pathname = '/';
  document.body.innerHTML = '<a id="hero-book" href="/book">Book a service</a>';
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IoCallback) {
        // Next's <Link> also observes (for prefetching); keep the first observer, ours.
        ioCallback ??= cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderContact() {
  const { FloatingContact } = await import('@/components/site/floating-contact');
  return render(<FloatingContact phone="+91 7977805245" whatsapp="+91 7977805245" />);
}

describe('FloatingContact', () => {
  it('opens WhatsApp and the phone dialler', async () => {
    await renderContact();
    expect(screen.getByRole('link', { name: 'Chat with us on WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/917977805245/);
    expect(screen.getByRole('link', { name: 'Call us on +91 7977805245' }).getAttribute('href')).toBe('tel:+917977805245');
  });

  it('shows the phone Book pill only after the hero Book button scrolls away', async () => {
    await renderContact();
    act(() => ioCallback?.([{ isIntersecting: true }]));
    expect(screen.queryByTestId('floating-book')).toBeNull();
    act(() => ioCallback?.([{ isIntersecting: false }]));
    expect(screen.getByTestId('floating-book').getAttribute('href')).toBe('/book');
  });

  it('keeps WhatsApp and Call off the hero on phones (shown from tablet width up)', async () => {
    await renderContact();
    const stack = screen.getByRole('link', { name: 'Chat with us on WhatsApp' }).parentElement!;
    act(() => ioCallback?.([{ isIntersecting: true }]));
    expect(stack.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(stack.className).toContain('md:flex');
    act(() => ioCallback?.([{ isIntersecting: false }]));
    expect(stack.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('shows the Book pill straight away on pages without the hero', async () => {
    pathname = '/services';
    document.body.innerHTML = '';
    await renderContact();
    expect(screen.getByTestId('floating-book')).toBeTruthy();
  });

  it('never shows the Book pill on the booking page itself', async () => {
    pathname = '/book';
    document.body.innerHTML = '';
    await renderContact();
    expect(screen.queryByTestId('floating-book')).toBeNull();
  });
});
