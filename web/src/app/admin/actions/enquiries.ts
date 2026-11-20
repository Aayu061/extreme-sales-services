'use server';

import { revalidatePath } from 'next/cache';
import { ENQUIRY_MESSAGES, NOTE_MAX } from '@/lib/admin/enquiries';
import { PRICE_MESSAGES, parseRupees, priceError } from '@/lib/admin/money';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';

/**
 * AC enquiries: the seller (ESS) sends a price per AC, GST included, then marks the line sold or
 * not taken. PYS checks the person's role and the line's status itself; these actions check the
 * input again (never trusting the browser) and turn PYS answers into plain words.
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }) for
 * the screen to act on; these actions never redirect.
 */

export interface EnquiryActionState {
  ok?: true;
  error?: string;
  fields?: { total?: string; note?: string };
  authError?: true;
  forbidden?: true;
  /** The line changed in PYS in the meantime (or is gone): the list is refreshed. */
  conflict?: true;
}

const PAGE = '/admin/enquiries';

/** enquiryLineParamSchema: 1–100 characters after trimming. */
function linePath(lineId: unknown): string | null {
  if (typeof lineId !== 'string') return null;
  const id = lineId.trim();
  return id.length >= 1 && id.length <= 100 ? `/enquiries/${encodeURIComponent(id)}` : null;
}

async function callPys(path: string, body: unknown): Promise<EnquiryActionState> {
  try {
    await adminRequest('POST', path, body);
  } catch (err) {
    if (err instanceof AdminAuthError) return { authError: true };
    if (err instanceof AdminForbiddenError) return { forbidden: true };
    if (err instanceof AdminValidationError) {
      const fields: EnquiryActionState['fields'] = {};
      if (err.fields.total) fields.total = PRICE_MESSAGES.invalid;
      if (err.fields.note) fields.note = ENQUIRY_MESSAGES.noteTooLong;
      return Object.keys(fields).length ? { fields } : { error: ENQUIRY_MESSAGES.checkFields };
    }
    if (err instanceof PysError && (err.status === 409 || err.status === 404)) {
      revalidatePath(PAGE);
      return { conflict: true, error: err.status === 409 ? ENQUIRY_MESSAGES.alreadyUpdated : ENQUIRY_MESSAGES.gone };
    }
    // Status and code only: PYS messages and the input can name a customer or a price.
    console.error('AC enquiry update in PYS failed', err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
    return { error: ENQUIRY_MESSAGES.unreachable };
  }
  revalidatePath(PAGE);
  return { ok: true };
}

/** "Send price": `total` (as typed) and `note` (shown to the customer) from the row's form. */
export async function sendPrice(lineId: string, _prev: EnquiryActionState, formData: FormData): Promise<EnquiryActionState> {
  const path = linePath(lineId);
  if (!path) return { error: ENQUIRY_MESSAGES.gone };

  const typed = formData.get('total');
  const rawNote = formData.get('note');
  const total = typeof typed === 'string' ? parseRupees(typed) : null;
  const note = typeof rawNote === 'string' ? rawNote.trim() : '';

  const fields: EnquiryActionState['fields'] = {};
  if (total === null) fields.total = priceError(typeof typed === 'string' ? typed : '') ?? undefined;
  if (note.length > NOTE_MAX) fields.note = ENQUIRY_MESSAGES.noteTooLong;
  if (fields.total || fields.note) return { fields };

  return callPys(`${path}/quote`, { total, note: note || null });
}

/** "Sold" → PYS FULFILLED; "Not taken" → PYS CANCELLED. */
export async function closeEnquiry(lineId: string, result: 'SOLD' | 'NOT_TAKEN'): Promise<EnquiryActionState> {
  const path = linePath(lineId);
  if (!path) return { error: ENQUIRY_MESSAGES.gone };
  if (result !== 'SOLD' && result !== 'NOT_TAKEN') return { error: ENQUIRY_MESSAGES.chooseResult };
  return callPys(`${path}/close`, { result });
}
