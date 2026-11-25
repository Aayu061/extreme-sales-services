/**
 * The product form (client-safe): what staff type, checked the way PYS checks it
 * (productInputSchema / productPatchSchema in server/src/validators/ess.validator.ts), turned into
 * the body PYS takes. The browser checks first for quick messages; the server action checks again
 * and only ever sends PYS what this file produced.
 *
 * PYS rules mirrored here:
 *   - id: optional; lowercase letters, digits and "-", 2–81 characters; empty → PYS makes one from
 *     the name ("<name-slug>-<6 hex>"). Never sent when editing (it is in the address).
 *   - name: 2–200 characters. category: /^[a-z_]{2,40}$/, "new_ac" when empty.
 *   - texts: trimmed, empty → null (PYS clears the field), at most PYS's length per field.
 *   - price and MRP: rupees incl. GST (a number), up to ₹1,00,00,000; empty → null (price on
 *     request); price ≤ MRP when both are given.
 *   - stock and shop order: whole numbers 0–1,00,000; empty → left out (unchanged / PYS default).
 *   - key features: one per line, at most 200 characters each. PYS takes up to 20; the site keeps
 *     to 8 (the shop page shows a short list).
 *   - photo: a file from public/images/products (sent as a full address) or an uploaded photo address (lib/product-photo.ts).
 * Tonnage and star rating are free text in PYS (20 characters); the form writes the common forms
 * the shop reads ("1.5 TR", "3 Star") and keeps anything else as typed (e.g. "10,000 CFM").
 */
import { PRICE_MESSAGES, parseRupees, priceError } from './money';
import type { AdminProduct } from './types';
import type { Product } from '@/lib/pys/types';
import { isPhotoChoice, photoChoiceOf, photoSrc, photoUrlForPys } from '@/lib/product-photo';

export interface ProductFormValues {
  id: string;
  name: string;
  category: string;
  brand: string;
  modelNumber: string;
  tonnage: string;
  starRating: string;
  price: string;
  mrp: string;
  stock: string;
  displayOrder: string;
  description: string;
  keyFeatures: string;
  warranty: string;
  coolingCapacity: string;
  powerConsumption: string;
  refrigerant: string;
  noiseLevel: string;
  dimensions: string;
  countryOfOrigin: string;
  /** A file in public/images/products, or "" for the drawn AC. */
  photo: string;
  /** "Show on the website" (PYS isPublished). */
  shown: boolean;
}

export type ProductField = keyof ProductFormValues;
export type ProductFieldErrors = Partial<Record<ProductField, string>>;

/** The body PYS takes (POST /products; PATCH /products/:id without `id`). */
export interface ProductInput {
  id?: string;
  name: string;
  category: string;
  brand: string | null;
  modelNumber: string | null;
  tonnage: string | null;
  starRating: string | null;
  price: number | null;
  mrp: number | null;
  stock?: number;
  displayOrder?: number;
  description: string | null;
  keyFeatures: string[];
  warranty: string | null;
  coolingCapacity: string | null;
  powerConsumption: string | null;
  refrigerant: string | null;
  noiseLevel: string | null;
  dimensions: string | null;
  countryOfOrigin: string | null;
  imageUrl: string | null;
  isPublished: boolean;
}

export const MAX_FEATURES = 8;
export const FEATURE_MAX = 200;
const MAX_COUNT = 100_000;

/** PYS's length limit for each free-text field. */
export const TEXT_LIMITS = {
  brand: 60,
  modelNumber: 80,
  tonnage: 20,
  starRating: 20,
  description: 4000,
  warranty: 200,
  coolingCapacity: 60,
  powerConsumption: 60,
  refrigerant: 40,
  noiseLevel: 40,
  dimensions: 120,
  countryOfOrigin: 80,
} as const;
type TextField = keyof typeof TEXT_LIMITS;

export const PRODUCT_MESSAGES = {
  name: "Enter the AC's name (at least 2 characters).",
  nameTooLong: 'Keep the name to 200 characters or fewer.',
  id: 'Use lowercase letters, numbers and dashes only (2 to 81 characters), or leave it empty.',
  idTaken: 'This product ID is already used. Choose another, or leave it empty.',
  category: 'Choose a category.',
  price: 'Enter the price in rupees, e.g. 45,990, or leave it empty for "Price on request".',
  priceTooHigh: 'The price can be at most ₹1,00,00,000.',
  mrp: 'Enter the MRP in rupees, e.g. 58,400, or leave it empty.',
  mrpTooHigh: 'The MRP can be at most ₹1,00,00,000.',
  priceAboveMrp: "Price can't be more than the MRP.",
  wholeNumber: 'Enter a whole number from 0 to 1,00,000.',
  tooManyFeatures: `Add up to ${MAX_FEATURES} key features, one per line.`,
  featureTooLong: `Keep each key feature to ${FEATURE_MAX} characters or fewer.`,
  photo: 'Choose one of the photos, or the drawn AC.',
  checkThis: 'Please check this.',
  checkFields: 'Please check the highlighted details.',
  notSaved: 'PYS could not save these details. Please check them and try again.',
  gone: "We couldn't find this product any more. It may have been removed.",
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
  chooseShown: 'Choose show or hide.',
  added: 'Product added.',
  saved: 'Changes saved.',
  changedElsewhere: 'This product was changed since you opened it. The form now shows the latest details; please make your changes again.',
} as const;

