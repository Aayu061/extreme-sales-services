import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: PYS (adminRequest), Next's cache calls and redirect() throwing like Next ----

const adminRequest = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>();
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string, body?: unknown) => adminRequest(method, path, body),
}));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => updateTag(tag),
  revalidatePath: (p: string, type?: string) => revalidatePath(p, type),
}));
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));

import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import {
  PRODUCT_MESSAGES,
  filterAdminProducts,
  formDataOf,
  formValuesOf,
  normaliseStar,
  normaliseTonnage,
  previewProduct,
  productsHref,
  productsQuery,
  toProductInput,
} from '@/lib/admin/product-form';
import { PHOTO_ORIGIN, isPhotoFile, photoFileOf, photoPathFromPys, photoUrlForPys } from '@/lib/product-photo';
import { createProduct, setShown, updateProduct } from '@/app/admin/actions/products';
import type { AdminProduct } from '@/lib/admin/types';

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { name: 'Daikin 1.5 Ton 5 Star Inverter Split AC', category: 'residential', price: '45,990', mrp: '58,400' };

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
  warranty: '1 year on the AC, 10 years on the compressor',
  keyFeatures: ['Copper condenser', 'Wi-Fi control'],
  imageUrl: `${PHOTO_ORIGIN}/images/products/daikin-ftkm71u.jpg`,
  spaceType: 'homes',
  idealFor: null,
  countryOfOrigin: 'India',
  isPublished: true,
  displayOrder: 100,
  seller: null,
  updatedAt: null,
  ...extra,
});

beforeEach(() => {
  adminRequest.mockReset();
  updateTag.mockClear();
  revalidatePath.mockClear();
});

