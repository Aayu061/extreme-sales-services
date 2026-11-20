'use client';

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { unstable_rethrow, useRouter } from 'next/navigation';
import { createProduct, updateProduct, type ProductActionState } from '@/app/admin/actions/products';
import { ProductCard } from '@/components/shop/product-card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import {
  CATEGORY_OPTIONS,
  EMPTY_PRODUCT_FORM,
  MAX_FEATURES,
  PRODUCT_MESSAGES,
  TEXT_LIMITS,
  formValuesOf,
  previewProduct,
  toProductInput,
  type ProductField,
  type ProductFieldErrors,
  type ProductFormValues,
} from '@/lib/admin/product-form';
import type { AdminProduct } from '@/lib/admin/types';
import { PendingButton } from './pending-button';
import { PhotoPicker, usePhotoList } from './photo-picker';

type Props = { mode: 'create'; product?: undefined; added?: undefined } | { mode: 'edit'; product: AdminProduct; added?: boolean };

/** Fields in the order they appear, so the first one with a problem gets the focus. */
const FIELD_ORDER: readonly ProductField[] = [
  'name',
  'brand',
  'modelNumber',
  'id',
  'category',
  'tonnage',
  'starRating',
  'price',
  'mrp',
  'stock',
  'displayOrder',
  'description',
  'keyFeatures',
  'warranty',
  'coolingCapacity',
  'powerConsumption',
  'refrigerant',
  'noiseLevel',
  'dimensions',
  'countryOfOrigin',
  'photo',
  'shown',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="glass min-w-0 rounded-[24px] p-4 text-ink sm:p-5">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden="true" className="text-lg font-bold">
        {title}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Add or edit one AC. Everything typed is checked the way PYS checks it (toProductInput) before it
 * is sent, and again by the server action. The card on the right (below on phones) is the shop's
 * own product card, showing what is typed right now.
 */
export function ProductForm({ mode, product, added }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const shownHintId = `${useId()}-shown-hint`;
  const [values, setValues] = useState<ProductFormValues>(() => (product ? formValuesOf(product) : EMPTY_PRODUCT_FORM));
  const [checked, setChecked] = useState<ProductFieldErrors | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(added ? PRODUCT_MESSAGES.added : null);
  const { photos, failed } = usePhotoList();
  // A second submit while one is on its way is ignored: the button is disabled once React has
  // re-rendered, and this ref covers a click that lands before that.
  const inFlight = useRef(false);

  const [state, dispatch, pending] = useActionState(async (prev: ProductActionState, fd: FormData): Promise<ProductActionState> => {
    let result: ProductActionState;
    try {
      result = mode === 'create' ? await createProduct(prev, fd) : await updateProduct(product.id, prev, fd);
    } catch (err) {
      // "Add product" ends with a redirect to the new product: let Next carry it out.
      unstable_rethrow(err);
      result = { error: PRODUCT_MESSAGES.unreachable };
    } finally {
      inFlight.current = false;
    }
    if (result.authError) {
      setMessage(PRODUCT_MESSAGES.signIn);
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/admin/login?${new URLSearchParams({ expired: '1', next })}`);
    } else if (result.forbidden) {
      setMessage(PRODUCT_MESSAGES.forbidden);
      router.replace('/admin/no-access');
    } else if (result.ok) {
      setMessage(null);
      setNotice(PRODUCT_MESSAGES.saved);
      router.refresh();
    } else {
      setMessage(result.error ?? (result.fields ? PRODUCT_MESSAGES.checkFields : null));
      if (result.notFound) router.refresh();
    }
    return result;
  }, {});

  const errors: ProductFieldErrors = checked ?? state.fields ?? {};

  // After PYS refuses a field, move to the first one with a message.
  useEffect(() => {
    if (state.fields) focusFirst(state.fields);
  }, [state]);

  function focusFirst(fields: ProductFieldErrors) {
    const first = FIELD_ORDER.find((f) => fields[f]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || inFlight.current) return;
    const fd = new FormData(e.currentTarget);
    const result = toProductInput(fd, mode === 'create' ? 'create' : 'update');
    if (!result.ok) {
      setChecked(result.fields);
      setMessage(PRODUCT_MESSAGES.checkFields);
      setNotice(null);
      focusFirst(result.fields);
      return;
    }
    setChecked(null);
    setMessage(null);
    setNotice(null);
    inFlight.current = true;
    startTransition(() => dispatch(fd));
  }

  const set = (key: ProductField) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  function text(
    key: Exclude<ProductField, 'shown' | 'photo' | 'category'>,
    label: string,
    opts: { hint?: string; required?: boolean; maxLength?: number; inputMode?: 'decimal' | 'numeric'; tabular?: boolean } = {},
  ) {
    return (
      <Field label={label} hint={opts.hint} error={errors[key]} required={opts.required}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name={key}
            value={values[key]}
            onChange={set(key)}
            maxLength={opts.maxLength}
            inputMode={opts.inputMode}
            autoComplete="off"
            className={opts.tabular ? 'tabular-nums' : undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
    );
  }

  const categories = CATEGORY_OPTIONS.some((c) => c.value === values.category)
    ? CATEGORY_OPTIONS
    : [...CATEGORY_OPTIONS, { value: values.category, label: values.category }];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <form ref={formRef} onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-5">
        {notice && (
          <p role="status" className="rounded-2xl bg-cool/12 px-4 py-3 font-semibold text-cool">
            {notice}
          </p>
        )}

        <Section title="The AC">
          <div className="sm:col-span-2">{text('name', 'Name', { required: true, maxLength: 200, hint: 'As customers see it, e.g. Daikin 1.5 Ton 5 Star Inverter Split AC.' })}</div>
          {text('brand', 'Brand', { maxLength: TEXT_LIMITS.brand })}
          {text('modelNumber', 'Model number', { maxLength: TEXT_LIMITS.modelNumber })}
          {mode === 'create' &&
            text('id', 'Product ID', {
              maxLength: 81,
              hint: 'Used in the shop address. Leave it empty and PYS makes one from the name. Lowercase letters, numbers and dashes.',
            })}
          <Field label="Category" error={errors.category}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="category" value={values.category} onChange={set('category')} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {text('tonnage', 'Tonnage', { maxLength: TEXT_LIMITS.tonnage, hint: 'e.g. 1.5 TR' })}
          {text('starRating', 'Star rating', { maxLength: TEXT_LIMITS.starRating, hint: 'e.g. 3 Star' })}
        </Section>

        <Section title="Price and stock">
          {text('price', 'Price (incl. GST)', {
            inputMode: 'decimal',
            tabular: true,
            hint: 'For one AC, GST included, e.g. 45,990. Leave empty for "Price on request".',
          })}
          {text('mrp', 'MRP', { inputMode: 'decimal', tabular: true, hint: 'Optional. The price cannot be more than the MRP.' })}
          {text('stock', 'Units in stock', { inputMode: 'numeric', tabular: true, hint: '0 shows "Out of stock" in the shop.' })}
          {text('displayOrder', 'Order in the shop', { inputMode: 'numeric', tabular: true, hint: 'Lower numbers come first. Usually 100.' })}
        </Section>

        <Section title="Description">
          <p role="note" className="rounded-2xl border border-line bg-surface/85 px-4 py-3 text-sm text-ink sm:col-span-2">
            Everything here is shown on the website. Only write what is true about this AC: don&apos;t promise arrival times, don&apos;t call it
            &ldquo;genuine&rdquo; or &ldquo;OEM&rdquo;, don&apos;t mention &ldquo;certified&rdquo; or &ldquo;verified&rdquo; technicians, and don&apos;t add
            reviews.
          </p>
          <div className="sm:col-span-2">
            <Field label="Description" error={errors.description}>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  name="description"
                  rows={4}
                  maxLength={TEXT_LIMITS.description}
                  value={values.description}
                  onChange={set('description')}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Key features" hint={`One per line, up to ${MAX_FEATURES}.`} error={errors.keyFeatures}>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  name="keyFeatures"
                  rows={5}
                  value={values.keyFeatures}
                  onChange={set('keyFeatures')}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section title="Details">
          <div className="sm:col-span-2">{text('warranty', 'Warranty', { maxLength: TEXT_LIMITS.warranty })}</div>
          {text('coolingCapacity', 'Cooling capacity', { maxLength: TEXT_LIMITS.coolingCapacity })}
          {text('powerConsumption', 'Power use', { maxLength: TEXT_LIMITS.powerConsumption })}
          {text('refrigerant', 'Refrigerant', { maxLength: TEXT_LIMITS.refrigerant })}
          {text('noiseLevel', 'Noise', { maxLength: TEXT_LIMITS.noiseLevel })}
          {text('dimensions', 'Size', { maxLength: TEXT_LIMITS.dimensions })}
          {text('countryOfOrigin', 'Country of origin', { maxLength: TEXT_LIMITS.countryOfOrigin })}
        </Section>

        <div className="glass rounded-[24px] p-4 text-ink sm:p-5">
          <PhotoPicker photos={photos} failed={failed} value={values.photo} onChange={(photo) => setValues((v) => ({ ...v, photo }))} error={errors.photo} />
        </div>

        <div className="glass flex flex-col gap-4 rounded-[24px] p-4 text-ink sm:p-5">
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input
                type="checkbox"
                name="shown"
                checked={values.shown}
                onChange={(e) => setValues((v) => ({ ...v, shown: e.target.checked }))}
                aria-describedby={shownHintId}
                className="size-6 shrink-0 accent-[var(--cool)]"
              />
              Show on the website
            </label>
            <p id={shownHintId} className="pl-9 text-sm text-muted">
              A hidden AC stays in this list but is not in the shop.
            </p>
          </div>
          {message && (
            <p role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
              {message}
            </p>
          )}
          <PendingButton pending={pending} pendingLabel="Saving…" className="self-start">
            {mode === 'create' ? 'Add product' : 'Save changes'}
          </PendingButton>
        </div>
      </form>

      <section aria-label="Preview" className="flex flex-col gap-3 lg:sticky lg:top-6">
        <h2 className="text-lg font-bold text-ink">Preview</h2>
        <p className="text-sm text-muted">How this AC looks in the shop.</p>
        {/* The shop's own card, as it is; not clickable here. */}
        <div inert>
          <ProductCard product={previewProduct(values, product)} />
        </div>
      </section>
    </div>
  );
}
