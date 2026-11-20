'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { DISPLAY_MESSAGES, checkDisplayItems } from '@/lib/admin/display';
import { isEssAdmin } from '@/lib/admin/nav';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminCatalogDisplay } from '@/lib/admin/types';
import { PysError } from '@/lib/pys/client';

/**
 * "Services shown" (ESS Admin only): which services and AMC plans the website lists, and their
 * order. The person's role is checked first, so ESS Staff is refused before anything is sent to
 * PYS (PYS refuses them too). The rows are checked again here (never trusting the browser) and
 * only the clean rows are sent. Then the public pages' cached catalog (tag "catalog", the tag
 * lib/data.ts reads with) is expired at once (R8).
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }).
 */

export interface DisplayActionState {
  ok?: true;
  /** PYS's lists after the change. */
  display?: AdminCatalogDisplay;
  error?: string;
  authError?: true;
  forbidden?: true;
}

const PAGE = '/admin/display';

/** A PYS failure as the answer the screen shows. Logs status and code only. */
function failure(err: unknown): DisplayActionState {
  unstable_rethrow(err);
  if (err instanceof AdminAuthError) return { authError: true };
  if (err instanceof AdminForbiddenError) return { forbidden: true };
  // PYS checked the rows before changing any of them.
  if (err instanceof AdminValidationError) return { error: DISPLAY_MESSAGES.notSaved };
  // PYS changes the rows one by one: after a 404 (or a lost answer) the rows before it may be
  // saved, so the public catalog is refreshed anyway.
  updateTag('catalog');
  revalidatePath(PAGE);
  if (err instanceof PysError && err.status === 404) return { error: DISPLAY_MESSAGES.gone };
  if (err instanceof PysError && err.status === 400) return { error: DISPLAY_MESSAGES.notSaved };
  console.error('Catalog display update in PYS failed', err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
  return { error: DISPLAY_MESSAGES.unreachable };
}

/** "Save changes": `items` are only the rows whose shown flag or place changed. */
export async function saveDisplay(items: unknown): Promise<DisplayActionState> {
  try {
    if (!isEssAdmin((await getMe()).roles)) return { forbidden: true };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AdminAuthError) return { authError: true };
    if (err instanceof AdminForbiddenError) return { forbidden: true };
    return { error: DISPLAY_MESSAGES.unreachable };
  }
  const checked = checkDisplayItems(items);
  if (!checked.ok) return { error: DISPLAY_MESSAGES.invalid };

  let display: AdminCatalogDisplay;
  try {
    display = await adminRequest<AdminCatalogDisplay>('PATCH', '/catalog-display', { items: checked.items });
  } catch (err) {
    return failure(err);
  }
  // Public pages: expired at once (R8), so the next visitor already sees the change.
  updateTag('catalog');
  revalidatePath(PAGE);
  return { ok: true, display };
}