describe('toProductInput (mirrors PYS productInputSchema)', () => {
  it("refuses a price above the MRP: fields.price \"Price can't be more than the MRP.\"", () => {
    const r = toProductInput(form({ ...VALID, price: '60,000', mrp: '58,400' }));
    expect(r).toEqual({ ok: false, fields: { price: "Price can't be more than the MRP." } });
  });

  it('allows a price equal to the MRP, or either one alone', () => {
    expect(toProductInput(form({ ...VALID, price: '58,400', mrp: '58,400' })).ok).toBe(true);
    expect(toProductInput(form({ ...VALID, price: '58,400', mrp: '' })).ok).toBe(true);
    expect(toProductInput(form({ ...VALID, price: '', mrp: '58,400' })).ok).toBe(true);
  });

  it('splits key features by line, trimming and dropping blank lines', () => {
    const r = toProductInput(form({ ...VALID, keyFeatures: '  Copper condenser \r\n\n Wi-Fi control\n   \n' }));
    expect(r.ok && r.input.keyFeatures).toEqual(['Copper condenser', 'Wi-Fi control']);
  });

  it('allows at most 8 key features, each up to 200 characters', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `Feature ${i + 1}`).join('\n');
    expect(toProductInput(form({ ...VALID, keyFeatures: nine }))).toEqual({ ok: false, fields: { keyFeatures: 'Add up to 8 key features, one per line.' } });
    const eight = Array.from({ length: 8 }, (_, i) => `Feature ${i + 1}`).join('\n');
    expect(toProductInput(form({ ...VALID, keyFeatures: eight })).ok).toBe(true);
    expect(toProductInput(form({ ...VALID, keyFeatures: 'x'.repeat(201) }))).toEqual({
      ok: false,
      fields: { keyFeatures: 'Keep each key feature to 200 characters or fewer.' },
    });
  });

  it('turns an empty optional field into null (so PYS clears it)', () => {
    const r = toProductInput(form({ ...VALID, brand: '   ', modelNumber: '', description: '', warranty: ' ' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.brand).toBeNull();
    expect(r.input.modelNumber).toBeNull();
    expect(r.input.description).toBeNull();
    expect(r.input.warranty).toBeNull();
    expect(r.input.tonnage).toBeNull();
    expect(r.input.starRating).toBeNull();
    expect(r.input.coolingCapacity).toBeNull();
    expect(r.input.countryOfOrigin).toBeNull();
    expect(r.input.keyFeatures).toEqual([]);
    expect(r.input.imageUrl).toBeNull();
  });

  it('sends rupees as numbers (parsed with parseRupees), and no price as null for "Price on request"', () => {
    const r = toProductInput(form({ ...VALID, price: '₹45,990.50', mrp: 'Rs 58,400/-' }));
    expect(r.ok && [r.input.price, r.input.mrp]).toEqual([45990.5, 58400]);
    const none = toProductInput(form({ ...VALID, price: '', mrp: '' }));
    expect(none.ok && [none.input.price, none.input.mrp]).toEqual([null, null]);
  });

  it('refuses a price or MRP that is not an amount, or above ₹1,00,00,000', () => {
    expect(toProductInput(form({ ...VALID, price: 'abc', mrp: '0' }))).toEqual({
      ok: false,
      fields: { price: PRODUCT_MESSAGES.price, mrp: PRODUCT_MESSAGES.mrp },
    });
    expect(toProductInput(form({ ...VALID, price: '2,00,00,000', mrp: '' }))).toEqual({ ok: false, fields: { price: PRODUCT_MESSAGES.priceTooHigh } });
  });

  it('needs a name of 2 to 200 characters', () => {
    expect(toProductInput(form({ ...VALID, name: ' A ' }))).toEqual({ ok: false, fields: { name: PRODUCT_MESSAGES.name } });
    expect(toProductInput(form({ ...VALID, name: 'x'.repeat(201) }))).toEqual({ ok: false, fields: { name: PRODUCT_MESSAGES.nameTooLong } });
    const r = toProductInput(form({ ...VALID, name: '  Voltas 1.5 Ton Window AC  ' }));
    expect(r.ok && r.input.name).toBe('Voltas 1.5 Ton Window AC');
  });

  it('leaves the id out when empty (PYS makes one from the name), and checks a typed one', () => {
    const empty = toProductInput(form({ ...VALID, id: '  ' }));
    expect(empty.ok && 'id' in empty.input).toBe(false);
    const typed = toProductInput(form({ ...VALID, id: 'daikin-ftkm50' }));
    expect(typed.ok && typed.input.id).toBe('daikin-ftkm50');
    for (const bad of ['Daikin-FTKM50', 'a', '-daikin', 'daikin ftkm', 'daikin_ftkm', `a${'b'.repeat(81)}`]) {
      expect(toProductInput(form({ ...VALID, id: bad }))).toEqual({ ok: false, fields: { id: PRODUCT_MESSAGES.id } });
    }
  });

  it('never sends an id when editing (the id is in the address)', () => {
    const r = toProductInput(form({ ...VALID, id: 'something-else' }), 'update');
    expect(r.ok && 'id' in r.input).toBe(false);
  });

  it('writes tonnage as "1.5 TR" and star rating as "3 Star", keeping other ratings as typed', () => {
    expect(normaliseTonnage('1.5')).toBe('1.5 TR');
    expect(normaliseTonnage('1.5 ton')).toBe('1.5 TR');
    expect(normaliseTonnage(' 2 Tons ')).toBe('2 TR');
    expect(normaliseTonnage('1.5tr')).toBe('1.5 TR');
    expect(normaliseTonnage('10,000 CFM')).toBe('10,000 CFM');
    expect(normaliseTonnage('')).toBeNull();
    expect(normaliseStar('3')).toBe('3 Star');
    expect(normaliseStar('5-star')).toBe('5 Star');
    expect(normaliseStar('3 star')).toBe('3 Star');
    expect(normaliseStar('Commercial Grade')).toBe('Commercial Grade');
    const r = toProductInput(form({ ...VALID, tonnage: '1.5', starRating: '5 star' }));
    expect(r.ok && [r.input.tonnage, r.input.starRating]).toEqual(['1.5 TR', '5 Star']);
    expect(toProductInput(form({ ...VALID, tonnage: 'x'.repeat(21) }))).toEqual({ ok: false, fields: { tonnage: 'Keep this to 20 characters or fewer.' } });
  });

  it('keeps every text within the PYS limits', () => {
    const limits: Record<string, number> = {
      brand: 60,
      modelNumber: 80,
      description: 4000,
      warranty: 200,
      coolingCapacity: 60,
      powerConsumption: 60,
      refrigerant: 40,
      noiseLevel: 40,
      dimensions: 120,
      countryOfOrigin: 80,
    };
    for (const [field, max] of Object.entries(limits)) {
      expect(toProductInput(form({ ...VALID, [field]: 'x'.repeat(max) })).ok).toBe(true);
      expect(toProductInput(form({ ...VALID, [field]: 'x'.repeat(max + 1) }))).toEqual({
        ok: false,
        fields: { [field]: `Keep this to ${max.toLocaleString('en-IN')} characters or fewer.` },
      });
    }
  });

  it('reads stock and shop order as whole numbers from 0 to 1,00,000, leaving them out when empty', () => {
    const r = toProductInput(form({ ...VALID, stock: '4', displayOrder: '10' }));
    expect(r.ok && [r.input.stock, r.input.displayOrder]).toEqual([4, 10]);
    const empty = toProductInput(form({ ...VALID, stock: '', displayOrder: '' }));
    expect(empty.ok && ['stock' in empty.input, 'displayOrder' in empty.input]).toEqual([false, false]);
    for (const bad of ['1.5', '-1', '100001', 'ten']) {
      expect(toProductInput(form({ ...VALID, stock: bad }))).toEqual({ ok: false, fields: { stock: PRODUCT_MESSAGES.wholeNumber } });
    }
  });

  it('uses the chosen category, new_ac by default, and refuses one PYS would not take', () => {
    const r = toProductInput(form({ ...VALID, category: '' }));
    expect(r.ok && r.input.category).toBe('new_ac');
    expect(toProductInput(form({ ...VALID, category: 'New AC' }))).toEqual({ ok: false, fields: { category: PRODUCT_MESSAGES.category } });
  });

  it('sends a chosen site photo as a full address PYS accepts, and "Drawn AC (no photo)" as null', () => {
    const r = toProductInput(form({ ...VALID, photo: 'voltas-185v.jpg' }));
    expect(r.ok && r.input.imageUrl).toBe(`${PHOTO_ORIGIN}/images/products/voltas-185v.jpg`);
    const drawn = toProductInput(form({ ...VALID, photo: '' }));
    expect(drawn.ok && drawn.input.imageUrl).toBeNull();
    for (const bad of ['../secret.jpg', 'a/b.jpg', 'x.svg', 'https://evil.test/a.jpg']) {
      expect(toProductInput(form({ ...VALID, photo: bad }))).toEqual({ ok: false, fields: { photo: PRODUCT_MESSAGES.photo } });
    }
  });

  it('reads "Show on the website" from the checkbox', () => {
    const shown = toProductInput(form({ ...VALID, shown: 'on' }));
    expect(shown.ok && shown.input.isPublished).toBe(true);
    const hidden = toProductInput(form({ ...VALID }));
    expect(hidden.ok && hidden.input.isPublished).toBe(false);
  });

  it('sends only keys PYS knows (its schema is strict)', () => {
    const r = toProductInput(form({ ...VALID, id: 'daikin-x1', shown: 'on', stock: '2', displayOrder: '5', photo: 'lg-ts-q14ynxe.jpg', extra: 'nope' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const known = [
      'id', 'name', 'category', 'brand', 'modelNumber', 'tonnage', 'starRating', 'price', 'mrp', 'stock', 'isCustomQuote', 'description',
      'coolingCapacity', 'powerConsumption', 'refrigerant', 'noiseLevel', 'dimensions', 'warranty', 'keyFeatures', 'imageUrl', 'spaceType',
      'idealFor', 'countryOfOrigin', 'isPublished', 'displayOrder',
    ];
    for (const k of Object.keys(r.input)) expect(known).toContain(k);
  });
});

describe('product photos (site files ↔ the address PYS stores)', () => {
  it('accepts plain photo file names only', () => {
    expect(isPhotoFile('voltas-185v.jpg')).toBe(true);
    expect(isPhotoFile('LG_TS.Q14.webp')).toBe(true);
    for (const bad of ['', '../a.jpg', 'a/b.jpg', 'a\\b.jpg', 'a..jpg', 'a.gif', 'a.svg', '.jpg', 'a.jpg?x=1', 'A.JPG']) expect(isPhotoFile(bad)).toBe(false);
  });

  it('turns a file into the full address and back', () => {
    expect(photoUrlForPys('voltas-185v.jpg')).toBe(`${PHOTO_ORIGIN}/images/products/voltas-185v.jpg`);
    expect(photoUrlForPys('')).toBeNull();
    expect(photoFileOf(`${PHOTO_ORIGIN}/images/products/voltas-185v.jpg`)).toBe('voltas-185v.jpg');
    expect(photoFileOf('/images/products/voltas-185v.jpg')).toBe('voltas-185v.jpg');
    expect(photoFileOf('https://images.unsplash.com/photo-1')).toBeNull();
    expect(photoFileOf('https://evil.test/images/products/voltas-185v.jpg')).toBeNull();
    expect(photoFileOf(`${PHOTO_ORIGIN}/images/products/../secret.jpg`)).toBeNull();
    expect(photoFileOf(null)).toBeNull();
  });

  it('gives the public pages the site path for this site\'s photos and leaves other addresses as they are', () => {
    expect(photoPathFromPys(`${PHOTO_ORIGIN}/images/products/voltas-185v.jpg`)).toBe('/images/products/voltas-185v.jpg');
    expect(photoPathFromPys('http://localhost:3000/images/products/voltas-185v.jpg', ['http://localhost:3000'])).toBe('/images/products/voltas-185v.jpg');
    expect(photoPathFromPys('https://images.unsplash.com/photo-1')).toBe('https://images.unsplash.com/photo-1');
    expect(photoPathFromPys('https://evil.test/images/products/voltas-185v.jpg')).toBe('https://evil.test/images/products/voltas-185v.jpg');
    expect(photoPathFromPys(null)).toBeNull();
  });
});

describe('form values and the preview card', () => {
  it('fills the form from a product', () => {
    const v = formValuesOf(product());
    expect(v).toMatchObject({
      name: 'Daikin 1.5 Ton 5 Star Inverter Split AC',
      price: '45990',
      mrp: '58400',
      keyFeatures: 'Copper condenser\nWi-Fi control',
      photo: 'daikin-ftkm71u.jpg',
      shown: true,
      stock: '4',
      brand: 'Daikin',
      noiseLevel: '',
    });
    expect(formValuesOf(product({ imageUrl: 'https://images.unsplash.com/photo-1' })).photo).toBe('');
  });

  it('round-trips: a product\'s own values are accepted again unchanged', () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(formValuesOf(product()))) {
      if (typeof v === 'boolean') {
        if (v) fd.set(k, 'on');
      } else fd.set(k, v);
    }
    const r = toProductInput(fd, 'update');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input).toMatchObject({ price: 45990, mrp: 58400, imageUrl: product().imageUrl, isPublished: true, keyFeatures: ['Copper condenser', 'Wi-Fi control'] });
  });

  it('builds a shop product from what is typed, for the preview card', () => {
    const p = previewProduct({ ...formValuesOf(product()), name: 'Typed name', price: '40,000', photo: '' }, product());
    expect(p).toMatchObject({ id: 'daikin-ftkm50-1a2b3c', name: 'Typed name', price: 40000, mrp: 58400, imageUrl: null, inStock: true });
    expect(p.seller.name).toBe('Extreme Sales & Services');
    const fresh = previewProduct({ ...formValuesOf(product()), name: '', price: 'abc', stock: '0', photo: 'voltas-185v.jpg' }, null);
    expect(fresh).toMatchObject({ name: 'New AC', price: null, inStock: false, imageUrl: '/images/products/voltas-185v.jpg' });
  });
});

