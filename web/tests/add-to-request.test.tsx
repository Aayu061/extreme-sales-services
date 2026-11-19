// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// Each test gets fresh modules: the store keeps an in-memory copy when storage is blocked.
async function load() {
  const buttons = await import('@/components/basket/add-to-request');
  const pills = await import('@/components/basket/basket-pill');
  return { ...buttons, ...pills };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const jet = { type: 'SERVICE' as const, ref: 'SVC-JET-WASH', name: 'Jet wash' };

describe('AddToRequest', () => {
  it('adds to the saved basket, confirms, and updates the menu pill', async () => {
    const { AddToRequest, BasketPill } = await load();
    render(
      <>
        <BasketPill />
        <AddToRequest line={jet} />
      </>,
    );
    expect(screen.queryByRole('link', { name: /Your request/ })).toBeNull();
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Add to request' })));
    expect(JSON.parse(localStorage.getItem('ess-basket')!).lines[0].ref).toBe('SVC-JET-WASH');
    expect(screen.getByText(/Added/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View request' }).getAttribute('href')).toBe('/book');
    expect(screen.getByRole('link', { name: 'Your request: 1 item' }).textContent).toContain('1');
  });

  it('still works when the browser blocks storage', async () => {
    const { AddToRequest, BasketPill } = await load();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <>
        <BasketPill />
        <AddToRequest line={jet} />
      </>,
    );
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Add to request' })));
    expect(screen.getByText(/Added/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Your request: 1 item' })).toBeTruthy();
  });

  it('a second tap says it is already added and keeps quantity 1', async () => {
    const { AddToRequest } = await load();
    render(<AddToRequest line={jet} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Add to request' })));
    act(() => fireEvent.click(screen.getByRole('button', { name: /Added/ })));
    expect(screen.getByText(/Already added/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ess-basket')!).lines[0].quantity).toBe(1);
  });
});

describe('AC enquiry list', () => {
  it('ACs go to the enquiry list with their own pill', async () => {
    const { AddToEnquiry, EnquiryPill } = await load();
    render(
      <>
        <EnquiryPill />
        <AddToEnquiry line={{ type: 'PRODUCT', ref: 'p1', name: 'Daikin 1 ton' }} />
      </>,
    );
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Add to enquiry' })));
    expect(JSON.parse(localStorage.getItem('ess-enquiry')!).lines[0].ref).toBe('p1');
    expect(localStorage.getItem('ess-basket')).toBeNull();
    expect(screen.getByRole('link', { name: 'Your AC enquiry: 1 AC' }).getAttribute('href')).toBe('/enquiry');
    expect(screen.getByRole('link', { name: 'View enquiry' }).getAttribute('href')).toBe('/enquiry');
  });

  it('moves ACs saved in the old basket into the enquiry list', async () => {
    const { BasketPill, EnquiryPill } = await load();
    localStorage.setItem(
      'ess-basket',
      JSON.stringify({
        v: 1,
        lines: [
          { key: 'x', type: 'PRODUCT', ref: 'p9', name: 'Old AC', quantity: 1 },
          { key: 'y', type: 'SERVICE', ref: 'SVC-GAS', name: 'Gas', quantity: 1 },
        ],
      }),
    );
    render(
      <>
        <BasketPill />
        <EnquiryPill />
      </>,
    );
    expect(await screen.findByRole('link', { name: 'Your AC enquiry: 1 AC' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Your request: 1 item' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ess-basket')!).lines.map((l: { ref: string }) => l.ref)).toEqual(['SVC-GAS']);
  });
});
