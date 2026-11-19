// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import track from '../dev/fixtures/track.json';
import { TrackForm } from '@/components/track/track-form';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const fill = (code: string | null, phone: string) => {
  if (code !== null) fireEvent.change(screen.getByLabelText(/^Tracking code/), { target: { value: code } });
  fireEvent.change(screen.getByLabelText(/^Mobile number/), { target: { value: phone } });
};
const check = () => act(async () => fireEvent.click(screen.getByRole('button', { name: 'Track' })));

describe('TrackForm', () => {
  it('fills the code from the link', () => {
    render(<TrackForm initialCode="ESS-LOCL-DEV2" />);
    expect((screen.getByLabelText(/^Tracking code/) as HTMLInputElement).value).toBe('ESS-LOCL-DEV2');
  });

  it('asks for a proper mobile number before asking the server', async () => {
    render(<TrackForm initialCode="ESS-LOCL-DEV2" />);
    fill(null, '12345');
    await check();
    expect(screen.getByText('Enter the 10-digit mobile number you used.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the code in capitals and shows when nothing matches', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'No request matches this tracking code and mobile number.' }), { status: 404 }));
    render(<TrackForm initialCode="" />);
    fill('ess-locl-dev2', '98765 43210');
    await check();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).code).toBe('ESS-LOCL-DEV2');
    expect((await screen.findByRole('alert')).textContent).toBe('No request matches this tracking code and mobile number.');
  });

  it('shows the timeline, visit and items', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(track), { status: 200 }));
    render(<TrackForm initialCode="ESS-LOCL-DEV2" />);
    fill(null, '9876543210');
    await check();
    expect(await screen.findByText('SR-2026-000123', { exact: false })).toBeTruthy();
    expect(screen.getAllByText('Visit scheduled').length).toBeGreaterThan(0);
    expect(screen.getByText('Wed, 25 Nov 2026, 10:00–12:00 · Technician: Ravi')).toBeTruthy();
    expect(screen.getByText('Confirmed', { selector: '.item-status' })).toBeTruthy();
    expect(screen.getByText('₹1,414.82')).toBeTruthy();
    expect(screen.getByText('Price after inspection')).toBeTruthy();
  });
});
