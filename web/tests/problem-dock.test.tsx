// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProblemDock } from '@/components/home/hero/problem-dock';
import { fixtureServices } from './helpers/catalog';

afterEach(cleanup);

describe('ProblemDock', () => {
  it('lists the six problems', () => {
    render(<ProblemDock services={fixtureServices} />);
    for (const name of ['Not cooling', 'Leaking', 'Noisy', 'Bad smell', 'Service due', 'Needs gas']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('shows the matching service, its live price and a Book link', () => {
    render(<ProblemDock services={fixtureServices} />);
    fireEvent.click(screen.getByRole('button', { name: 'Leaking' }));
    expect(screen.getByText('Diagnosis visit')).toBeTruthy();
    expect(screen.getByText('From ₹529.82')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Book this' }).getAttribute('href')).toBe('/book?service=SVC-DIAG');
  });

  it('asks people to call when the catalog could not be loaded', () => {
    render(<ProblemDock services={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Needs gas' }));
    expect(screen.getByText('Call us for this one')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Book this' })).toBeNull();
  });
});
