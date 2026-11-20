'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { AREA_MESSAGES, checkArea, isPrefix, pysAreaFields, type AreaFieldErrors } from '@/lib/admin/areas';
import { isEssAdmin } from '@/lib/admin/nav';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminServiceArea } from '@/lib/admin/types';
import { PysError } from '@/lib/pys/client';

/**
 * "Pincodes" (ESS Admin only): add, change or remove a pincode prefix ESS covers. The person's
 * role is checked first, so ESS Staff is refused before anything is sent to PYS (PYS refuses them
 * too). The form is checked again here with checkArea (never trusting the browser) and only the
 * clean values are sent. Then the public pages' cached areas (tag "areas", the tag lib/data.ts
 * reads with) are expired at once (R8); the pincode check asks PYS on every check.
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }).
 */

export interface AreaActionState {
  ok?: true;
  /** PYS's prefixes after the change. */
  areas?: AdminServiceArea[];
  error?: string;
  fields?: AreaFieldErrors;
  authError?: true;
  forbidden?: true;
}

const PAGE = '/admin/areas';

/** A PYS failure as the answer the screen shows. Logs status and code only. */
function failure(err: unknown, what: 'role' | 'save' | 'remove'): AreaActionState {
  unstable_rethrow(err);
  if (err instanceof AdminAuthError) return { authError: true };
  if (err instanceof AdminForbiddenError) return { forbidden: true };
  if (err instanceof AdminValidationError) {
    const fields = pysAreaFields(err.fields);
    return fields ? { fields } : { error: AREA_MESSAGES.notSaved };
  }
  if (err instanceof PysError && err.status === 404 && what === 'remove') {
    revalidatePath(PAGE);
    return { error: AREA_MESSAGES.gone };
  }
  if (err instanceof PysError && err.status === 400) return { error: AREA_MESSAGES.notSaved };
  console.error(`Service area ${what} in PYS failed`, err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
  return { error: AREA_MESSAGES.unreachable };
}

/** null when the signed-in person is an ESS Admin, else the answer to give. */
async function adminOnly(): Promise<AreaActionState | null> {
  try {
    return isEssAdmin((await getMe()).roles) ? null : { forbidden: true };
  } catch (err) {
    return failure(err, 'role');
  }
}

function refresh() {
  // Public pages (contact page's list of areas): expired at once (R8).
  updateTag('areas');
  revalidatePath(PAGE);
}

/** "Add prefix" / "Save changes": PYS adds the prefix, or replaces the one with the same digits. */
export async function saveArea(input: unknown): Promise<AreaActionState> {
  const refused = await adminOnly();
  if (refused) return refused;
  const checked = checkArea(input);
  if (!checked.ok) return { fields: checked.fields };

  let areas: AdminServiceArea[];
  try {
    ({ areas } = await adminRequest<{ areas: AdminServiceArea[] }>('PUT', '/service-areas', checked.input));
  } catch (err) {
    return failure(err, 'save');
  }
  refresh();
  return { ok: true, areas };
}

/** "Yes, remove": the prefix is no longer covered (unless a shorter prefix covers it). */
export async function removeArea(prefix: unknown): Promise<AreaActionState> {
  const refused = await adminOnly();
  if (refused) return refused;
  if (!isPrefix(prefix)) return { error: AREA_MESSAGES.prefix };

  let areas: AdminServiceArea[];
  try {
    // Digits only (checked above), so the prefix is safe in the path as it is.
    ({ areas } = await adminRequest<{ areas: AdminServiceArea[] }>('DELETE', `/service-areas/${prefix}`));
  } catch (err) {
    return failure(err, 'remove');
  }
  refresh();
  return { ok: true, areas };
}
