// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

beforeEach(() => replace.mockReset());
afterEach(cleanup);

describe('ShopBrowser', () => {
  it('shows only the type in the address and marks its chip', () => {
    search = 'type=window';
    render(<ShopBrowser products={all} />);
    expect(screen.getByRole('button', { name: 'Window' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Voltas 1.5 Ton 3-Star Window AC (Copper Condenser)')).toBeTruthy();
  });

  it('writes a new filter into the address', () => {
    search = 'type=window';
    render(<ShopBrowser products={all} />);
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Voltas' } });
    expect(replace).toHaveBeenCalledWith('/shop?type=window&brand=Voltas', { scroll: false });
  });

  it('says so when nothing matches and offers to clear the filters', () => {
    search = 'type=cassette&brand=Voltas';
    render(<ShopBrowser products={all} />);
    expect(screen.getByText('No ACs match these filters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(replace).toHaveBeenCalledWith('/shop', { scroll: false });
  });
});
