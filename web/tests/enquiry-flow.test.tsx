// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import products from '../dev/fixtures/products.json';
import { lineKey } from '@/lib/basket';
import { formatInr } from '@/lib/format';
import type { Product } from '@/lib/pys/types';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/enquiry',
  useSearchParams: () => new URLSearchParams(search),
}));

const { EnquiryFlow } = await import('@/components/enquiry/enquiry-flow');
const all = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];
const daikin = all.find((p) => p.id === 'nlbvy46fALr4txUIZfqr')!;
const voltas = all.find((p) => p.id === 'CbGQjrQkG6M0D4zx9553')!;
const fetchMock = vi.fn();

const saveList = (ids: string[]) =>
  localStorage.setItem('ess-enquiry', JSON.stringify({ v: 1, lines: ids.map((ref) => ({ key: lineKey('PRODUCT', ref), type: 'PRODUCT', ref, name: ref, quantity: 1 })) }));
const saved = () => JSON.parse(localStorage.getItem('ess-enquiry') ?? '{"lines":[]}');
const flow = () => render(<EnquiryFlow products={all} phone="+91 7977805245" />);
const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

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

describe('EnquiryFlow', () => {
  it('adds the AC from a link once and tidies the address', () => {
    search = `product=${daikin.id}`;
    flow();
    expect(saved().lines.map((l: { ref: string }) => l.ref)).toEqual([daikin.id]);
    expect(replace).toHaveBeenCalledWith('/enquiry', { scroll: false });
  });

  it('lists the ACs with their listed prices and a listed total', () => {
    saveList([daikin.id, voltas.id]);
    flow();
    expect(screen.getByText(daikin.name)).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Price breakdown' });
    const total = daikin.price! + voltas.price!;
    const base = Math.round((daikin.price! / 1.18) * 100) / 100 + Math.round((voltas.price! / 1.18) * 100) / 100;
    expect(summary.textContent).toContain('Before GST');
    expect(summary.textContent).toContain(formatInr(Math.round(base * 100) / 100));
    expect(summary.textContent).toContain('GST 18%');
    expect(summary.textContent).toContain(formatInr(Math.round((total - base) * 100) / 100));
    expect(summary.textContent).toContain(formatInr(total));
  });

  it('blocks an AC that is no longer listed until it is removed', () => {
    saveList(['gone-123', daikin.id]);
    flow();
    expect(screen.getByText('No longer available')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send enquiry' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends a PRODUCT_ENQUIRY with installation notes and shows the tracking code', async () => {
    saveList([daikin.id, voltas.id]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ trackingCode: 'ESS-ENQR-0001', intakeNumber: 'WEB-7' }), { status: 200 }));
    flow();
    act(() => fireEvent.click(screen.getByRole('checkbox', { name: `Installation needed for ${daikin.name}` })));
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '98765 43210');
    type(/^Area or locality/, 'Vashi Sector 17');
    act(() => fireEvent.click(screen.getByRole('checkbox', { name: /I agree that/ })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' })));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('PRODUCT_ENQUIRY');
    expect(body.items).toEqual([
      { type: 'PRODUCT', ref: daikin.id, quantity: 1, notes: 'Installation needed' },
      { type: 'PRODUCT', ref: voltas.id, quantity: 1 },
    ]);
    expect(body.city).toBe('Mumbai');
    expect(body.area).toBe('Vashi Sector 17');
    expect(await screen.findByText('ESS-ENQR-0001')).toBeTruthy();
    expect(saved().lines).toHaveLength(0);
  });

  it('insists on consent before sending', async () => {
    saveList([daikin.id]);
    flow();
    type(/^Your name/, 'Asha Rao');
    type(/^Mobile number/, '98765 43210');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' })));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Please tick this box so we can handle your request.')).toBeTruthy();
  });
});