describe('product list filters (kept in the address: ?q=&show=)', () => {
  const list = [
    product({ id: 'a', name: 'Daikin Split', brand: 'Daikin', isPublished: true }),
    product({ id: 'b', name: 'Voltas Window', brand: 'Voltas', modelNumber: '185V', isPublished: false }),
    product({ id: 'c', name: 'Blue Star Tower', brand: 'Blue Star', isPublished: true }),
  ];

  it('reads the search and shown/hidden filter, ignoring unknown values', () => {
    expect(productsQuery({})).toEqual({ q: '', show: 'all' });
    expect(productsQuery({ q: '  voltas ', show: 'hidden' })).toEqual({ q: 'voltas', show: 'hidden' });
    expect(productsQuery({ q: ['a', 'b'], show: 'everything' })).toEqual({ q: 'a', show: 'all' });
    expect(productsQuery({ q: 'x'.repeat(150) }).q).toHaveLength(100);
  });

  it('builds the list address', () => {
    expect(productsHref({ q: '', show: 'all' })).toBe('/admin/products');
    expect(productsHref({ q: 'blue star', show: 'shown' })).toBe('/admin/products?q=blue+star&show=shown');
  });

  it('filters by name, brand, model or id, and by shown/hidden', () => {
    expect(filterAdminProducts(list, { q: 'voltas', show: 'all' }).map((p) => p.id)).toEqual(['b']);
    expect(filterAdminProducts(list, { q: '185v', show: 'all' }).map((p) => p.id)).toEqual(['b']);
    expect(filterAdminProducts(list, { q: '', show: 'hidden' }).map((p) => p.id)).toEqual(['b']);
    expect(filterAdminProducts(list, { q: '', show: 'shown' }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(filterAdminProducts(list, { q: 'BLUE', show: 'hidden' })).toEqual([]);
  });
});

describe('createProduct', () => {
  it('checks the form again on the server and asks PYS nothing when it is wrong', async () => {
    const r = await createProduct({}, form({ ...VALID, price: '60,000', mrp: '58,400' }));
    expect(r).toEqual({ fields: { price: "Price can't be more than the MRP." } });
    expect(adminRequest).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('adds the product in PYS, refreshes the shop, then opens the new product (redirect outside the try)', async () => {
    adminRequest.mockResolvedValueOnce(product({ id: 'daikin-1-5-ton-ab12cd' }));
    await expect(createProduct({}, form({ ...VALID, shown: 'on' }))).rejects.toMatchObject({ url: '/admin/products/daikin-1-5-ton-ab12cd?added=1' });
    expect(adminRequest).toHaveBeenCalledTimes(1);
    const [method, path, body] = adminRequest.mock.calls[0];
    expect([method, path]).toEqual(['POST', '/products']);
    expect(body).toMatchObject({ name: VALID.name, price: 45990, mrp: 58400, isPublished: true, category: 'residential' });
    expect(updateTag).toHaveBeenCalledWith('products');
  });

  it('says so on the id field when the id is already used (PYS 409)', async () => {
    adminRequest.mockRejectedValueOnce(new PysError(409, 'CONFLICT', 'Could not add the product: it already exists'));
    const r = await createProduct({}, form({ ...VALID, id: 'daikin-x1' }));
    expect(r).toEqual({ fields: { id: 'This product ID is already used. Choose another, or leave it empty.' } });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('puts PYS field errors (422) on the matching form fields, in plain words', async () => {
    adminRequest.mockRejectedValueOnce(
      new AdminValidationError({ price: 'Selling price cannot be above the MRP', 'keyFeatures.2': 'Too big', imageUrl: 'Invalid URL', isPublished: 'Expected boolean' }),
    );
    const r = await createProduct({}, form(VALID));
    expect(r.fields).toEqual({
      price: "Price can't be more than the MRP.",
      keyFeatures: PRODUCT_MESSAGES.checkThis,
      photo: PRODUCT_MESSAGES.checkThis,
      shown: PRODUCT_MESSAGES.checkThis,
    });
    adminRequest.mockRejectedValueOnce(new AdminValidationError({ '': "Unrecognized key(s) in object: 'x'" }));
    expect(await createProduct({}, form(VALID))).toEqual({ error: PRODUCT_MESSAGES.notSaved });
  });

  it('returns { authError } / { forbidden } instead of redirecting (R7)', async () => {
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await createProduct({}, form(VALID))).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await createProduct({}, form(VALID))).toEqual({ forbidden: true });
  });

  it('says PYS could not be reached, logging only the status and code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    adminRequest.mockRejectedValueOnce(new PysError(503, 'PYS_UNREACHABLE', 'secret detail'));
    expect(await createProduct({}, form(VALID))).toEqual({ error: "We couldn't reach PYS. It may be waking up — try again in a minute." });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret detail');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Daikin');
    log.mockRestore();
  });
});

describe('updateProduct', () => {
  it('saves the changes (without the id) and refreshes the shop', async () => {
    adminRequest.mockResolvedValueOnce(product());
    const r = await updateProduct('daikin-ftkm50-1a2b3c', {}, form({ ...VALID, id: 'ignored', shown: 'on' }));
    expect(r).toEqual({ ok: true });
    const [method, path, body] = adminRequest.mock.calls[0];
    expect([method, path]).toEqual(['PATCH', '/products/daikin-ftkm50-1a2b3c']);
    expect(body).not.toHaveProperty('id');
    expect(body).toMatchObject({ name: VALID.name, isPublished: true });
    expect(updateTag).toHaveBeenCalledWith('products');
  });

  it('keeps an odd id inside its part of the PYS path, and refuses a missing one', async () => {
    adminRequest.mockResolvedValue(product());
    await updateProduct('a/../b?c', {}, form(VALID));
    expect(adminRequest.mock.calls[0][1]).toBe('/products/a%2F..%2Fb%3Fc');
    adminRequest.mockClear();
    expect((await updateProduct('', {}, form(VALID))).error).toBe(PRODUCT_MESSAGES.gone);
    expect((await updateProduct('x'.repeat(101), {}, form(VALID))).error).toBe(PRODUCT_MESSAGES.gone);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('says the product is gone when PYS does not know it (404)', async () => {
    adminRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'Product not found'));
    expect(await updateProduct('nope', {}, form(VALID))).toEqual({ notFound: true, error: PRODUCT_MESSAGES.gone });
  });

  it('sends PYS only what changed from the details the form started with', async () => {
    adminRequest.mockResolvedValue(product());
    const loaded = formValuesOf(product({ isPublished: false, imageUrl: 'https://cdn.example.com/stock.jpg' }));
    expect(await updateProduct('daikin-ftkm50-1a2b3c', {}, formDataOf({ ...loaded, price: '44,990' }), loaded)).toEqual({ ok: true });
    // The price and MRP go together, so PYS still checks one against the other. "Shown" and the
    // photo (another website's image, shown as the drawn AC here) were not touched, so they stay.
    expect(adminRequest).toHaveBeenCalledWith('PATCH', '/products/daikin-ftkm50-1a2b3c', { price: 44990, mrp: 58400 });
  });

  it('sends nothing when nothing changed, and the whole form when the starting details are unusable', async () => {
    adminRequest.mockResolvedValue(product());
    const loaded = formValuesOf(product());
    expect(await updateProduct('daikin-ftkm50-1a2b3c', {}, formDataOf(loaded), loaded)).toEqual({ ok: true });
    expect(adminRequest).not.toHaveBeenCalled();
    await updateProduct('daikin-ftkm50-1a2b3c', {}, form({ ...VALID, shown: 'on' }), { name: 42 });
    expect(adminRequest.mock.calls[0][2]).toMatchObject({ name: VALID.name, price: 45990, isPublished: true });
  });

  it('refuses a price above the MRP without asking PYS', async () => {
    const r = await updateProduct('a', {}, form({ ...VALID, price: '99,999', mrp: '50,000' }));
    expect(r).toEqual({ fields: { price: "Price can't be more than the MRP." } });
    expect(adminRequest).not.toHaveBeenCalled();
  });
});

describe('setShown', () => {
  it('shows or hides one product in PYS and refreshes the shop', async () => {
    adminRequest.mockResolvedValue(product());
    expect(await setShown('daikin-ftkm50-1a2b3c', false)).toEqual({ ok: true });
    expect(adminRequest).toHaveBeenCalledWith('PATCH', '/products/daikin-ftkm50-1a2b3c', { isPublished: false });
    await setShown('daikin-ftkm50-1a2b3c', true);
    expect(adminRequest).toHaveBeenLastCalledWith('PATCH', '/products/daikin-ftkm50-1a2b3c', { isPublished: true });
    expect(updateTag).toHaveBeenCalledWith('products');
  });

  it('refuses anything but true or false, and a bad id, without asking PYS', async () => {
    expect((await setShown('a', 'yes' as unknown as boolean)).error).toBeTruthy();
    expect((await setShown('', true)).error).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('passes on an ended session, no access, and a removed product', async () => {
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await setShown('a', true)).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await setShown('a', true)).toEqual({ forbidden: true });
    adminRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'Product not found'));
    expect(await setShown('a', true)).toEqual({ notFound: true, error: PRODUCT_MESSAGES.gone });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
