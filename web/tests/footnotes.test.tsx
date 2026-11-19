// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FOOTNOTES, footnoteMarks } from '@/lib/footnotes';
import { PageNotes, Star } from '@/components/site/footnote';

afterEach(cleanup);

describe('footnotes', () => {
  it('gives the first note on a page * and the second **', () => {
    expect(footnoteMarks(['warranty', 'amc'])).toEqual({ warranty: '*', amc: '**' });
  });

  it('has the agreed wording', () => {
    expect(FOOTNOTES.warranty).toBe('On our work, from the day the work is done. See Terms.');
    expect(FOOTNOTES.inspection).toBe('We tell you the price before any work.');
    expect(FOOTNOTES.acPrice).toBe('Listed price incl. GST; final price and stock confirmed by the seller.');
    expect(FOOTNOTES.amc).toBe('Per AC per year, incl. GST. See Terms.');
  });

  it('shows the notes above the footer with a link to the Terms', () => {
    const { container } = render(<PageNotes ids={['warranty', 'amc']} />);
    const notes = container.querySelector('#notes')!;
    expect(notes.textContent).toContain('* On our work, from the day the work is done.');
    expect(notes.textContent).toContain('** Per AC per year, incl. GST.');
    expect(screen.getAllByRole('link', { name: 'Terms' })[0].getAttribute('href')).toBe('/legal/terms');
  });

  it('links a star to the notes', () => {
    render(<Star mark="**" />);
    const a = screen.getByRole('link', { name: 'See note **' });
    expect(a.getAttribute('href')).toBe('#notes');
    expect(a.textContent).toBe('**');
  });
});
