import type { CustomerStatus } from '@/lib/pys/types';

/**
 * The Requests screen: website requests as PYS lists them (GET /ess/admin/leads), read-only.
 * The filter values are exactly the ones PYS accepts (server/src/validators/ess.validator.ts,
 * leadsQuerySchema); anything else in the address is dropped instead of being sent to PYS.
 */

/** Where approving happens. PYS has no address per request, so every request opens the inbox. */
export const PYS_APPROVAL_INBOX = 'https://place-your-service.vercel.app/intakes';

/**
 * The search box can hold a customer's phone or email, which never goes in an address (history,
 * hosting logs, sign-in "next" links). It is posted to a server action and kept in this short-lived
 * httpOnly cookie, read only by the Requests screen.
 */
export const REQUESTS_SEARCH_COOKIE = 'ess-admin-search';
export const REQUESTS_SEARCH_COOKIE_PATH = '/admin/requests';
export const REQUESTS_SEARCH_MAX_AGE = 30 * 60;

export const REQUESTS_PAGE_SIZE = 25;
/** leadsQuerySchema limits. */
const MAX_PAGE = 10_000;
const MAX_SEARCH = 100;

/** The statuses PYS can filter by. */
export const REQUEST_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DUPLICATE', 'SPAM'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Every kind of website request PYS has (INTAKE_KINDS), newest forms first. */
export const REQUEST_KINDS = ['BASKET', 'PRODUCT_ENQUIRY', 'CONTACT', 'SELLER_INTEREST', 'SERVICE_BOOKING', 'AMC_REQUEST'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const KIND_LABEL: Record<RequestKind, string> = {
  BASKET: 'Service booking',
  PRODUCT_ENQUIRY: 'AC enquiry',
  CONTACT: 'Message',
  SELLER_INTEREST: 'Dealer interest',
  SERVICE_BOOKING: 'Service booking (old form)',
  AMC_REQUEST: 'AMC request (old form)',
};

/** Every status a request can have (INTAKE_STATUSES), including two PYS does not filter by. */
export const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
  SPAM: 'Spam',
  WITHDRAWN: 'Withdrawn',
  IMPORTED_ARCHIVE: 'Old record',
};

const STATUS_TONE: Record<string, CustomerStatus['tone']> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export const kindLabel = (kind: string): string => KIND_LABEL[kind as RequestKind] ?? 'Other request';

export function statusLabel(status: string): Pick<CustomerStatus, 'label' | 'tone'> {
  return { label: STATUS_LABEL[status] ?? status, tone: STATUS_TONE[status] ?? 'neutral' };
}

export interface RequestsQuery {
  status?: RequestStatus;
  kind?: RequestKind;
  /** Typed by staff (name, email, request number, tracking code or mobile number). Never in an address. */
  search?: string;
  page: number;
}

/** Trimmed, at most 100 characters (the PYS limit); anything that is not text is "". */
export function cleanSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_SEARCH).trim() : '';
}

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  list.includes(v as T) ? (v as T) : undefined;

/**
 * The Requests screen's filters: status, kind and page from its address; the search only from the
 * saved search (cookie). A "search" in the address (an old link) is not read.
 */
export function requestsQuery(params: SearchParams, savedSearch?: string): RequestsQuery {
  const q: RequestsQuery = { page: 1 };
  const status = oneOf(REQUEST_STATUSES, first(params.status));
  const kind = oneOf(REQUEST_KINDS, first(params.kind));
  const search = cleanSearch(savedSearch);
  const page = Math.trunc(Number(first(params.page)));
  if (status) q.status = status;
  if (kind) q.kind = kind;
  if (search) q.search = search;
  if (Number.isFinite(page)) q.page = Math.min(Math.max(page, 1), MAX_PAGE);
  return q;
}

function addressParams(q: RequestsQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.status) p.set('status', q.status);
  if (q.kind) p.set('kind', q.kind);
  return p;
}

export const hasFilters = (q: RequestsQuery): boolean => Boolean(q.status || q.kind || q.search);

/** /admin/requests with status, kind and page (page 1 left out). Never the search. */
export function requestsHref(q: RequestsQuery): string {
  const p = addressParams(q);
  if (q.page > 1) p.set('page', String(q.page));
  const s = p.toString();
  return s ? `/admin/requests?${s}` : '/admin/requests';
}

/** The PYS call for one page: adminRequest('GET', leadsPath(q)). Server to PYS only. */
export function leadsPath(q: RequestsQuery, pageSize = REQUESTS_PAGE_SIZE): string {
  const p = addressParams(q);
  if (q.search) p.set('search', q.search);
  p.set('page', String(q.page));
  p.set('pageSize', String(pageSize));
  return `/leads?${p}`;
}

/** AC enquiry lines still waiting for ESS to send a price. */
export const waitingForPrice = (lines: ReadonlyArray<{ status: string }>): number =>
  lines.filter((line) => line.status === 'QUOTE_PENDING').length;

const receivedFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

/** "2026-11-20T09:45:00Z" → "20 Nov 2026, 3:15 pm" (India time). */
export function formatReceived(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const part = (type: string) => receivedFmt.formatToParts(d).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toLowerCase()}`;
}
