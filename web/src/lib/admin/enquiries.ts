import { normalizeIndianMobile } from '@/lib/request-schema';
import type { AdminEnquiryLine, EnquiryLineStatus } from './types';

/**
 * The AC enquiries screen (client-safe). PYS line statuses (essAdmin.service.ts): a line waits for
 * the seller's price (QUOTE_PENDING), is priced (QUOTED), then is sold (FULFILLED) or not taken
 * (CANCELLED). PYS lets a priced line be priced again or closed; a closed line cannot change (409).
 */

export type EnquiryTabKey = 'waiting' | 'sent' | 'closed';

export interface EnquiryTabDef {
  key: EnquiryTabKey;
  label: string;
  statuses: readonly EnquiryLineStatus[];
  /** Shown when the tab has no lines. */
  empty: string;
}

export const ENQUIRY_TABS: readonly EnquiryTabDef[] = [
  { key: 'waiting', label: 'Waiting for your price', statuses: ['QUOTE_PENDING'], empty: 'No AC enquiries are waiting for your price.' },
  { key: 'sent', label: 'Price sent', statuses: ['QUOTED'], empty: 'No prices sent yet.' },
  { key: 'closed', label: 'Closed', statuses: ['FULFILLED', 'CANCELLED'], empty: 'No closed AC enquiries yet.' },
];

/** Which tab a line belongs to (null for a status this screen does not show). */
export function enquiryTab(status: string): EnquiryTabKey | null {
  return ENQUIRY_TABS.find((t) => (t.statuses as readonly string[]).includes(status))?.key ?? null;
}

/** ?tab= from the address: the first value if given twice; anything unknown is "waiting". */
export function enquiryTabParam(value: string | string[] | undefined): EnquiryTabKey {
  const v = Array.isArray(value) ? value[0] : value;
  return ENQUIRY_TABS.some((t) => t.key === v) ? (v as EnquiryTabKey) : 'waiting';
}

export const enquiriesHref = (tab: EnquiryTabKey): string => `/admin/enquiries?tab=${tab}`;

/** How many lines each tab has. */
export function tabCounts(lines: ReadonlyArray<Pick<AdminEnquiryLine, 'status'>>): Record<EnquiryTabKey, number> {
  const counts: Record<EnquiryTabKey, number> = { waiting: 0, sent: 0, closed: 0 };
  for (const line of lines) {
    const tab = enquiryTab(line.status);
    if (tab) counts[tab] += 1;
  }
  return counts;
}

/**
 * Links to reach the customer. These open the phone or WhatsApp; they are not addresses of this
 * site, so the number never reaches its address bar, history or logs.
 */
export function whatsappHref(phone: string): string | null {
  const mobile = normalizeIndianMobile(phone ?? '');
  return mobile ? `https://wa.me/91${mobile}` : null;
}

/** A mobile as +91…; another number (e.g. a landline) as its digits; no digits → null. */
export function telHref(phone: string): string | null {
  const mobile = normalizeIndianMobile(phone ?? '');
  if (mobile) return `tel:+91${mobile}`;
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 6 ? `tel:${digits}` : null;
}

/** Messages shared by the server actions and the screen. */
export const ENQUIRY_MESSAGES = {
  alreadyUpdated: 'This enquiry was already updated. Refresh to see the latest.',
  gone: "We couldn't find this enquiry any more. Refresh to see the latest.",
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
  noteTooLong: 'Keep the note to 1,000 characters or fewer.',
  checkFields: 'Please check the price and note, then try again.',
  chooseResult: 'Choose Sold or Not taken.',
  priceSent: 'Price sent. The customer gets an email and can see it on the tracking page.',
  sold: 'Marked as sold.',
  notTaken: 'Marked as not taken.',
} as const;

/** enquiryQuoteSchema: note up to 1,000 characters. */
export const NOTE_MAX = 1000;
