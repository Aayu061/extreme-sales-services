import { describe, expect, it } from 'vitest';
import {
  acTitle,
  acTypeLabel,
  amcStatusBadge,
  billStatusBadge,
  coverageBadge,
  formatDate,
  formatDateTime,
  formatMonth,
  formatRupees,
  formatShortDate,
  formatTime,
  humanize,
  kgText,
  maskedSerial,
  paymentMethodLabel,
  readable,
  requestTypeLabel,
  serviceTypeLabel,
  starRatingText,
  statusLabel,
  technologyLabel,
  tonsText,
  visitStateBadge,
  visitsLeftText,
  warrantyVisitsText,
  istToday,
  amcCoversToday,
} from '@/lib/portal-format';
import { alertHref, bookForAcHref, cleanBookNote, complaintForAcHref, accountHref } from '@/lib/portal-links';

describe('words for PYS codes (S11b polish)', () => {
  it('humanizes codes, keeping acronyms', () => {
    expect(humanize('EXPIRING_SOON')).toBe('Expiring soon');
    expect(humanize('active')).toBe('Active');
    expect(humanize('AMC_SERVICE')).toBe('AMC service');
    expect(humanize('bank-transfer')).toBe('Bank transfer');
    expect(humanize(null)).toBe('');
  });

  it('AC types read as words, with fallbacks', () => {
    expect(acTypeLabel('SPLIT')).toBe('Split AC');
    expect(acTypeLabel('WINDOW')).toBe('Window AC');
    expect(acTypeLabel('CASSETTE')).toBe('Cassette AC');
    expect(acTypeLabel('TOWER')).toBe('Floor-standing AC');
    expect(acTypeLabel('split')).toBe('Split AC');
    expect(acTypeLabel('DUCTABLE')).toBe('Ductable AC');
    expect(acTypeLabel('HIDEAWAY')).toBe('Hideaway AC');
    expect(acTypeLabel('SPLIT_AC')).toBe('Split AC');
    expect(acTypeLabel('UNKNOWN')).toBe('AC');
    expect(acTypeLabel(null)).toBe('AC');
  });

  it('AC title, tons, technology and star rating', () => {
    expect(acTitle({ brand: 'Daikin', tons: 1.5, type: 'SPLIT' })).toBe('Daikin 1.5 ton Split AC');
    expect(acTitle({ brand: null, tons: null, type: null })).toBe('AC');
    expect(tonsText(0)).toBeNull();
    expect(technologyLabel('NON_INVERTER')).toBe('Non-inverter');
    expect(technologyLabel('INVERTER')).toBe('Inverter');
    expect(starRatingText('5')).toBe('5 star');
    expect(starRatingText('3_STAR')).toBe('3 star');
  });

  it('statuses in proper case', () => {
    expect(statusLabel('ACTIVE')).toBe('Active');
    expect(statusLabel('EXPIRING_SOON')).toBe('Expiring soon');
    expect(amcStatusBadge('ACTIVE')).toEqual({ label: 'Active', tone: 'success' });
    expect(amcStatusBadge('EXPIRED')).toEqual({ label: 'Expired', tone: 'neutral' });
    expect(amcStatusBadge('ON_TRIAL').label).toBe('On trial');
  });

  it('request types in words', () => {
    expect(requestTypeLabel('REPAIR')).toBe('Repair');
    expect(requestTypeLabel('BREAKDOWN')).toBe('Breakdown');
    expect(requestTypeLabel('GENERAL_SERVICE')).toBe('General service');
    expect(requestTypeLabel('PREVENTIVE_MAINTENANCE')).toBe('Preventive maintenance');
    expect(requestTypeLabel('INSTALLATION')).toBe('Installation');
    expect(requestTypeLabel('SOMETHING_NEW')).toBe('Something new');
    expect(requestTypeLabel(null)).toBe('Service request');
  });

  it('service types in words', () => {
    expect(serviceTypeLabel('DRY_SERVICE')).toBe('Dry service');
    expect(serviceTypeLabel('JET_SERVICE')).toBe('Jet service');
    expect(serviceTypeLabel('PUMPDOWN_SERVICE')).toBe('Pump-down service');
    expect(serviceTypeLabel('REPAIR')).toBe('Repair');
    expect(serviceTypeLabel('COIL_CLEANING')).toBe('Coil cleaning');
    expect(serviceTypeLabel(null)).toBeNull();
  });

  it('coverage, bill and visit badges carry words (never colour only)', () => {
    expect(coverageBadge('UNDER_WARRANTY')).toEqual({ label: 'Under warranty', tone: 'success' });
    expect(coverageBadge('AMC_COVERED')).toEqual({ label: 'AMC covered', tone: 'info' });
    expect(coverageBadge('OUT_OF_WARRANTY')).toEqual({ label: 'Out of warranty', tone: 'neutral' });
    expect(coverageBadge('EXPIRING_SOON')?.label).toBe('Warranty ending soon');
    expect(coverageBadge(null)).toBeNull();
    expect(billStatusBadge('PAID')).toEqual({ label: 'Paid', tone: 'success' });
    expect(billStatusBadge('PART_PAID')).toEqual({ label: 'Part paid', tone: 'warning' });
    expect(billStatusBadge('DUE')).toEqual({ label: 'Due', tone: 'danger' });
    expect(visitStateBadge('UPCOMING').label).toBe('Upcoming');
    expect(visitStateBadge('MISSED').label).toBe('Missed');
    expect(visitStateBadge(null).label).toBe('Planned');
  });

  it('payment methods and readable free text', () => {
    expect(paymentMethodLabel('UPI')).toBe('UPI');
    expect(paymentMethodLabel('BANK_TRANSFER')).toBe('Bank transfer');
    expect(paymentMethodLabel('CASH')).toBe('Cash');
    expect(readable('NEEDS_ATTENTION')).toBe('Needs attention');
    expect(readable('PCB replaced, cooling normal')).toBe('PCB replaced, cooling normal');
    expect(readable(null)).toBeNull();
  });
});

