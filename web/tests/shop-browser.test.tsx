// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import products from '../dev/fixtures/products.json';
import type { Product } from '@/lib/pys/types';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/shop',
  useSearchParams: () => new URLSearchParams(search),
}));

const { ShopBrowser } = await import('@/components/shop/shop-browser');
const all = ((products as { products?: Product[] }).products ?? (products as unknown as Product[])) as Product[];

beforeEach(() => {
  replace.mockReset();
});
afterEach(cleanup);

describe('ShopBrowser', () => {
  it('shows only the type in the address and marks its chip', () => {
    search = 'type=window';
    render(<ShopBrowser products={all} />);
    expect(screen.getByRole('button', { name: 'Window' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Voltas 1.5 Ton 3-Star Window AC (Copper Condenser)')).toBeTruthy();
  });

  it('has a filter panel with labelled sections, and brand choices show how many ACs they have', () => {
    search = '';
    render(<ShopBrowser products={all} />);
    const panel = screen.getByRole('region', { name: 'Filters' });
    for (const legend of ['Type', 'Size', 'Brand', 'Star rating', 'Price']) {
      expect(within(panel).getByRole('group', { name: legend })).toBeTruthy();
    }
    const voltas = within(panel).getByRole('radio', { name: /^Voltas/ });
    expect(voltas.textContent).toContain(String(all.filter((p) => p.brand === 'Voltas').length));
    expect(within(panel).getByRole('radio', { name: /^All brands/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('writes a new filter into the address', () => {
    search = 'type=window';
    render(<ShopBrowser products={all} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Voltas/ }));
    expect(replace).toHaveBeenCalledWith('/shop?type=window&brand=Voltas', { scroll: false });
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'price-asc' } });
    expect(replace).toHaveBeenLastCalledWith('/shop?type=window&sort=price-asc', { scroll: false });
  });

  it('shows each active filter as a pill that can be removed', () => {
    search = 'type=window&star=3';
    render(<ShopBrowser products={all} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Window' }));
    expect(replace).toHaveBeenCalledWith('/shop?star=3', { scroll: false });
    expect(screen.getByRole('button', { name: 'Remove filter: 3 star' })).toBeTruthy();
  });

  it('says so when nothing matches and offers to clear the filters', () => {
    search = 'type=cassette&brand=Voltas';
    render(<ShopBrowser products={all} />);
    expect(screen.getByText('No ACs match these filters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(replace).toHaveBeenCalledWith('/shop', { scroll: false });
  });
});