export const tooLong = (max: number) => `Keep this to ${max.toLocaleString('en-IN')} characters or fewer.`;

/** Categories PYS knows for ESS's ACs (any /^[a-z_]{2,40}$/ value is accepted). */
export const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'residential', label: 'Homes' },
  { value: 'commercial', label: 'Shops and offices' },
  { value: 'industrial', label: 'Large buildings and projects' },
  { value: 'new_ac', label: 'Other new AC' },
];
const CATEGORY = /^[a-z_]{2,40}$/;
const PRODUCT_ID = /^[a-z0-9][a-z0-9-]{1,80}$/;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  id: '',
  name: '',
  category: 'residential',
  brand: '',
  modelNumber: '',
  tonnage: '',
  starRating: '',
  price: '',
  mrp: '',
  stock: '',
  displayOrder: '',
  description: '',
  keyFeatures: '',
  warranty: '',
  coolingCapacity: '',
  powerConsumption: '',
  refrigerant: '',
  noiseLevel: '',
  dimensions: '',
  countryOfOrigin: '',
  photo: '',
  shown: true,
};

/** "1.5", "1.5 ton", "2 Tons", "1.5tr" → "1.5 TR"; anything else (e.g. "10,000 CFM") as typed. */
export function normaliseTonnage(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const m = /^(\d+(?:\.\d+)?)\s*(?:tr|tons?)?\.?$/i.exec(v);
  return m ? `${m[1]} TR` : v;
}

/** "3", "3 star", "5-star", "3★" → "3 Star"; anything else (e.g. "Commercial Grade") as typed. */
export function normaliseStar(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const m = /^([1-5])\s*(?:-?\s*stars?|★)?$/i.exec(v);
  return m ? `${m[1]} Star` : v;
}

/** One per line, trimmed, blank lines dropped. */
export function featureLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const read = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

/** A rupee amount, or null when empty. `bad` is set when it is typed but not an amount PYS takes. */
function money(typed: string, messages: { invalid: string; tooHigh: string }): { value: number | null; error?: string } {
  if (!typed.trim()) return { value: null };
  const value = parseRupees(typed);
  if (value !== null) return { value };
  return { value: null, error: priceError(typed) === PRICE_MESSAGES.tooHigh ? messages.tooHigh : messages.invalid };
}

function count(typed: string): { value?: number; error?: string } {
  const t = typed.trim();
  if (!t) return {};
  if (!/^\d+$/.test(t) || Number(t) > MAX_COUNT) return { error: PRODUCT_MESSAGES.wholeNumber };
  return { value: Number(t) };
}

/**
 * The form as PYS's product body, or one message per field. `mode` "update" leaves the id out
 * (PATCH takes everything but the id).
 */