describe('numbers, dates and times', () => {
  it('rupees with Indian grouping and paise', () => {
    expect(formatRupees(7998)).toBe('₹7,998.00');
    expect(formatRupees(141482.5)).toBe('₹1,41,482.50');
    expect(formatRupees(0)).toBe('₹0.00');
    expect(formatRupees(-500)).toBe('-₹500.00');
    expect(formatRupees(null)).toBe('₹0.00');
  });

  it('dates in India time', () => {
    expect(formatDate('2026-12-01')).toBe('Tue, 1 Dec 2026');
    // 20:00 UTC on 30 Nov is already 1 Dec in India.
    expect(formatDate('2026-11-30T20:00:00Z')).toBe('Tue, 1 Dec 2026');
    expect(formatShortDate('2026-10-04')).toBe('4 Oct 2026');
    expect(formatMonth('2026-12')).toBe('Dec 2026');
    expect(formatMonth('2027-01-01')).toBe('Jan 2027');
  });

  it('times as "11:00 am"', () => {
    expect(formatTime('11:00')).toBe('11:00 am');
    expect(formatTime('11:00:00')).toBe('11:00 am');
    expect(formatTime('14:30')).toBe('2:30 pm');
    expect(formatTime('00:15')).toBe('12:15 am');
    expect(formatTime('12:00')).toBe('12:00 pm');
    expect(formatTime('2026-12-01T05:30:00Z')).toBe('11:00 am');
    expect(formatTime('25:00')).toBeNull();
    expect(formatTime(null)).toBeNull();
    expect(formatDateTime('2026-12-01', '11:00:00')).toBe('Tue, 1 Dec 2026, 11:00 am');
    expect(formatDateTime('2026-12-01', null)).toBe('Tue, 1 Dec 2026');
  });

  it('serials, visits and gas', () => {
    expect(maskedSerial('1234')).toBe('••••1234');
    expect(maskedSerial(null)).toBeNull();
    expect(visitsLeftText({ totalVisits: 4, visitsUsed: 2, visitsLeft: 2 })).toBe('2 of 4 left');
    expect(visitsLeftText({ totalVisits: null, visitsUsed: 2, visitsLeft: 3 })).toBe('3 left');
    expect(visitsLeftText({ totalVisits: null, visitsUsed: 2, visitsLeft: null })).toBe('2 used');
    expect(kgText(0.75)).toBe('0.75 kg');
    expect(kgText(0)).toBeNull();
  });

  it('warranty visits: only the total while PYS does not count used ones (never a made-up "0 used")', () => {
    expect(warrantyVisitsText({ visitsTotal: 2, visitsUsed: null })).toBe('2 visits included');
    expect(warrantyVisitsText({ visitsTotal: 1, visitsUsed: null })).toBe('1 visit included');
    expect(warrantyVisitsText({ visitsTotal: 4, visitsUsed: 1 })).toBe('1 used, 3 left of 4');
    expect(warrantyVisitsText({ visitsTotal: 2, visitsUsed: 5 })).toBe('5 used, 0 left of 2');
    expect(warrantyVisitsText({ visitsTotal: null, visitsUsed: null })).toBeNull();
    expect(warrantyVisitsText({ visitsTotal: 0, visitsUsed: 0 })).toBeNull();
  });

  it('today in India and AMC cover that also checks the end date', () => {
    expect(istToday(new Date('2026-11-30T20:00:00Z'))).toBe('2026-12-01'); // 01:30 the next day in India
    const today = '2026-12-01';
    expect(amcCoversToday([{ status: 'ACTIVE', endDate: '2026-12-01' }], today)).toBe(true);
    expect(amcCoversToday([{ status: 'active', endDate: '2027-01-01' }], today)).toBe(true);
    expect(amcCoversToday([{ status: 'ACTIVE', endDate: '2026-11-30' }], today)).toBe(false); // ended, not yet marked
    expect(amcCoversToday([{ status: 'EXPIRED', endDate: '2027-01-01' }], today)).toBe(false);
    expect(amcCoversToday([], today)).toBe(false);
  });
});

