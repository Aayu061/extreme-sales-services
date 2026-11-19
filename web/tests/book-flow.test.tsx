// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import products from '../dev/fixtures/products.json';
import { fixtureCatalog } from './helpers/catalog';
import { lineKey } from '@/lib/basket';
import type { Product } from '@/lib/pys/types';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/book',
  useSearchParams: () => new URLSearchParams(search),
}));

const { BookFlow } = await import('@/components/book/book-flow');
const all = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];
const fetchMock = vi.fn();

const saveBasket = (lines: Array<{ type: 'SERVICE' | 'AMC' | 'PRODUCT'; ref: string; name: string }>) =>
  localStorage.setItem('ess-basket', JSON.stringify({ v: 1, lines: lines.map((l) => ({ ...l, key: lineKey(l.type, l.ref), quantity: 1 })) }));
const saved = () => JSON.parse(localStorage.getItem('ess-basket') ?? '{"lines":[]}');
const flow = () => render(<BookFlow catalog={fixtureCatalog} products={all} phone="+91 7977805245" />);
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole('button', { name })));

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

  it('skips the visit step for ACs only and insists on consent', async () => {
    saveBasket([{ type: 'PRODUCT', ref: 'nlbvy46fALr4txUIZfqr', name: 'Daikin' }]);
    flow();
    click('Continue');
    expect(screen.queryByLabelText(/^Flat, building and street/)).toBeNull();
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '98765 43210');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send request' })));
    expect(fetchMock).not.toHaveBeenCalled();
    const box = screen.getByRole('checkbox', { name: /I agree that Extreme Sales & Services/ });
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Please tick this box so we can handle your request.')).toBeTruthy();
  });

  it('sends the whole basket and shows the tracking code', async () => {
    saveBasket([{ type: 'SERVICE', ref: 'SVC-JET-WASH', name: 'Jet wash' }]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ trackingCode: 'ESS-LOCL-DEV2', intakeNumber: 'WEB-1' }), { status: 200 }));
    flow();
    click('Continue');
    type(/^Flat, building and street/, '12 Sea View, Chembur');
    click('Continue');
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '+91 98765 43210');
    act(() => fireEvent.click(screen.getByRole('checkbox', { name: /I agree that/ })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send request' })));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/request');
    const body = JSON.parse(init.body);
    expect(body.kind).toBe('BASKET');
    expect(body.items).toEqual([{ type: 'SERVICE', ref: 'SVC-JET-WASH', quantity: 1 }]);
    expect(body.address).toMatchObject({ line: '12 Sea View, Chembur', city: 'Mumbai' });
    expect(await screen.findByText('ESS-LOCL-DEV2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Track this request' }).getAttribute('href')).toBe('/track?code=ESS-LOCL-DEV2');
    expect(saved().lines).toHaveLength(0);
  });
});

describe('StepWhere pincode note', () => {
  it('says whether we cover the pincode once the customer leaves the box', async () => {
    const { StepWhere, EMPTY_WHERE } = await import('@/components/book/step-where');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ pincode: '400071', serviceable: true, area: 'Mumbai, Thane & Navi Mumbai' })));
    render(<StepWhere value={{ ...EMPTY_WHERE, pincode: '400 071' }} onChange={() => {}} errors={{}} />);
    await act(async () => fireEvent.blur(screen.getByLabelText(/^Pincode/)));
    expect(await screen.findByText('We cover Mumbai, Thane & Navi Mumbai.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/serviceability/400071');
  });
});
