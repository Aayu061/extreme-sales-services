// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { fixtureCatalog } from './helpers/catalog';
import { AmcPlans } from '@/components/amc/amc-plans';
import { formatInr } from '@/lib/format';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const plans = fixtureCatalog.amcPlans;
const card = (name: string) => screen.getByRole('article', { name });

describe('AmcPlans', () => {
  it('starts with small split ACs and shows each plan for that size', () => {
    render(<AmcPlans plans={plans} />);
    expect(screen.getByRole('radio', { name: 'Split · up to 1 ton' }).getAttribute('aria-checked')).toBe('true');
    const ord4 = plans.find((p) => p.code === 'ORD-4')!;
    const c = card(ord4.name);
    expect(within(c).getByText(`${ord4.visitsPerYear} visits a year`)).toBeTruthy();
    expect(within(c).getByText(formatInr(ord4.rates.splitSmall!.total))).toBeTruthy();
    const windowOnly = plans.find((p) => p.code === 'SAMC-3')!;
    const w = card(windowOnly.name);
    expect(within(w).getByText('Not for this AC')).toBeTruthy();
    expect((within(w).getByRole('button', { name: /Add to request/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('adds the plan with the chosen AC type and size', () => {
    render(<AmcPlans plans={plans} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Window · 1.5–2 ton' }));
    fireEvent.click(screen.getByRole('radio', { name: '2 ton' }));
    const ord4 = plans.find((p) => p.code === 'ORD-4')!;
    act(() => fireEvent.click(within(card(ord4.name)).getByRole('button', { name: /Add to request/ })));
    const saved = JSON.parse(localStorage.getItem('ess-basket')!);
    expect(saved.lines[0]).toMatchObject({ type: 'AMC', ref: 'ORD-4', ac: { type: 'WINDOW', tonnage: 2 } });
  });
});
