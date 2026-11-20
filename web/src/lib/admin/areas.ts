import type { ServiceAreaInput } from './types';

/**
 * "Pincodes": the pincode prefixes ESS covers. The public pincode check uses the longest prefix
 * that matches (so 400088 marked "not covered" carves one pincode out of 400).
 *
 * PYS rules mirrored here (serviceAreaSchema, strict; prefixParamSchema for removing):
 *   - pincodePrefix: trimmed, /^[1-9][0-9]{1,5}$/ (2–6 digits, not starting with 0)
 *   - label: trimmed, 2–120 characters
 *   - isActive: true or false
 *   - notes: trimmed, up to 300 characters; empty → null (only seen in the admin area)
 */

export const PREFIX_RE = /^[1-9][0-9]{1,5}$/;
const LABEL_MIN = 2;
const LABEL_MAX = 120;
const NOTES_MAX = 300;

export const AREA_MESSAGES = {
  prefix: 'Use 2–6 digits of the pincode.',
  label: `Enter the area's name (${LABEL_MIN} to ${LABEL_MAX} characters).`,
  isActive: 'Choose whether we cover these pincodes.',
  notes: `Keep the notes to ${NOTES_MAX} characters or fewer.`,
  exists: 'This prefix is already in the list. Use Edit on it instead.',
  checkFields: 'Please check the highlighted details.',
  saved: 'Saved. The pincode check uses it now.',
  gone: 'This prefix was already removed.',
  notSaved: 'PYS could not save this. Please check it and try again.',
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
} as const;

export type AreaField = 'pincodePrefix' | 'label' | 'isActive' | 'notes';
export type AreaFieldErrors = Partial<Record<AreaField, string>>;

export const isPrefix = (v: unknown): v is string => typeof v === 'string' && PREFIX_RE.test(v);

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Checks the form (in the browser and again in the server action) and gives PYS's body. */
export function checkArea(raw: unknown): { ok: true; input: ServiceAreaInput } | { ok: false; fields: AreaFieldErrors } {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const fields: AreaFieldErrors = {};
  const pincodePrefix = text(r.pincodePrefix);
  if (!PREFIX_RE.test(pincodePrefix)) fields.pincodePrefix = AREA_MESSAGES.prefix;
  const label = text(r.label);
  if (label.length < LABEL_MIN || label.length > LABEL_MAX) fields.label = AREA_MESSAGES.label;
  const notes = text(r.notes);
  if (notes.length > NOTES_MAX || (r.notes != null && typeof r.notes !== 'string')) fields.notes = AREA_MESSAGES.notes;
  if (r.isActive !== undefined && typeof r.isActive !== 'boolean') fields.isActive = AREA_MESSAGES.isActive;
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, input: { pincodePrefix, label, isActive: r.isActive !== false, notes: notes || null } };
}

/** PYS's 422 field names → this form's messages (anything else: null, the caller says "not saved"). */
export function pysAreaFields(fields: Record<string, string>): AreaFieldErrors | null {
  const out: AreaFieldErrors = {};
  if (fields.pincodePrefix || fields.prefix) out.pincodePrefix = AREA_MESSAGES.prefix;
  if (fields.label) out.label = AREA_MESSAGES.label;
  if (fields.notes) out.notes = AREA_MESSAGES.notes;
  return Object.keys(out).length ? out : null;
}
