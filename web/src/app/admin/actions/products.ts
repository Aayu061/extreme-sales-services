'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { PRODUCT_MESSAGES, asFormValues, changedInput, editHref, formDataOf, pysFieldsToForm, toProductInput, type ProductFieldErrors } from '@/lib/admin/product-form';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest } from '@/lib/admin/pys-admin';
import type { AdminProduct } from '@/lib/admin/types';
import { PysError } from '@/lib/pys/client';

/**
 * Products: add, edit, show or hide ESS's ACs. PYS checks the person's role and the values itself;
 * these actions check the form again with toProductInput (never trusting the browser), send PYS
 * only what it produced, and turn PYS answers into plain words. Each change refreshes the shop's
 * cached product list (tag "products", the same tag lib/data.ts reads with).
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }) for
 * the screen to act on. The only redirect (to the new product after adding) is outside any try.
 */

export interface ProductActionState {
  ok?: true;
  error?: string;
  fields?: ProductFieldErrors;
  authError?: true;
  forbidden?: true;
  /** PYS no longer has this product (404). */
  notFound?: true;
}

const LIST = '/admin/products';

/** productIdParamSchema: 1–100 characters after trimming, kept inside its own part of the path. */
function productPath(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const clean = id.trim();
  return clean.length >= 1 && clean.length <= 100 ? `/products/${encodeURIComponent(clean)}` : null;
}

function refresh() {
  // Public shop pages: expired at once (R8), so the next visitor already sees the change.
  updateTag('products');
  // Admin pages are rendered per request; this sends fresh ones back with the action's answer.
  revalidatePath(LIST, 'layout');
}

/** A PYS failure as the answer the screen shows. Logs status and code only. */
function failure(err: unknown, what: 'add' | 'update'): ProductActionState {
  unstable_rethrow(err);
  if (err instanceof AdminAuthError) return { authError: true };
  if (err instanceof AdminForbiddenError) return { forbidden: true };
  if (err instanceof AdminValidationError) {
    const fields = pysFieldsToForm(err.fields);
    return fields ? { fields } : { error: PRODUCT_MESSAGES.notSaved };
  }
  if (err instanceof PysError) {
    if (err.status === 409 && what === 'add') return { fields: { id: PRODUCT_MESSAGES.idTaken } };
    if (err.status === 404) {
      revalidatePath(LIST, 'layout');
      return { notFound: true, error: PRODUCT_MESSAGES.gone };
    }
    if (err.status === 400 || err.status === 409) return { error: PRODUCT_MESSAGES.notSaved };
  }
  console.error(`Product ${what} in PYS failed`, err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
  return { error: PRODUCT_MESSAGES.unreachable };
}

/** "Add product". On success, opens the new product's edit page (with "Product added."). */
export async function createProduct(_prev: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const checked = toProductInput(formData, 'create');
  if (!checked.ok) return { fields: checked.fields };

  let created: AdminProduct;
  try {
    created = await adminRequest<AdminProduct>('POST', '/products', checked.input);
  } catch (err) {
    return failure(err, 'add');
  }
  refresh();
  redirect(`${editHref(created.id)}?added=1`);
}

/**
 * "Save changes" on a product's page. `loaded` is what the form started from (the browser sends it
 * back): when it has the form's shape, PYS gets only the details that differ from it (PYS PATCH
 * takes any part of a product), so a save never undoes a change made meanwhile to an untouched
 * detail. Without it, the whole form is sent. Nothing changed: nothing is sent.
 */
export async function updateProduct(id: string, _prev: ProductActionState, formData: FormData, loaded?: unknown): Promise<ProductActionState> {
  const path = productPath(id);
  if (!path) return { error: PRODUCT_MESSAGES.gone };
  const checked = toProductInput(formData, 'update');
  if (!checked.ok) return { fields: checked.fields };

  const start = asFormValues(loaded);
  const before = start ? toProductInput(formDataOf(start), 'update') : null;
  const body = before?.ok ? changedInput(checked.input, before.input) : checked.input;
  if (Object.keys(body).length === 0) return { ok: true };

  try {
    await adminRequest<AdminProduct>('PATCH', path, body);
  } catch (err) {
    return failure(err, 'update');
  }
  refresh();
  return { ok: true };
}

/** Show or hide one product on the website (PYS isPublished), from the list. */
export async function setShown(id: string, shown: boolean): Promise<ProductActionState> {
  const path = productPath(id);
  if (!path) return { error: PRODUCT_MESSAGES.gone };
  if (typeof shown !== 'boolean') return { error: PRODUCT_MESSAGES.chooseShown };

  try {
    await adminRequest<AdminProduct>('PATCH', path, { isPublished: shown });
  } catch (err) {
    return failure(err, 'update');
  }
  refresh();
  return { ok: true };
}