describe('account links', () => {
  it('encodes ids and numbers (a bill number may hold a slash)', () => {
    expect(accountHref.bill('INV/2026/7')).toBe('/account/billing/INV%2F2026%2F7');
    expect(accountHref.requests('open')).toBe('/account/requests?filter=open');
    expect(accountHref.requests('all')).toBe('/account/requests');
    expect(alertHref({ kind: 'amc', id: 'c1' })).toBe('/account/amc/c1');
    expect(alertHref({ kind: 'report', id: 'RPT-1' })).toBe('/account/reports/RPT-1');
    expect(alertHref(null)).toBeNull();
  });

  it('book / complain for this AC pre-fill only the note (and a diagnosis visit for complaints)', () => {
    const ac = { label: 'Daikin 1.5 ton · Living room' };
    const book = new URL(bookForAcHref(ac), 'https://x.test');
    expect(book.pathname).toBe('/book');
    expect(book.searchParams.get('note')).toBe('Service for my Daikin 1.5 ton · Living room.');
    expect(book.searchParams.get('service')).toBeNull();
    const complaint = new URL(complaintForAcHref(ac, { amcCovered: true }), 'https://x.test');
    expect(complaint.searchParams.get('service')).toBe('SVC-DIAG');
    expect(complaint.searchParams.get('note')).toBe('Complaint about my Daikin 1.5 ton · Living room. This AC is under my AMC. Problem:');
  });

  it('cleans a note: one line, no control characters, at most 300 characters', () => {
    expect(cleanBookNote('a\u0000b\n\nc')).toBe('a b c');
    expect(cleanBookNote('x'.repeat(400))).toHaveLength(300);
    expect(cleanBookNote(null)).toBe('');
  });
});
