import { z } from 'zod';
import type { AdminUser, EssRole, RoleGrantInput } from './types';

/**
 * "Users": who has ESS Admin or ESS Staff access. An ESS Admin gives a role by email; PYS makes a
 * new account when the email has none and sends back its one-time password once (only ever held
 * in the screen's memory, see users-editor.tsx).
 *
 * PYS rules mirrored here (roleGrantSchema, strict; grantIdParamSchema for removing):
 *   - email: trimmed, lower-cased, an email address, up to 254 characters
 *   - fullName: optional; blank → left out; else trimmed, 1–120 characters
 *   - role: ESS_ADMIN or ESS_STAFF
 *   - the id in DELETE /users/:id is a uuid
 */

export const ROLE_LABELS: Record<EssRole, string> = { ESS_ADMIN: 'ESS Admin', ESS_STAFF: 'ESS Staff' };
export const ROLES = ['ESS_STAFF', 'ESS_ADMIN'] as const satisfies readonly EssRole[];

export const USER_MESSAGES = {
  email: 'Enter an email address like name@example.com.',
  fullName: 'Keep the name to 120 characters or fewer.',
  role: 'Choose ESS Admin or ESS Staff.',
  checkFields: 'Please check the highlighted details.',
  granted: 'Access given. They can sign in with their own password.',
  created: 'Access given. A new account was made with this one-time password:',
  passwordNote: 'Share it privately; they must change it at first sign-in',
  copied: 'Copied.',
  copyFailed: "Couldn't copy. Select the password and copy it yourself.",
  already: 'This person already has that role.',
  noProfile: 'An account with this email exists but has no profile. Ask a PYS Admin to fix it.',
  self: "You can't remove your own admin access",
  gone: 'This access was already removed.',
  notSaved: 'PYS could not save this. Please check it and try again.',
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
  pysAdmins: 'PYS Admins always have ESS Admin access — manage them in PYS.',
} as const;

export type GrantField = 'email' | 'fullName' | 'role';
export type GrantFieldErrors = Partial<Record<GrantField, string>>;

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** PYS roleGrantSchema, field by field (same zod checks), so a form error names the field. */
const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(120).optional()),
  role: z.enum(ROLES),
});

const FIELD_MESSAGE: Record<GrantField, string> = { email: USER_MESSAGES.email, fullName: USER_MESSAGES.fullName, role: USER_MESSAGES.role };

/** Checks the form (in the browser and again in the server action) and gives PYS's body. */
export function checkGrant(raw: unknown): { ok: true; input: RoleGrantInput } | { ok: false; fields: GrantFieldErrors } {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const parsed = grantSchema.safeParse({ email: r.email, fullName: r.fullName ?? undefined, role: r.role });
  if (!parsed.success) {
    const fields: GrantFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'fullName' || key === 'role') fields[key] ??= FIELD_MESSAGE[key];
    }
    return { ok: false, fields: Object.keys(fields).length ? fields : { email: USER_MESSAGES.email } };
  }
  const { email, fullName, role } = parsed.data;
  return { ok: true, input: fullName ? { email, fullName, role } : { email, role } };
}

/** PYS's 422 field names → this form's messages (anything else: null, the caller says "not saved"). */
export function pysGrantFields(fields: Record<string, string>): GrantFieldErrors | null {
  const out: GrantFieldErrors = {};
  for (const key of ['email', 'fullName', 'role'] as const) if (fields[key]) out[key] = FIELD_MESSAGE[key];
  return Object.keys(out).length ? out : null;
}

const grantIdSchema = z.uuid();
/** PYS grantIdParamSchema (a uuid), so the id is safe in the path as it is. */
export const isGrantId = (v: unknown): v is string => grantIdSchema.safeParse(v).success;

const sameEmail = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

/** This row is the signed-in person's own email (PYS's /me has no profile id to compare). */
export const isOwnRow = (user: Pick<AdminUser, 'email'>, myEmail: string | null | undefined) => sameEmail(user.email, myEmail);

/** The signed-in person's own ESS Admin role: they cannot remove it themselves. */
export const isOwnAdminRow = (user: Pick<AdminUser, 'email' | 'role'>, myEmail: string | null | undefined) => user.role === 'ESS_ADMIN' && isOwnRow(user, myEmail);

/** How a row names the person: their name, else their email. */
export const personName = (user: Pick<AdminUser, 'name' | 'email'>) => user.name?.trim() || user.email || 'This person';
