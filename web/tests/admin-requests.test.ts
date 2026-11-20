import { describe, expect, it } from 'vitest';
import {
  KIND_LABEL,
  PYS_APPROVAL_INBOX,
  REQUESTS_PAGE_SIZE,
  REQUEST_KINDS,
  REQUEST_STATUSES,
  STATUS_LABEL,
  formatReceived,
  kindLabel,
  leadsPath,
  requestsHref,
  requestsQuery,
  statusLabel,
  waitingForPrice,
} from '@/lib/admin/requests';

describe('requestsQuery', () => {
  it('keeps the filters PYS accepts', () => {
    expect(requestsQuery({ status: 'APPROVED', kind: 'BASKET', search: '  Priya  ', page: '3' })).toEqual({
      status: 'APPROVED',
      kind: 'BASKET',
      search: 'Priya',
      page: 3,
    });
  });

  it('drops values PYS does not know, and blanks', () => {
    expect(requestsQuery({ status: 'NOPE', kind: 'approved', search: '   ' })).toEqual({ page: 1 });
    expect(requestsQuery({ status: 'pending_review', kind: 'BASKET; DROP' })).toEqual({ page: 1 });
    expect(requestsQuery({ status: '', kind: '', search: '' })).toEqual({ page: 1 });
    // WITHDRAWN is a real status, but PYS does not filter by it (leadsQuerySchema).
    expect(requestsQuery({ status: 'WITHDRAWN' })).toEqual({ page: 1 });
    expect(requestsQuery({})).toEqual({ page: 1 });
  });

  it('clamps the page to 1 or more (and to what PYS allows)', () => {
    expect(requestsQuery({ page: '0' }).page).toBe(1);
    expect(requestsQuery({ page: '-4' }).page).toBe(1);
    expect(requestsQuery({ page: 'abc' }).page).toBe(1);
    expect(requestsQuery({ page: '2.5' }).page).toBe(2);
    expect(requestsQuery({ page: '99999' }).page).toBe(10_000);
  });

  it('uses the first value when one is given twice, and keeps search within 100 characters', () => {
    expect(requestsQuery({ status: ['SPAM', 'APPROVED'], page: ['2', '5'] })).toEqual({ status: 'SPAM', page: 2 });
    expect(requestsQuery({ search: 'x'.repeat(150) }).search).toHaveLength(100);
  });
});

describe('labels', () => {
  it('match the kinds and statuses PYS filters by (leadsQuerySchema / INTAKE_KINDS)', () => {
    expect([...REQUEST_KINDS].sort()).toEqual(['AMC_REQUEST', 'BASKET', 'CONTACT', 'PRODUCT_ENQUIRY', 'SELLER_INTEREST', 'SERVICE_BOOKING']);
    expect([...REQUEST_STATUSES].sort()).toEqual(['APPROVED', 'DUPLICATE', 'PENDING_REVIEW', 'REJECTED', 'SPAM']);
  });

  it('names every kind PYS sends in plain words', () => {
    expect(KIND_LABEL).toEqual({
      BASKET: 'Service booking',
      PRODUCT_ENQUIRY: 'AC enquiry',
      CONTACT: 'Message',
      SELLER_INTEREST: 'Dealer interest',
      SERVICE_BOOKING: 'Service booking (old form)',
      AMC_REQUEST: 'AMC request (old form)',
    });
    for (const kind of REQUEST_KINDS) expect(kindLabel(kind)).toBe(KIND_LABEL[kind]);
    expect(kindLabel('SOMETHING_NEW')).toBe('Other request');
  });

  it('names every status PYS can send, including the ones it does not filter by', () => {
    for (const status of [...REQUEST_STATUSES, 'WITHDRAWN', 'IMPORTED_ARCHIVE']) {
      expect(STATUS_LABEL[status], status).toBeTruthy();
      expect(statusLabel(status).label).toBe(STATUS_LABEL[status]);
    }
    expect(statusLabel('PENDING_REVIEW')).toEqual({ label: 'Waiting for approval', tone: 'warning' });
    expect(statusLabel('SOMETHING_NEW').label).toBe('SOMETHING_NEW');
  });
});

describe('addresses', () => {
  it('builds the Requests page address with only the filters set (page 1 left out)', () => {
    expect(requestsHref({ page: 1 })).toBe('/admin/requests');
    expect(requestsHref({ status: 'APPROVED', kind: 'CONTACT', search: 'WEB-2026', page: 2 })).toBe(
      '/admin/requests?status=APPROVED&kind=CONTACT&search=WEB-2026&page=2',
    );
    expect(requestsHref({ search: 'a&b=c', page: 1 })).toBe('/admin/requests?search=a%26b%3Dc');
  });

  it('asks PYS for one page of requests', () => {
    expect(leadsPath({ page: 1 })).toBe(`/leads?page=1&pageSize=${REQUESTS_PAGE_SIZE}`);
    expect(leadsPath({ status: 'PENDING_REVIEW', search: 'Rahul', page: 2 }, 5)).toBe('/leads?status=PENDING_REVIEW&search=Rahul&page=2&pageSize=5');
  });

  it('opens the PYS Approval Inbox', () => {
    expect(PYS_APPROVAL_INBOX).toBe('https://place-your-service.vercel.app/intakes');
  });
});

describe('overview helpers', () => {
  it('counts the AC enquiry lines waiting for a price', () => {
    expect(waitingForPrice([{ status: 'QUOTE_PENDING' }, { status: 'QUOTED' }, { status: 'QUOTE_PENDING' }, { status: 'CANCELLED' }])).toBe(2);
    expect(waitingForPrice([])).toBe(0);
  });

  it('shows when a request came in, in India time', () => {
    expect(formatReceived('2026-11-20T09:45:00Z')).toBe('20 Nov 2026, 3:15 pm');
    expect(formatReceived('not a date')).toBe('not a date');
  });
});
