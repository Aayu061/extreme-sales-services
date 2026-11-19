// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PincodeCheck } from '@/components/home/pincode-check';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function check(value: string) {
  render(<PincodeCheck />);
  fireEvent.change(screen.getByLabelText('Your pincode'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

describe('PincodeCheck', () => {
  it('removes spaces before asking the server', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ pincode: '400071', serviceable: true, area: 'Mumbai, Thane & Navi Mumbai' })));
    check('400 071');
    expect(await screen.findByText('Yes, we cover Mumbai, Thane & Navi Mumbai.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/serviceability/400071');
  });

  it('asks for 6 digits without calling the server', () => {
    check('12');
    expect(screen.getByText('Enter a 6-digit pincode.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is honest when the pincode is outside the service area', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ pincode: '560001', serviceable: false, area: null })));
    check('560001');
    expect(await screen.findByText("We don't cover this pincode yet. Call us and we'll see what we can do.")).toBeTruthy();
  });

  it('shows the server message when the check fails', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Could not check right now. Please call us.' }), { status: 502 }));
    check('400001');
    expect(await screen.findByText('Could not check right now. Please call us.')).toBeTruthy();
  });
});
