// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddToRequest } from '@/components/basket/add-to-request';
import { BasketPill } from '@/components/basket/basket-pill';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const jet = { type: 'SERVICE' as const, ref: 'SVC-JET-WASH', name: 'Jet wash' };

describe('AddToRequest', () => {
  it('adds to the saved basket, confirms, and updates the menu pill', () => {
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

  it('still works when the browser blocks storage', () => {
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
});
