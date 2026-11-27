// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { fixtureCatalog } from './helpers/catalog';
import { lineKey } from '@/lib/basket';
import { formatInr } from '@/lib/format';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/book',
  useSearchParams: () => new URLSearchParams(search),
}));

const { BookFlow } = await import('@/components/book/book-flow');
const fetchMock = vi.fn();

const saveBasket = (lines: Array<{ type: 'SERVICE' | 'AMC'; ref: string; name: string }>) =>
  localStorage.setItem('ess-basket', JSON.stringify({ v: 1, lines: lines.map((l) => ({ ...l, key: lineKey(l.type, l.ref), quantity: 1 })) }));
const saved = () => JSON.parse(localStorage.getItem('ess-basket') ?? '{"lines":[]}');
const flow = () => render(<BookFlow catalog={fixtureCatalog} phone="+91 7977805245" />);
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole('button', { name })));

async function fillAndSend() {
  click('Continue');
  type(/^Flat, building and street/, '12 Sea View, Chembur');
  click('Continue');
  type(/^Your name/, 'Asha Rao');
  type(/^Mobile number/, '+91 98765 43210');
  act(() => fireEvent.click(screen.getByRole('checkbox', { name: /I agree that/ })));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send request' })));
}

beforeEach(() => {
  localStorage.clear();
  search = '';
  replace.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookFlow', () => {
  it('adds the service from a "Book this" link once and tidies the address', () => {
    search = 'service=SVC-DIAG';
    flow();
    expect(saved().lines).toHaveLength(1);
    expect(saved().lines[0]).toMatchObject({ type: 'SERVICE', ref: 'SVC-DIAG', quantity: 1 });
    expect(replace).toHaveBeenCalledWith('/book', { scroll: false });
    expect(screen.getByText('Diagnosis visit')).toBeTruthy();
  });

  it('does not add a second one when the item is already saved', () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-DIAG', name: 'Diagnosis visit' }]);
    search = 'service=SVC-DIAG';
    flow();
    expect(saved().lines).toHaveLength(1);
    expect(saved().lines[0].quantity).toBe(1);
  });

  it('sends AC links to the enquiry page', () => {
    search = 'product=nlbvy46fALr4txUIZfqr';
    flow();
    expect(replace).toHaveBeenCalledWith('/enquiry?product=nlbvy46fALr4txUIZfqr', { scroll: false });
  });

  it('blocks things that are no longer offered until they are removed', () => {
    saveBasket([
      { type: 'SERVICE', ref: 'SVC-NOPE', name: 'Old service' },
      { type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' },
    ]);
    flow();
    expect(screen.getByText('No longer available')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
    click('Remove Old service');
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the payment breakdown: before GST, GST and total', () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' }]);
    flow();
    const jet = fixtureCatalog.services.find((s) => s.code === 'SVC-JET-WASH')!.price!;
    const summary = screen.getByRole('region', { name: 'Payment breakdown' });
    expect(summary.textContent).toContain('Before GST');
    expect(summary.textContent).toContain(formatInr(jet.base));
    expect(summary.textContent).toContain(`GST ${jet.gstRatePercent}%`);
    expect(summary.textContent).toContain(formatInr(jet.gst));
    expect(summary.textContent).toContain(formatInr(jet.total));
    expect(summary.textContent).toContain('You pay after the work is done.');
  });

  it('never shows a ₹0 total when nothing has a fixed price yet', () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-PCB', name: 'PCB repair' }]);
    flow();
    expect(screen.queryByText(/₹0/)).toBeNull();
  });

  it('insists on consent before sending', async () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' }]);
    flow();
    click('Continue');
    type(/^Flat, building and street/, '12 Sea View, Chembur');
    click('Continue');
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '98765 43210');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send request' })));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /I agree that/ }).getAttribute('aria-invalid')).toBe('true');
  });

  it('sends the whole basket and shows the tracking code', async () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' }]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ trackingCode: 'ESS-LOCL-DEV2', intakeNumber: 'WEB-1' }), { status: 200 }));
    flow();
    await fillAndSend();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('BASKET');
    expect(body.items).toEqual([{ type: 'SERVICE', ref: 'SVC-JET-WASH', quantity: 1 }]);
    expect(body.address).toMatchObject({ line: '12 Sea View, Chembur', city: 'Mumbai' });
    expect(await screen.findByText('ESS-LOCL-DEV2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Track this request' }).getAttribute('href')).toBe('/track?code=ESS-LOCL-DEV2');
    expect(saved().lines).toHaveLength(0);
  });

  it('keeps a PYS error on the right line after another line is removed', async () => {
    saveBasket([
      { type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' },
      { type: 'SERVICE', ref: 'SVC-GAS', name: 'Gas' },
    ]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Please check the highlighted details.', fields: { 'items.1': 'Unknown service code' } }), { status: 422 }));
    flow();
    await fillAndSend();
    expect(screen.getByText('Unknown service code')).toBeTruthy();
    click(/^Remove Jet wash/);
    expect(screen.getByText('Unknown service code')).toBeTruthy();
  });
});

