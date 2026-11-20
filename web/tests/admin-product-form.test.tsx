// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';

// ---- Fakes: the server actions, the router, PYS answers by path, redirect()/notFound() throwing like Next ----

type State = Record<string, unknown>;
const createProduct = vi.fn<(prev: State, fd: FormData) => Promise<State>>(async () => ({}));
const updateProduct = vi.fn<(id: string, prev: State, fd: FormData) => Promise<State>>(async () => ({ ok: true }));
const setShown = vi.fn<(id: string, shown: boolean) => Promise<State>>(async () => ({ ok: true }));
vi.mock('@/app/admin/actions/products', () => ({
  createProduct: (...args: [State, FormData]) => createProduct(...args),
  updateProduct: (...args: [string, State, FormData]) => updateProduct(...args),
  setShown: (...args: [string, boolean]) => setShown(...args),
}));

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/products',
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  notFound: () => {
    throw new NotFound('not found');
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected || err instanceof NotFound) throw err;
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
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-ess-admin-path': '/admin/products' }) }));

import { PysError } from '@/lib/pys/client';
import { PHOTO_ORIGIN } from '@/lib/product-photo';
import type { AdminProduct } from '@/lib/admin/types';
import { PhotoPicker } from '@/components/admin/photo-picker';
import { ProductForm } from '@/components/admin/product-form';
import { ProductsTable } from '@/components/admin/products-table';
import { ProductEditScreen, ProductsScreen } from '@/components/admin/products-view';

const product = (extra: Partial<AdminProduct> = {}): AdminProduct => ({
  id: 'daikin-ftkm50-1a2b3c',
  name: 'Daikin 1.5 Ton 5 Star Inverter Split AC',
  category: 'residential',
  brand: 'Daikin',
  modelNumber: 'FTKM50',
  tonnage: '1.5 TR',
  starRating: '5 Star',
  price: 45990,
  mrp: 58400,
  stock: 4,
  inStock: true,
  isCustomQuote: false,
  description: 'Quiet inverter split AC for a bedroom.',
  coolingCapacity: null,
  powerConsumption: null,
  refrigerant: 'R32',
  noiseLevel: null,
  dimensions: null,
  warranty: null,
  keyFeatures: ['Copper condenser'],
  imageUrl: `${PHOTO_ORIGIN}/images/products/daikin-ftkm71u.jpg`,
  spaceType: 'homes',
  idealFor: null,
  countryOfOrigin: null,
  isPublished: true,
  displayOrder: 100,
  seller: null,
  updatedAt: null,
  ...extra,
});

const PHOTOS = ['daikin-ftkm71u.jpg', 'voltas-185v.jpg'];
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ photos: PHOTOS }), { status: 200 }));

beforeEach(() => {
  createProduct.mockReset();
  createProduct.mockImplementation(async () => ({}));
  updateProduct.mockReset();
  updateProduct.mockImplementation(async () => ({ ok: true }));
  setShown.mockReset();
  setShown.mockImplementation(async () => ({ ok: true }));
  router.replace.mockClear();
  router.refresh.mockClear();
  answers.clear();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });

describe('PhotoPicker', () => {
  it('lists the given photos and "Drawn AC (no photo)", with the current one chosen', () => {
    const onChange = vi.fn();
    render(<PhotoPicker photos={PHOTOS} value="voltas-185v.jpg" onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Photo' });
    const options = within(group).getAllByRole('radio');
    expect(options.map((o) => o.getAttribute('aria-label') ?? (o as HTMLInputElement).labels?.[0]?.textContent?.trim())).toEqual([
      'Drawn AC (no photo)',
      'daikin-ftkm71u.jpg',
      'voltas-185v.jpg',
    ]);
    expect((within(group).getByRole('radio', { name: 'voltas-185v.jpg' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(group).getByRole('radio', { name: 'Drawn AC (no photo)' }));
    expect(onChange).toHaveBeenCalledWith('');
    fireEvent.click(within(group).getByRole('radio', { name: 'daikin-ftkm71u.jpg' }));
    expect(onChange).toHaveBeenLastCalledWith('daikin-ftkm71u.jpg');
  });

  it('keeps a chosen photo that is no longer in the folder, so saving does not drop it silently', () => {
    render(<PhotoPicker photos={PHOTOS} value="old-photo.jpg" onChange={() => {}} />);
    expect((screen.getByRole('radio', { name: /old-photo\.jpg/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('says when the photos are still loading or could not be loaded, and still offers the drawn AC', () => {
    const { rerender } = render(<PhotoPicker photos={null} value="" onChange={() => {}} />);
    expect(screen.getByText('Loading the photos…')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Drawn AC (no photo)' })).toBeTruthy();
    rerender(<PhotoPicker photos={null} failed value="" onChange={() => {}} />);
    expect(screen.getByText(/couldn't load the photos/)).toBeTruthy();
  });
});

describe('ProductForm (add)', () => {
  it('loads the photo list from /api/admin/photos for the picker', async () => {
    render(<ProductForm mode="create" />);
    expect(await screen.findByRole('radio', { name: 'voltas-185v.jpg' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/photos', expect.objectContaining({ cache: 'no-store' }));
    expect(screen.getByRole('radio', { name: 'Drawn AC (no photo)' })).toBeTruthy();
  });

  it('shows the owner\'s rule about claims next to the description and key features', async () => {
    render(<ProductForm mode="create" />);
    const note = screen.getByRole('note');
    expect(note.textContent).toMatch(/arrival times/);
    expect(note.textContent).toMatch(/genuine/);
    expect(note.textContent).toMatch(/OEM/);
    expect(note.textContent).toMatch(/certified/);
    expect(note.textContent).toMatch(/verified/);
    expect(note.textContent).toMatch(/reviews/);
    await screen.findByRole('radio', { name: 'voltas-185v.jpg' });
  });

  it('updates the preview card as you type', async () => {
    render(<ProductForm mode="create" />);
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByRole('article', { name: 'New AC' })).toBeTruthy();
    type(/^Name/, 'Voltas 1.5 Ton 3 Star Window AC');
    type(/^Price/, '32,990');
    expect(within(preview).getByRole('article', { name: 'Voltas 1.5 Ton 3 Star Window AC' })).toBeTruthy();
    expect(preview.textContent).toContain('₹32,990');
    await screen.findByRole('radio', { name: 'voltas-185v.jpg' });
  });

  it("says \"Price can't be more than the MRP.\" and sends nothing", async () => {
    render(<ProductForm mode="create" />);
    type(/^Name/, 'Voltas 1.5 Ton Window AC');
    type(/^Price/, '60,000');
    type(/^MRP/, '50,000');
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(await screen.findByText("Price can't be more than the MRP.")).toBeTruthy();
    expect(field(/^Price/).getAttribute('aria-invalid')).toBe('true');
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('adds the product once, even on a double click', async () => {
    let finish: (s: State) => void = () => {};
    createProduct.mockImplementation(() => new Promise((r) => (finish = r)));
    render(<ProductForm mode="create" />);
    type(/^Name/, 'Voltas 1.5 Ton Window AC');
    const button = screen.getByRole('button', { name: 'Add product' });
    const formEl = button.closest('form')!;
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.submit(formEl);
    });
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect((createProduct.mock.calls[0][1] as FormData).get('name')).toBe('Voltas 1.5 Ton Window AC');
    await act(async () => finish({ fields: { id: 'This product ID is already used. Choose another, or leave it empty.' } }));
    expect(await screen.findByText('This product ID is already used. Choose another, or leave it empty.')).toBeTruthy();
    // What was typed stays in the form.
    expect(field(/^Name/).value).toBe('Voltas 1.5 Ton Window AC');
  });

  it('sends the person to sign in again when the session has ended', async () => {
    createProduct.mockResolvedValueOnce({ authError: true });
    render(<ProductForm mode="create" />);
    type(/^Name/, 'Voltas 1.5 Ton Window AC');
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    expect(await screen.findByText('Please sign in again.')).toBeTruthy();
    expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/login\?expired=1&next=/));
  });
});

describe('ProductForm (edit)', () => {
  it('starts with the product\'s details and its photo chosen', async () => {
    render(<ProductForm mode="edit" product={product()} />);
    expect(field(/^Name/).value).toBe('Daikin 1.5 Ton 5 Star Inverter Split AC');
    expect(field(/^Price/).value).toBe('45990');
    expect((screen.getByLabelText('Show on the website') as HTMLInputElement).checked).toBe(true);
    expect(((await screen.findByRole('radio', { name: 'daikin-ftkm71u.jpg' })) as HTMLInputElement).checked).toBe(true);
    // The id cannot be changed once the product exists.
    expect(screen.queryByLabelText(/^Product ID/)).toBeNull();
  });

  it('saves the changes for this product and says so', async () => {
    render(<ProductForm mode="edit" product={product()} />);
    type(/^Price/, '44,990');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    expect(updateProduct).toHaveBeenCalledTimes(1);
    expect(updateProduct.mock.calls[0][0]).toBe('daikin-ftkm50-1a2b3c');
    expect((updateProduct.mock.calls[0][2] as FormData).get('price')).toBe('44,990');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('shows the PYS field messages on the fields', async () => {
    updateProduct.mockResolvedValueOnce({ fields: { price: "Price can't be more than the MRP." } });
    render(<ProductForm mode="edit" product={product()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText("Price can't be more than the MRP.")).toBeTruthy();
  });

  it('says "Product added." after adding', async () => {
    render(<ProductForm mode="edit" product={product()} added />);
    expect(screen.getByText('Product added.')).toBeTruthy();
    await screen.findByRole('radio', { name: 'voltas-185v.jpg' });
  });
});

describe('ProductsTable', () => {
  const list = [product({ id: 'a', name: 'Daikin Split' }), product({ id: 'b', name: 'Voltas Window', isPublished: false, price: null })];

  it('marks hidden products with a "Hidden" badge, and links to each product', () => {
    render(<ProductsTable products={list} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).queryByText('Hidden')).toBeNull();
    expect(within(rows[0]).getByText('Shown')).toBeTruthy();
    expect(within(rows[1]).getByText('Hidden')).toBeTruthy();
    expect(within(rows[1]).getByText('Price on request')).toBeTruthy();
    expect(within(rows[0]).getByRole('link', { name: 'Daikin Split' }).getAttribute('href')).toBe('/admin/products/a');
    expect(within(rows[0]).getByRole('link', { name: 'Edit Daikin Split' }).getAttribute('href')).toBe('/admin/products/a');
  });

  it('shows a hidden product with one call to setShown, even on a double click', async () => {
    let finish: (s: State) => void = () => {};
    setShown.mockImplementation(() => new Promise((r) => (finish = r)));
    render(<ProductsTable products={list} />);
    const show = screen.getByRole('button', { name: 'Show Voltas Window' });
    await act(async () => {
      fireEvent.click(show);
      fireEvent.click(show);
    });
    expect(setShown).toHaveBeenCalledTimes(1);
    expect(setShown).toHaveBeenCalledWith('b', true);
    await act(async () => finish({ ok: true }));
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText('Voltas Window is shown on the website.')).toBeTruthy();
  });

  it('keeps the notice above the list (and moves focus to it) when a filter makes the row leave', async () => {
    const { rerender } = render(<ProductsTable products={[list[1]]} filtered empty={<p>No products match</p>} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Voltas Window' }));
    const notice = await screen.findByText('Voltas Window is shown on the website.');
    // The refreshed "hidden" list no longer has it.
    rerender(<ProductsTable products={[]} filtered empty={<p>No products match</p>} />);
    expect(screen.getByText('No products match')).toBeTruthy();
    expect(screen.getByText('Voltas Window is shown on the website.')).toBe(notice);
    await waitFor(() => expect(document.activeElement).toBe(notice));
  });

  it('hides a shown product', async () => {
    render(<ProductsTable products={list} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide Daikin Split' }));
    await waitFor(() => expect(setShown).toHaveBeenCalledWith('a', false));
  });

  it('goes to sign in again, or to no access, when PYS says so', async () => {
    setShown.mockResolvedValueOnce({ authError: true });
    render(<ProductsTable products={list} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide Daikin Split' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/login\?expired=1/)));
    setShown.mockResolvedValueOnce({ forbidden: true });
    // The first press has finished once its button is back.
    fireEvent.click(await screen.findByRole('button', { name: 'Hide Daikin Split' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/no-access'));
  });
});

describe('ProductsScreen', () => {
  const list = [
    product({ id: 'a', name: 'Daikin Split', brand: 'Daikin' }),
    product({ id: 'b', name: 'Voltas Window', brand: 'Voltas', isPublished: false }),
    product({ id: 'c', name: 'Blue Star Tower', brand: 'Blue Star' }),
  ];
  const screenFor = async (searchParams: Record<string, string>) =>
    render((await ProductsScreen({ searchParams: Promise.resolve(searchParams) })) as ReactElement);

  it('lists all products with counts and a way to add one', async () => {
    answers.set('/products', { products: list });
    await screenFor({});
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('3 products · 2 shown · 1 hidden')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add a product' }).getAttribute('href')).toBe('/admin/products/new');
  });

  it('has a search box and a shown/hidden filter, kept in the address', async () => {
    answers.set('/products', { products: list });
    await screenFor({ q: 'voltas', show: 'hidden' });
    expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('voltas');
    expect((screen.getByLabelText('On the website') as HTMLSelectElement).value).toBe('hidden');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Voltas Window');
    const formEl = screen.getByRole('search');
    expect(formEl.getAttribute('method')).toBe('get');
    expect(formEl.getAttribute('action')).toBe('/admin/products');
  });

  it('says when nothing matches, with a way back to all products', async () => {
    answers.set('/products', { products: list });
    await screenFor({ q: 'nothing-like-this' });
    expect(screen.getByText('No products match')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Show all products' }).getAttribute('href')).toBe('/admin/products');
  });

  it('says plainly when PYS cannot be reached', async () => {
    answers.set('/products', new PysError(503, 'PYS_UNREACHABLE', 'down'));
    await screenFor({ show: 'shown' });
    expect(screen.getByRole('alert').textContent).toContain("We couldn't reach PYS");
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/admin/products?show=shown');
  });
});

describe('ProductEditScreen', () => {
  it('shows the form and the live preview card for the product', async () => {
    answers.set('/products', { products: [product()] });
    render(
      (await ProductEditScreen({ params: Promise.resolve({ id: 'daikin-ftkm50-1a2b3c' }), searchParams: Promise.resolve({}) })) as ReactElement,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Daikin 1.5 Ton 5 Star Inverter Split AC');
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByRole('article', { name: 'Daikin 1.5 Ton 5 Star Inverter Split AC' })).toBeTruthy();
    await screen.findByRole('radio', { name: 'voltas-185v.jpg' });
  });

  it('shows the admin "not found" for an unknown id', async () => {
    answers.set('/products', { products: [product()] });
    await expect(ProductEditScreen({ params: Promise.resolve({ id: 'no-such-ac' }), searchParams: Promise.resolve({}) })).rejects.toBeInstanceOf(NotFound);
  });
});
