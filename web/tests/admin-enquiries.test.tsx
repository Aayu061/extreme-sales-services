// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';

// ---- Fakes: the two server actions, the router, PYS answers by path, redirect() throwing like Next ----

type State = Record<string, unknown>;
const sendPrice = vi.fn<(lineId: string, prev: State, fd: FormData) => Promise<State>>(async () => ({ ok: true }));
const closeEnquiry = vi.fn<(lineId: string, result: string) => Promise<State>>(async () => ({ ok: true }));
vi.mock('@/app/admin/actions/enquiries', () => ({
  sendPrice: (...args: [string, State, FormData]) => sendPrice(...args),
  closeEnquiry: (...args: [string, string]) => closeEnquiry(...args),
}));

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/enquiries',
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));

const answers = new Map<string, unknown>();
const adminRequest = vi.fn(async (_method: string, path: string) => {
  const a = answers.get(path);
  if (a instanceof Error) throw a;
  if (a === undefined) throw new Error(`unexpected PYS call ${path}`);
  return a;
});
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string) => adminRequest(method, path),
}));
let adminPath = '/admin/enquiries';
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-ess-admin-path': adminPath }) }));

import { AdminAuthError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import type { AdminEnquiryLine } from '@/lib/admin/types';
import { EnquiryList, EnquiryRow } from '@/components/admin/enquiry-row';
import { EnquiriesScreen } from '@/components/admin/enquiries-view';

const customer = {
  name: 'Priya Shah',
  phone: '9876543210',
  email: 'priya.shah@example.com',
  area: 'Chembur',
  city: 'Mumbai',
  pincode: '400071',
  message: 'Please call after 5 pm.',
};
const line = (extra: Partial<AdminEnquiryLine> = {}): AdminEnquiryLine => ({
  lineId: 'line-1-1',
  intakeNumber: 'WEB-2026-DEV001',
  trackingCode: 'ESS-DEV1-JK',
  receivedAt: '2026-11-20T09:45:00Z',
  productId: 'TLRbwbHUxbXgBIJ9eCZM',
  productName: 'Blue Star 4.0 TR Cassette AC',
  quantity: 1,
  notes: 'Installation needed',
  status: 'QUOTE_PENDING',
  listedPrice: 98500,
  quote: null,
  customer,
  ...extra,
});
const quoted = (extra: Partial<AdminEnquiryLine> = {}) =>
  line({
    lineId: 'line-2-1',
    intakeNumber: 'WEB-2026-DEV002',
    productName: 'Mitsubishi 1.5 TR Split AC',
    quantity: 2,
    notes: null,
    status: 'QUOTED',
    listedPrice: 50000,
    quote: { total: 40500, note: 'Includes standard installation.', at: '2026-11-20T10:00:00Z' },
    customer: { ...customer, name: 'Rahul Mehta', phone: '9820012345', email: null },
    ...extra,
  });

const priceBox = () => screen.getByLabelText(/Price per AC/);
const sendButton = () => screen.getByRole('button', { name: /Send price|Sending/ });

/** A promise the test resolves when it wants the action to finish. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  sendPrice.mockReset();
  sendPrice.mockImplementation(async () => ({ ok: true }));
  closeEnquiry.mockReset();
  closeEnquiry.mockImplementation(async () => ({ ok: true }));
  router.replace.mockClear();
  router.refresh.mockClear();
  router.push.mockClear();
  answers.clear();
  adminRequest.mockClear();
  adminPath = '/admin/enquiries';
  window.history.replaceState({}, '', '/admin/enquiries?tab=waiting');
});
afterEach(() => {
  cleanup();
});

describe('an AC enquiry waiting for a price', () => {
  it('shows the AC, quantity, note, listed price and the customer to call', () => {
    render(<EnquiryRow line={line()} />);
    const row = screen.getByRole('article', { name: /Blue Star 4\.0 TR Cassette AC/ });
    const r = within(row);
    expect(r.getByRole('heading', { name: 'Blue Star 4.0 TR Cassette AC' })).toBeTruthy();
    expect(r.getByText('Quantity: 1')).toBeTruthy();
    expect(r.getByText('Installation needed')).toBeTruthy();
    expect(r.getByText('Listed at ₹98,500 per AC')).toBeTruthy();
    expect(r.getByText('WEB-2026-DEV001')).toBeTruthy();
    expect(r.getByText('Priya Shah')).toBeTruthy();
    expect(r.getByText('Please call after 5 pm.')).toBeTruthy();

    const call = r.getByRole('link', { name: /Call Priya Shah/ });
    expect(call.getAttribute('href')).toBe('tel:+919876543210');
    const wa = r.getByRole('link', { name: /WhatsApp Priya Shah/ });
    expect(wa.getAttribute('href')).toBe('https://wa.me/919876543210');
    expect(wa.getAttribute('target')).toBe('_blank');
    expect(wa.getAttribute('rel')).toBe('noopener noreferrer');
    expect(r.getByRole('link', { name: /priya\.shah@example\.com/ }).getAttribute('href')).toBe('mailto:priya.shah@example.com');
  });

  it('never puts the phone or email in an address of this site', () => {
    const { container } = render(<EnquiryRow line={line()} />);
    for (const el of container.querySelectorAll('a[href], form[action]')) {
      const a = el.getAttribute('href') ?? el.getAttribute('action') ?? '';
      if (/^(tel:|mailto:|https:\/\/wa\.me\/)/.test(a)) continue;
      expect(a).not.toMatch(/9876543210|priya/i);
    }
  });

  it('says when the AC has no listed price, and shows no WhatsApp link for a number that is not a mobile', () => {
    render(<EnquiryRow line={line({ listedPrice: null, customer: { ...customer, phone: '022 2525 1234' } })} />);
    expect(screen.getByText('No listed price (price on request)')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Call Priya Shah/ }).getAttribute('href')).toBe('tel:02225251234');
  });

  it('labels the note "Shown to the customer"', () => {
    render(<EnquiryRow line={line()} />);
    const note = screen.getByLabelText(/Note for the customer/);
    expect(note.getAttribute('name')).toBe('note');
    expect(note.getAttribute('maxlength')).toBe('1000');
    const hintId = note.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(hintId.split(' ')[0])?.textContent).toBe('Shown to the customer');
    expect(priceBox().getAttribute('name')).toBe('total');
    expect(priceBox().getAttribute('inputmode')).toBe('decimal');
  });

  it('with "abc" says how to write the price and does not call PYS', async () => {
    render(<EnquiryRow line={line()} />);
    fireEvent.change(priceBox(), { target: { value: 'abc' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText('Enter the price per AC, e.g. 40,500.')).toBeTruthy();
    expect(priceBox().getAttribute('aria-invalid')).toBe('true');
    expect(sendPrice).not.toHaveBeenCalled();
  });

  it('with an empty box, or more than 1 crore, does not call PYS either', async () => {
    render(<EnquiryRow line={line()} />);
    fireEvent.click(sendButton());
    expect(await screen.findByText('Enter the price per AC, e.g. 40,500.')).toBeTruthy();
    fireEvent.change(priceBox(), { target: { value: '2,00,00,000' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText('The price can be at most ₹1,00,00,000 per AC.')).toBeTruthy();
    expect(sendPrice).not.toHaveBeenCalled();
  });

  it('sends a valid price once, even on a double click', async () => {
    const answer = deferred<State>();
    sendPrice.mockImplementation(() => answer.promise);
    render(<EnquiryRow line={line()} />);
    fireEvent.change(priceBox(), { target: { value: '₹40,500' } });
    fireEvent.change(screen.getByLabelText(/Note for the customer/), { target: { value: 'Includes installation.' } });
    const button = sendButton();
    const form = button.closest('form')!;
    // Both clicks land before React re-renders (and disables) the button; then one more submit.
    act(() => {
      button.click();
      button.click();
    });
    fireEvent.submit(form);
    await waitFor(() => expect(sendPrice).toHaveBeenCalled());
    expect(sendPrice).toHaveBeenCalledTimes(1);
    expect(sendButton().hasAttribute('disabled')).toBe(true);
    expect(sendButton().textContent).toMatch(/Sending/);

    const [lineId, , fd] = sendPrice.mock.calls[0];
    expect(lineId).toBe('line-1-1');
    expect(fd.get('total')).toBe('₹40,500');
    expect(fd.get('note')).toBe('Includes installation.');

    await act(async () => answer.resolve({ ok: true }));
    fireEvent.submit(form);
    expect(sendPrice).toHaveBeenCalledTimes(1); // the box was cleared once sent, so nothing to send
  });

  it('shows the field messages PYS gives back next to the fields', async () => {
    sendPrice.mockImplementation(async () => ({ fields: { total: 'Enter the price per AC, e.g. 40,500.', note: 'Keep the note to 1,000 characters or fewer.' } }));
    render(<EnquiryRow line={line()} />);
    fireEvent.change(priceBox(), { target: { value: '40500' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText('Keep the note to 1,000 characters or fewer.')).toBeTruthy();
    expect(screen.getByText('Enter the price per AC, e.g. 40,500.')).toBeTruthy();
  });

  it('sends the person to sign in again when the session has ended, coming back to this page', async () => {
    sendPrice.mockImplementation(async () => ({ authError: true }));
    render(<EnquiryRow line={line()} />);
    fireEvent.change(priceBox(), { target: { value: '40500' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText('Please sign in again.')).toBeTruthy();
    expect(router.replace).toHaveBeenCalledWith('/admin/login?expired=1&next=%2Fadmin%2Fenquiries%3Ftab%3Dwaiting');
  });

  it('sends a person without access to the no-access page', async () => {
    sendPrice.mockImplementation(async () => ({ forbidden: true }));
    render(<EnquiryRow line={line()} />);
    fireEvent.change(priceBox(), { target: { value: '40500' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText("You don't have access to this.")).toBeTruthy();
    expect(router.replace).toHaveBeenCalledWith('/admin/no-access');
  });
});

describe('an AC enquiry with a price sent', () => {
  it('shows "Price sent ₹40,500", the note, and Sold / Not taken', () => {
    render(<EnquiryRow line={quoted()} />);
    expect(screen.getByText('Price sent ₹40,500')).toBeTruthy();
    expect(screen.getByText('Per AC, GST included. For 2 ACs: ₹81,000')).toBeTruthy();
    expect(screen.getByText('Includes standard installation.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sold' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Not taken' })).toBeTruthy();
    expect(screen.queryByLabelText(/Price per AC/)).toBeNull();
    // Rahul has no email: no email link
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });

  it('asks "Mark as sold?" first; going back calls nothing', () => {
    render(<EnquiryRow line={quoted()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sold' }));
    expect(screen.getByText('Mark as sold?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'No, go back' }));
    expect(screen.queryByText('Mark as sold?')).toBeNull();
    expect(closeEnquiry).not.toHaveBeenCalled();
  });

  it('marks it sold once, even on a double click', async () => {
    const answer = deferred<State>();
    closeEnquiry.mockImplementation(() => answer.promise);
    render(<EnquiryRow line={quoted()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sold' }));
    const yes = screen.getByRole('button', { name: 'Yes, mark as sold' });
    // Both clicks land before React re-renders (and disables) the button.
    act(() => {
      yes.click();
      yes.click();
    });
    await waitFor(() => expect(closeEnquiry).toHaveBeenCalled());
    expect(closeEnquiry).toHaveBeenCalledTimes(1);
    expect(closeEnquiry).toHaveBeenCalledWith('line-2-1', 'SOLD');
    expect(screen.getByRole('button', { name: /Saving/ }).hasAttribute('disabled')).toBe(true);
    await act(async () => answer.resolve({ ok: true }));
  });

  it('asks "Mark as not taken?" and then marks it not taken', async () => {
    render(<EnquiryRow line={quoted()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not taken' }));
    expect(screen.getByText('Mark as not taken?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, mark as not taken' }));
    await waitFor(() => expect(closeEnquiry).toHaveBeenCalledWith('line-2-1', 'NOT_TAKEN'));
  });

  it('sends the person to sign in again when the session ended while closing', async () => {
    closeEnquiry.mockImplementation(async () => ({ authError: true }));
    render(<EnquiryRow line={quoted()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, mark as sold' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login?expired=1&next=%2Fadmin%2Fenquiries%3Ftab%3Dwaiting'));
  });
});

describe('S08: changing a price already sent, and closing a waiting line', () => {
  it('"Change price" opens the form with the price and note sent, and sends the updated price', async () => {
    const notices: string[] = [];
    render(<EnquiryRow line={quoted()} onNotice={(n) => notices.push(n.text)} />);
    expect(screen.queryByLabelText(/Price per AC/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change price' }));
    expect((priceBox() as HTMLInputElement).value).toBe('40500');
    expect((screen.getByLabelText(/Note for the customer/) as HTMLTextAreaElement).value).toBe('Includes standard installation.');
    fireEvent.change(priceBox(), { target: { value: '39,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send updated price' }));
    await waitFor(() => expect(sendPrice).toHaveBeenCalledTimes(1));
    expect(sendPrice.mock.calls[0][0]).toBe('line-2-1');
    expect(sendPrice.mock.calls[0][2].get('total')).toBe('39,000');
    await waitFor(() => expect(notices).toContain('Price updated. The customer gets an email with the new price.'));
    // the form closes again after it was sent
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Send updated price' })).toBeNull());
  });

  it('Cancel closes the form and sends nothing', () => {
    render(<EnquiryRow line={quoted()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText(/Price per AC/)).toBeNull();
    expect(sendPrice).not.toHaveBeenCalled();
  });

  it('says so when nothing changed (same price and note: no email)', async () => {
    sendPrice.mockImplementation(async () => ({ ok: true, unchanged: true }));
    const notices: string[] = [];
    render(<EnquiryRow line={quoted()} onNotice={(n) => notices.push(n.text)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send updated price' }));
    await waitFor(() => expect(notices).toContain('Nothing changed: that is already the price and note sent. No email was sent.'));
  });

  it('a line still waiting for a price can be closed (Sold / Not taken) as well as priced', async () => {
    render(<EnquiryRow line={line()} />);
    expect(screen.getByLabelText(/Price per AC/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Not taken' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, mark as not taken' }));
    await waitFor(() => expect(closeEnquiry).toHaveBeenCalledWith('line-1-1', 'NOT_TAKEN'));
  });
});

describe('a closed AC enquiry', () => {
  it('shows Sold or Not taken, with no buttons', () => {
    render(
      <>
        <EnquiryRow line={quoted({ lineId: 'a', status: 'FULFILLED' })} />
        <EnquiryRow line={line({ lineId: 'b', status: 'CANCELLED' })} />
      </>,
    );
    expect(screen.getByText('Sold')).toBeTruthy();
    expect(screen.getByText('Not taken')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('the list of AC enquiries', () => {
  it('says the enquiry was already updated (409) and refreshes the list', async () => {
    closeEnquiry.mockImplementation(async () => ({ conflict: true, error: 'This enquiry was already updated. Refresh to see the latest.' }));
    render(<EnquiryList lines={[quoted()]} emptyText="Nothing here." />);
    fireEvent.click(screen.getByRole('button', { name: 'Sold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, mark as sold' }));
    expect(await screen.findByText('This enquiry was already updated. Refresh to see the latest.')).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps a note of what was done after the row has moved to another tab', async () => {
    const { rerender } = render(<EnquiryList lines={[line()]} emptyText="No AC enquiries are waiting for your price." />);
    fireEvent.change(priceBox(), { target: { value: '40,500' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText(/Price sent\. The customer gets an email/)).toBeTruthy();
    // Focus moves to the note, so keyboard users are not left on a row that is about to go.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText(/Price sent\. The customer gets an email/)));
    rerender(<EnquiryList lines={[]} emptyText="No AC enquiries are waiting for your price." />);
    expect(screen.getByText(/Price sent\. The customer gets an email/)).toBeTruthy();
    expect(screen.getByText('No AC enquiries are waiting for your price.')).toBeTruthy();
  });
});

describe('the AC enquiries screen', () => {
  const ENQUIRIES = {
    enquiries: [
      line(),
      quoted(),
      line({ lineId: 'line-2-2', productName: 'Blue Star AHU', listedPrice: null }),
      quoted({ lineId: 'line-9-1', status: 'FULFILLED', productName: 'Daikin 1 TR Split AC' }),
    ],
  };
  const screenFor = async (searchParams: Record<string, string>) =>
    render((await EnquiriesScreen({ searchParams: Promise.resolve(searchParams) })) as ReactElement);

  it('has tabs with counts as links, the current one marked, and shows only that tab', async () => {
    answers.set('/enquiries', ENQUIRIES);
    await screenFor({});
    const tabs = screen.getByRole('navigation', { name: 'AC enquiry status' });
    const links = within(tabs).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Waiting for your price (2)', '/admin/enquiries?tab=waiting'],
      ['Price sent (1)', '/admin/enquiries?tab=sent'],
      ['Closed (1)', '/admin/enquiries?tab=closed'],
    ]);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].getAttribute('aria-current')).toBeNull();
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Blue Star 4.0 TR Cassette AC', 'Blue Star AHU']);
    expect(adminRequest).toHaveBeenCalledWith('GET', '/enquiries');
  });

  it('shows the "Price sent" tab, and treats an unknown tab as "waiting"', async () => {
    answers.set('/enquiries', ENQUIRIES);
    await screenFor({ tab: 'sent' });
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Mitsubishi 1.5 TR Split AC']);
    cleanup();
    await screenFor({ tab: 'nonsense' });
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('says so in plain words when a tab is empty', async () => {
    answers.set('/enquiries', { enquiries: [] });
    await screenFor({ tab: 'closed' });
    expect(screen.getByText('No closed AC enquiries yet.')).toBeTruthy();
  });

  it('says when PYS cannot be reached, with Try again for the same tab', async () => {
    answers.set('/enquiries', new PysError(503, 'PYS_UNREACHABLE', 'down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await screenFor({ tab: 'sent' });
    expect(screen.getByRole('alert').textContent).toMatch(/We couldn.t reach PYS/);
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/admin/enquiries?tab=sent');
    err.mockRestore();
  });

  it('sends the person to sign in again when the session has ended', async () => {
    answers.set('/enquiries', new AdminAuthError());
    adminPath = '/admin/enquiries?tab=sent';
    await expect(EnquiriesScreen({ searchParams: Promise.resolve({ tab: 'sent' }) })).rejects.toMatchObject({
      url: '/admin/login?expired=1&next=%2Fadmin%2Fenquiries%3Ftab%3Dsent',
    });
  });
});
