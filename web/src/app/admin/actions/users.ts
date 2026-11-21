'use server';

import { unstable_rethrow } from 'next/navigation';
import { isEssAdmin } from '@/lib/admin/nav';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminUser } from '@/lib/admin/types';
import { USER_MESSAGES, checkGrant, isGrantId, isOwnAdminRow, pysGrantFields, type GrantFieldErrors } from '@/lib/admin/users';
import { PysError } from '@/lib/pys/client';

/**
 * "Users" (ESS Admin only): give a person ESS Admin or ESS Staff access by email, or take it away.
 * The person's role is checked first, so ESS Staff is refused before anything is sent to PYS (PYS
 * refuses them too). The form is checked again here with checkGrant (never trusting the browser).
 *
 * The one-time password PYS sends for a new account (R11) exists only in what grantUserRole
 * returns to the screen that called it. It is never logged, never cached, never put in a URL or
 * cookie, and this action does not redirect or re-render the page (no revalidatePath / updateTag:
 * the page is read per request, and the answer carries PYS's new list), so it cannot end up in a
 * server-rendered page. Failures log PYS's status and code only (never its message or the email).
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }).
 */

export interface UserActionState {
  ok?: true;
  /** PYS's list after the change (also sent with some refusals, so the screen is up to date). */
  users?: AdminUser[];
  /** Only for a new account, only in this one answer. The screen shows it once. */
  temporaryPassword?: string | null;
  /** The email the access was given to (as PYS stored it). */
  email?: string;
  error?: string;
  fields?: GrantFieldErrors;
  authError?: true;
  forbidden?: true;
}

/** A PYS failure as the answer the screen shows. Logs status and code only. */
function failure(err: unknown, what: 'role check' | 'grant' | 'list' | 'remove'): UserActionState {
  unstable_rethrow(err);
  if (err instanceof AdminAuthError) return { authError: true };
  if (err instanceof AdminForbiddenError) return { forbidden: true };
  if (err instanceof AdminValidationError) {
    const fields = what === 'grant' ? pysGrantFields(err.fields) : null;
    return fields ? { fields } : { error: what === 'remove' ? USER_MESSAGES.gone : USER_MESSAGES.notSaved };
  }
  if (err instanceof PysError) {
    if (what === 'grant' && err.status === 409) return { error: /already has/i.test(err.message) ? USER_MESSAGES.already : USER_MESSAGES.noProfile };
    if (what === 'remove' && err.status === 404) return { error: USER_MESSAGES.gone };
    // PYS's only 400 here: an ESS Admin removing their own ESS Admin role.
    if (what === 'remove' && err.status === 400) return { error: USER_MESSAGES.self };
    if (err.status === 400) return { error: USER_MESSAGES.notSaved };
  }
  console.error(`ESS users ${what} in PYS failed`, err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
  return { error: USER_MESSAGES.unreachable };
}

/** The signed-in ESS Admin's email, or the answer to give anyone else. */
async function adminOnly(): Promise<{ admin: true; email: string | null } | { admin: false; answer: UserActionState }> {
  try {
    const me = await getMe();
    return isEssAdmin(me.roles) ? { admin: true, email: me.email } : { admin: false, answer: { forbidden: true } };
  } catch (err) {
    return { admin: false, answer: failure(err, 'role check') };
  }
}

/** "Give access": PYS gives the role, making the account first when the email has none. */
export async function grantUserRole(input: unknown): Promise<UserActionState> {
  const me = await adminOnly();
  if (!me.admin) return me.answer;
  const checked = checkGrant(input);
  if (!checked.ok) return { fields: checked.fields };

  try {
    const answer = await adminRequest<{ users: AdminUser[]; temporaryPassword: string | null }>('POST', '/users', checked.input);
    return { ok: true, users: answer.users, temporaryPassword: answer.temporaryPassword ?? null, email: checked.input.email };
  } catch (err) {
    return failure(err, 'grant');
  }
}

/**
 * "Yes, remove": the person loses this one role. Your own ESS Admin role is refused here, before
 * anything is removed (PYS refuses it too); the row is found in PYS's current list, so the check
 * does not trust the browser.
 */
export async function removeUserRole(grantId: unknown): Promise<UserActionState> {
  const me = await adminOnly();
  if (!me.admin) return me.answer;
  if (!isGrantId(grantId)) return { error: USER_MESSAGES.gone };

  let users: AdminUser[];
  try {
    ({ users } = await adminRequest<{ users: AdminUser[] }>('GET', '/users'));
  } catch (err) {
    return failure(err, 'list');
  }
  const row = users.find((u) => u.grantId === grantId);
  if (!row) return { error: USER_MESSAGES.gone, users };
  if (isOwnAdminRow(row, me.email)) return { error: USER_MESSAGES.self, users };

  try {
    // A uuid (checked above), so the id is safe in the path as it is.
    ({ users } = await adminRequest<{ users: AdminUser[] }>('DELETE', `/users/${grantId}`));
  } catch (err) {
    return failure(err, 'remove');
  }
  return { ok: true, users };
}
