// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContactForm } from '@/components/forms/contact-form';
import { SellerForm } from '@/components/forms/seller-form';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const agree = () => act(() => fireEvent.click(screen.getByRole('checkbox', { name: /I agree that/ })));
const sent = () => JSON.parse(fetchMock.mock.calls[0][1].body);
const okWith = (code: string) => new Response(JSON.stringify({ trackingCode: code, intakeNumber: 'WEB-9' }), { status: 200 });

describe('ContactForm', () => {
  it('sends a contact message and shows the reference', async () => {
    fetchMock.mockResolvedValue(okWith('ESS-CNTC-0001'));
    render(<ContactForm />);
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '9876543210');
    type(/^Message/, 'My AC makes a noise at night.');
    agree();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));
    expect(sent()).toMatchObject({ kind: 'CONTACT', message: 'My AC makes a noise at night.', contact: { name: 'Asha Rao', phone: '9876543210' }, consent: { privacy: true, marketing: false }, hp: '' });
    expect(typeof sent().elapsedMs).toBe('number');
    expect(await screen.findByText("Message sent. Your reference is ESS-CNTC-0001. We'll reply within our opening hours.")).toBeTruthy();
  });
});

describe('SellerForm', () => {
  const fillSeller = (gstin: string) => {
    type(/^Your name/, 'Ravi Shah');
    type(/^Mobile number/, '9876543210');
    type(/^Business name/, 'Cool Traders');
    type(/^City/, 'Thane');
    type(/^GSTIN/, gstin);
    type(/^What do you sell/, 'Split ACs and spares');
    agree();
  };

  it('sends dealer interest with the GSTIN in capitals', async () => {
    fetchMock.mockResolvedValue(okWith('ESS-SELL-0001'));
    render(<SellerForm />);
    fillSeller('27abcde1234f1z5');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Register interest' })));
    expect(sent()).toMatchObject({ kind: 'SELLER_INTEREST', business: { name: 'Cool Traders', city: 'Thane', gstin: '27ABCDE1234F1Z5', sells: 'Split ACs and spares' } });
    expect(await screen.findByText('Thanks. Your reference is ESS-SELL-0001.')).toBeTruthy();
  });

  it('catches a GSTIN that is too short without sending', async () => {
    render(<SellerForm />);
    fillSeller('27ABCDE1234F1Z');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Register interest' })));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('GSTIN has 15 letters and digits.')).toBeTruthy();
  });
});