describe('StepWhere', () => {
  it('says whether we cover the pincode once the customer leaves the box', async () => {
    const { StepWhere, EMPTY_WHERE } = await import('@/components/book/step-where');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ pincode: '400071', serviceable: true, area: 'Mumbai, Thane & Navi Mumbai' })));
    render(<StepWhere value={{ ...EMPTY_WHERE, pincode: '400 071' }} onChange={() => {}} errors={{}} />);
    await act(async () => fireEvent.blur(screen.getByLabelText(/^Pincode/)));
    expect(await screen.findByText('We cover Mumbai, Thane & Navi Mumbai.')).toBeTruthy();
  });

  it('offers the visit times inside office hours (Mon–Sat 9:00–6:30)', async () => {
    const { StepWhere, EMPTY_WHERE } = await import('@/components/book/step-where');
    render(<StepWhere value={EMPTY_WHERE} onChange={() => {}} errors={{}} />);
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Morning (9–12)', 'Afternoon (12–3)', 'Evening (3–6:30)']);
  });
});

describe('BookFlow note pre-fill from the customer account (S11b)', () => {
  beforeEach(() => sessionStorage.clear());
  const toDetails = () => {
    click('Continue');
    type(/^Flat, building and street/, '12 Sea View, Chembur');
    click('Continue');
  };
  const noteBox = () => screen.getByLabelText(/^Anything we should know/) as HTMLTextAreaElement;

  it('puts ?note= in the note box (plain text, still editable) alongside ?service=', () => {
    search = `service=SVC-DIAG&note=${encodeURIComponent('Complaint about my Daikin 1.5 ton · Living room. Problem:')}`;
    flow();
    expect(saved().lines[0]).toMatchObject({ ref: 'SVC-DIAG' });
    toDetails();
    expect(noteBox().value).toBe('Complaint about my Daikin 1.5 ton · Living room. Problem:');
    fireEvent.change(noteBox(), { target: { value: 'Water dripping' } });
    expect(noteBox().value).toBe('Water dripping');
  });

  it('cleans the note: no control characters, at most 300 characters', () => {
    search = `service=SVC-DIAG&note=${encodeURIComponent(`a\u0000<b>\n${'x'.repeat(400)}`)}`;
    flow();
    toDetails();
    expect(noteBox().value.startsWith('a <b> x')).toBe(true);
    expect(noteBox().value).toHaveLength(300);
  });

  it('keeps the note for this tab, so it survives going to add a service', () => {
    search = `note=${encodeURIComponent('Service for my LG Window AC.')}`;
    flow();
    expect(sessionStorage.getItem('ess-book-note')).toBe('Service for my LG Window AC.');
    cleanup();
    search = 'service=SVC-DRY';
    flow();
    toDetails();
    expect(noteBox().value).toBe('Service for my LG Window AC.');
  });

  it('sends the note as the request message and forgets it afterwards', async () => {
    search = `service=SVC-JET-WASH&note=${encodeURIComponent('Service for my LG Window AC.')}`;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ trackingCode: 'ESS-LOCL-DEV3', intakeNumber: 'WEB-2' }), { status: 200 }));
    flow();
    await fillAndSend();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toBe('Service for my LG Window AC.');
    expect(await screen.findByText('ESS-LOCL-DEV3')).toBeTruthy();
    expect(sessionStorage.getItem('ess-book-note')).toBeNull();
  });
});