export function toProductInput(form: FormData, mode: 'create' | 'update' = 'create'): { ok: true; input: ProductInput } | { ok: false; fields: ProductFieldErrors } {
  const fields: ProductFieldErrors = {};

  const name = read(form, 'name').trim();
  if (name.length < 2) fields.name = PRODUCT_MESSAGES.name;
  else if (name.length > 200) fields.name = PRODUCT_MESSAGES.nameTooLong;

  const id = read(form, 'id').trim();
  if (mode === 'create' && id && !PRODUCT_ID.test(id)) fields.id = PRODUCT_MESSAGES.id;

  const category = read(form, 'category').trim() || 'new_ac';
  if (!CATEGORY.test(category)) fields.category = PRODUCT_MESSAGES.category;

  const texts = {} as Record<TextField, string | null>;
  for (const key of Object.keys(TEXT_LIMITS) as TextField[]) {
    const raw = read(form, key).trim();
    const value = key === 'tonnage' ? normaliseTonnage(raw) : key === 'starRating' ? normaliseStar(raw) : raw || null;
    if (value !== null && value.length > TEXT_LIMITS[key]) fields[key] = tooLong(TEXT_LIMITS[key]);
    texts[key] = value;
  }

  const price = money(read(form, 'price'), { invalid: PRODUCT_MESSAGES.price, tooHigh: PRODUCT_MESSAGES.priceTooHigh });
  const mrp = money(read(form, 'mrp'), { invalid: PRODUCT_MESSAGES.mrp, tooHigh: PRODUCT_MESSAGES.mrpTooHigh });
  if (price.error) fields.price = price.error;
  if (mrp.error) fields.mrp = mrp.error;
  if (!price.error && !mrp.error && price.value !== null && mrp.value !== null && price.value > mrp.value) {
    fields.price = PRODUCT_MESSAGES.priceAboveMrp;
  }

  const stock = count(read(form, 'stock'));
  const displayOrder = count(read(form, 'displayOrder'));
  if (stock.error) fields.stock = stock.error;
  if (displayOrder.error) fields.displayOrder = displayOrder.error;

  const keyFeatures = featureLines(read(form, 'keyFeatures'));
  if (keyFeatures.length > MAX_FEATURES) fields.keyFeatures = PRODUCT_MESSAGES.tooManyFeatures;
  else if (keyFeatures.some((f) => f.length > FEATURE_MAX)) fields.keyFeatures = PRODUCT_MESSAGES.featureTooLong;

  const photo = read(form, 'photo').trim();
  if (photo && !isPhotoChoice(photo)) fields.photo = PRODUCT_MESSAGES.photo;

  if (Object.keys(fields).length) return { ok: false, fields };

  const shown = read(form, 'shown');
  const input: ProductInput = {
    ...(mode === 'create' && id ? { id } : {}),
    name,
    category,
    ...texts,
    price: price.value,
    mrp: mrp.value,
    ...(stock.value !== undefined ? { stock: stock.value } : {}),
    ...(displayOrder.value !== undefined ? { displayOrder: displayOrder.value } : {}),
    keyFeatures,
    imageUrl: photo ? photoUrlForPys(photo) : null,
    isPublished: shown === 'on' || shown === 'true',
  };
  return { ok: true, input };
}

/** The form's values as the browser would post them ("shown" is "on" when ticked, absent when not). */
export function formDataOf(values: ProductFormValues): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (key === 'shown') {
      if (value === true) fd.set('shown', 'on');
    } else if (typeof value === 'string') fd.set(key, value);
  }
  return fd;
}

/** The starting values sent back by the browser, if they have the form's shape; anything else is null. */
export function asFormValues(raw: unknown): ProductFormValues | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_PRODUCT_FORM) as ProductField[]) {
    if (key === 'shown' ? typeof r[key] !== 'boolean' : typeof r[key] !== 'string') return null;
  }
  return r as unknown as ProductFormValues;
}

/**
 * Only the parts of `next` that differ from `loaded` (both checked by toProductInput), so a save
 * never sends back details the person did not touch (e.g. "shown", changed meanwhile from the list,
 * or a photo the form cannot show). Price and MRP go together, so PYS still checks one against the other.
 */
export function changedInput(next: ProductInput, loaded: ProductInput): Partial<ProductInput> {
  const out: Record<string, unknown> = {};
  const same = (key: keyof ProductInput) => JSON.stringify(next[key] ?? null) === JSON.stringify(loaded[key] ?? null);
  for (const key of Object.keys(next) as (keyof ProductInput)[]) {
    if (!same(key)) out[key] = next[key];
  }
  if ('price' in out || 'mrp' in out) {
    out.price = next.price;
    out.mrp = next.mrp;
  }
  return out as Partial<ProductInput>;
}

/** PYS field names (422 details) → the form field that shows the message. */
const PYS_FIELD: Record<string, ProductField> = {
  id: 'id',
  name: 'name',
  category: 'category',
  brand: 'brand',
  modelNumber: 'modelNumber',
  tonnage: 'tonnage',
  starRating: 'starRating',
  price: 'price',
  mrp: 'mrp',
  stock: 'stock',
  displayOrder: 'displayOrder',
  description: 'description',
  keyFeatures: 'keyFeatures',
  warranty: 'warranty',
  coolingCapacity: 'coolingCapacity',
  powerConsumption: 'powerConsumption',
  refrigerant: 'refrigerant',
  noiseLevel: 'noiseLevel',
  dimensions: 'dimensions',
  countryOfOrigin: 'countryOfOrigin',
  imageUrl: 'photo',
  isPublished: 'shown',
};

/**
 * PYS's 422 messages are developer text, so each field gets plain words instead (the price above
 * the MRP keeps its own message). Fields the form does not have come back as null.
 */
export function pysFieldsToForm(pys: Record<string, string>): ProductFieldErrors | null {
  const out: ProductFieldErrors = {};
  for (const [path, message] of Object.entries(pys)) {
    const field = PYS_FIELD[path.split('.')[0]];
    if (!field) return null;
    out[field] ??= field === 'price' && /above the MRP/i.test(message) ? PRODUCT_MESSAGES.priceAboveMrp : PRODUCT_MESSAGES.checkThis;
  }
  return Object.keys(out).length ? out : null;
}

