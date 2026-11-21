// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { fixtureCatalog } from './helpers/catalog';
import { AmcSection } from '@/components/home/amc-section';
import { amcCard, amcHighlights } from '@/lib/amc';

afterEach(cleanup);

const plans = fixtureCatalog.amcPlans.map(amcCard);

describe('AmcSection (home page)', () => {
  it('never puts a link inside another link (React hydration error)', () => {
    const { container } = render(<AmcSection plans={plans} />);
    expect(container.querySelectorAll('a a')).toHaveLength(0);
  });

  it('links each highlighted plan to its place on /amc and keeps the note star', () => {
    render(<AmcSection plans={plans} />);
    const highlights = amcHighlights(plans);
    expect(highlights.length).toBeGreaterThan(0);
    for (const p of highlights) {
      const link = screen.getByRole('link', { name: p.name });
      expect(link.getAttribute('href')).toBe(`/amc#${p.code.toLowerCase()}`);
    }
    // the intro star + one star per highlighted plan, each pointing at the page notes
    const stars = screen.getAllByRole('link', { name: 'See note **' });
    expect(stars).toHaveLength(highlights.length + 1);
    for (const s of stars) expect(s.getAttribute('href')).toBe('#notes');
  });
});
