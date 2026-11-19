// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { XRAY_PARTS, partAnswer } from '@/lib/xray-parts';
import { XraySection } from '@/components/home/xray-section';
import { fixtureServices } from './helpers/catalog';

const part = (id: string) => XRAY_PARTS.find((p) => p.id === id)!;

function mockMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? reduce : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('partAnswer', () => {
  it('prices the coil with the live jet wash price', () => {
    expect(partAnswer(part('coil'), fixtureServices).priceText).toBe('₹1,414.82');
  });

  it('marks the circuit board as priced after inspection', () => {
    expect(partAnswer(part('pcb'), fixtureServices).priceText).toBe('Price after inspection');
  });

  it('asks people to call when the catalog is missing', () => {
    expect(partAnswer(part('gas'), []).priceText).toBe('Call us for this one');
  });

  it('defines the six parts with outlines inside the 1672 × 941 image', () => {
    expect(XRAY_PARTS.map((p) => p.id)).toEqual(['filter', 'coil', 'fan', 'pcb', 'gas', 'drain']);
    for (const p of XRAY_PARTS) {
      expect(p.outline.length).toBeGreaterThanOrEqual(4);
      for (const [x, y] of p.outline) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1672);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(941);
      }
    }
  });
});

describe('XraySection', () => {
  it('shows the problem, the service and its live price when a part is tapped', () => {
    mockMotion(false);
    render(<XraySection services={fixtureServices} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Cooling coil' })[0]);
    expect(screen.getByText('Not cooling well')).toBeTruthy();
    expect(screen.getByText('Jet wash')).toBeTruthy();
    expect(screen.getByText('₹1,414.82')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Book this' }).getAttribute('href')).toBe('/book?service=SVC-JET-WASH');
  });

  it('lists every public service, with repairs grouped as priced after diagnosis', () => {
    mockMotion(false);
    render(<XraySection services={fixtureServices} />);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    for (const s of fixtureServices) expect(screen.getByRole('link', { name: s.name }).getAttribute('href')).toBe(`/services/${s.code.toLowerCase()}`);
    expect(screen.getByText('Repairs, priced after the diagnosis visit')).toBeTruthy();
  });

  it('starts in the list view when the visitor turned animations off', () => {
    mockMotion(true);
    render(<XraySection services={fixtureServices} />);
    expect(screen.getByText('Repairs, priced after the diagnosis visit')).toBeTruthy();
  });
});