const text = (v: string | null | undefined) => v ?? '';
const amount = (v: number | null) => (v === null ? '' : String(v));

/** A product as the form shows it. A stock photo or another website's image shows as the drawn AC. */
export function formValuesOf(p: AdminProduct): ProductFormValues {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    brand: text(p.brand),
    modelNumber: text(p.modelNumber),
    tonnage: text(p.tonnage),
    starRating: text(p.starRating),
    price: amount(p.price),
    mrp: amount(p.mrp),
    stock: String(p.stock),
    displayOrder: String(p.displayOrder),
    description: text(p.description),
    keyFeatures: p.keyFeatures.join('\n'),
    warranty: text(p.warranty),
    coolingCapacity: text(p.coolingCapacity),
    powerConsumption: text(p.powerConsumption),
    refrigerant: text(p.refrigerant),
    noiseLevel: text(p.noiseLevel),
    dimensions: text(p.dimensions),
    countryOfOrigin: text(p.countryOfOrigin),
    photo: photoChoiceOf(p.imageUrl) ?? '',
    shown: p.isPublished,
  };
}

const ESS_SELLER: Product['seller'] = {
  code: 'ESS',
  name: 'Extreme Sales & Services',
  legalName: 'Extreme Sales & Services',
  gstin: null,
  address: null,
  phone: null,
  email: null,
  grievanceOfficer: { name: null, email: null, phone: null },
  returnPolicy: null,
  isFirstParty: true,
};

/** What the shop card would show for what is typed right now (lenient: half-typed values are skipped). */
export function previewProduct(v: ProductFormValues, base: AdminProduct | null | undefined): Product {
  const price = v.price.trim() ? parseRupees(v.price) : null;
  const mrp = v.mrp.trim() ? parseRupees(v.mrp) : null;
  const stock = v.stock.trim();
  const none = (s: string) => s.trim() || null;
  return {
    id: base?.id ?? (v.id.trim() || 'new'),
    name: v.name.trim() || 'New AC',
    category: v.category,
    brand: none(v.brand),
    modelNumber: none(v.modelNumber),
    tonnage: normaliseTonnage(v.tonnage),
    starRating: normaliseStar(v.starRating),
    price,
    mrp,
    inStock: stock ? /^\d+$/.test(stock) && Number(stock) > 0 : (base?.inStock ?? false),
    isCustomQuote: base?.isCustomQuote ?? false,
    description: none(v.description),
    specs: {
      coolingCapacity: none(v.coolingCapacity),
      powerConsumption: none(v.powerConsumption),
      refrigerant: none(v.refrigerant),
      noiseLevel: none(v.noiseLevel),
      dimensions: none(v.dimensions),
    },
    warranty: none(v.warranty),
    keyFeatures: featureLines(v.keyFeatures).slice(0, MAX_FEATURES),
    imageUrl: isPhotoChoice(v.photo) ? photoSrc(v.photo) : null,
    spaceType: base?.spaceType ?? null,
    idealFor: base?.idealFor ?? null,
    countryOfOrigin: none(v.countryOfOrigin),
    displayOrder: Number(v.displayOrder) || base?.displayOrder || 100,
    seller: base?.seller ?? ESS_SELLER,
  };
}

/* ------------------------------------------------------------- the list */

export type ShownFilter = 'all' | 'shown' | 'hidden';
export interface ProductsQuery {
  q: string;
  show: ShownFilter;
}
const SHOWN_FILTERS: readonly ShownFilter[] = ['all', 'shown', 'hidden'];
export const SHOWN_FILTER_LABEL: Record<ShownFilter, string> = { all: 'All products', shown: 'Shown', hidden: 'Hidden' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** ?q= (product search, at most 100 characters) and ?show=all|shown|hidden. */
export function productsQuery(params: Record<string, string | string[] | undefined>): ProductsQuery {
  const q = (first(params.q) ?? '').trim().slice(0, 100);
  const show = first(params.show);
  return { q, show: SHOWN_FILTERS.includes(show as ShownFilter) ? (show as ShownFilter) : 'all' };
}

export function productsHref(query: ProductsQuery): string {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.show !== 'all') p.set('show', query.show);
  const qs = p.toString();
  return qs ? `/admin/products?${qs}` : '/admin/products';
}

/** By name, brand, model number or id (any case), then shown/hidden. Keeps PYS's order. */
export function filterAdminProducts(list: readonly AdminProduct[], query: ProductsQuery): AdminProduct[] {
  const term = query.q.toLowerCase();
  return list.filter(
    (p) =>
      (query.show === 'all' || (query.show === 'shown') === p.isPublished) &&
      (!term || [p.name, p.brand ?? '', p.modelNumber ?? '', p.id].some((v) => v.toLowerCase().includes(term))),
  );
}

export function editHref(id: string): string {
  return `/admin/products/${encodeURIComponent(id)}`;
}
