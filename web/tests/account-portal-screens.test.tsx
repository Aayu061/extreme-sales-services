// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';

// ---- Fakes: the sign-in cookie, notFound, the signed PYS client and the server actions ----
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => jar.set(n, v),
    delete: (n: string) => jar.delete(n),
  }),
}));
class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound('not found');
  },
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
}));
const pysRequest = vi.fn();
vi.mock('@/lib/pys/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pys/client')>()),
  pysRequest: (...a: unknown[]) => pysRequest(...a),
}));
vi.mock('@/app/(site)/account/actions', () => ({
  requestCode: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  forgetEndedSession: vi.fn(async () => undefined),
  renewAmc: vi.fn(),
  requestProfileChange: vi.fn(),
  signOutAll: vi.fn(),
}));

import { PysError } from '@/lib/pys/client';
import { ACCOUNT_COOKIE } from '@/lib/account';
import { OverviewScreen } from '@/components/account/screens/overview-screen';
import { AcDetailScreen, AcsScreen } from '@/components/account/screens/ac-screens';
import { AmcDetailScreen, AmcListScreen } from '@/components/account/screens/amc-screens';
import { RequestDetailScreen, RequestsScreen, requestFilter } from '@/components/account/screens/request-screens';
import { ReportScreen, photoAlt } from '@/components/account/screens/report-screen';
import { BillScreen, BillingScreen, safeUpiLink } from '@/components/account/screens/billing-screens';
import { ProfileScreen } from '@/components/account/screens/profile-screen';
import * as fx from './helpers/portal-fixtures';

const TOKEN = 'a'.repeat(43);
const SESSION = { headers: { 'X-PYS-Customer-Session': TOKEN } };

/** Answers per PYS path; an Error value is thrown. Anything else is a 404 like PYS. */
function pys(routes: Record<string, unknown>) {
  pysRequest.mockImplementation(async (_m: string, path: string) => {
    if (!(path in routes)) throw new PysError(404, 'NOT_FOUND', 'Not found');
    const v = routes[path];
    if (v instanceof Error) throw v;
    return v;
  });
}
const show = async (el: Promise<ReactElement>) => render(await el);
const off = () => new PysError(503, 'PORTAL_OFF', 'off');
const ended = () => new PysError(401, 'SESSION_ENDED', 'ended');

beforeEach(() => {
  jar.clear();
  jar.set(ACCOUNT_COOKIE, TOKEN);
  pysRequest.mockReset();
});
afterEach(cleanup);

/** Every screen, with the one PYS path it reads. */
const SCREENS: Array<[string, string, () => Promise<ReactElement>]> = [
  ['overview', '/portal/overview', () => OverviewScreen()],
  ['acs', '/portal/acs', () => AcsScreen()],
  ['ac detail', '/portal/acs/ac1', () => AcDetailScreen({ id: 'ac1' })],
  ['amc', '/portal/amc', () => AmcListScreen()],
  ['amc detail', '/portal/amc/amc1', () => AmcDetailScreen({ id: 'amc1' })],
  ['requests', '/portal/requests?filter=all', () => RequestsScreen({ filter: 'all' })],
  ['request detail', '/portal/requests/SR-2026-0040', () => RequestDetailScreen({ number: 'SR-2026-0040' })],
  ['report', '/portal/reports/RPT-7', () => ReportScreen({ number: 'RPT-7' })],
  ['billing', '/portal/billing', () => BillingScreen()],
  ['bill', '/portal/billing/INV%2F2026%2F9', () => BillScreen({ number: 'INV/2026/9' })],
  ['profile', '/portal/overview', () => ProfileScreen()],
];

describe.each(SCREENS)('%s screen: shared states', (_name, path, screenFn) => {
  it('sends the session cookie to PYS (never a customer id)', async () => {
    pys({ [path]: new PysError(500, 'INTERNAL', 'x') });
    await show(screenFn());
    expect(pysRequest).toHaveBeenCalledWith('GET', path, SESSION);
  });

  it('switched off in PYS → "coming soon"', async () => {
    pys({ [path]: off() });
    await show(screenFn());
    expect(screen.getByRole('heading', { name: 'Customer login is coming soon' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Your account' })).toBeNull();
  });

  it('ended session → the sign-in form with a note, and the old cookie is cleared', async () => {
    pys({ [path]: ended() });
    await show(screenFn());
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/signed out/);
    const { forgetEndedSession } = await import('@/app/(site)/account/actions');
    expect(forgetEndedSession).toHaveBeenCalled();
  });

  it('other PYS failures → the friendly error box (mentions waking up)', async () => {
    pys({ [path]: new PysError(503, 'PYS_UNREACHABLE', 'x') });
    await show(screenFn());
    expect(screen.getByRole('alert').textContent).toMatch(/could not load your account[\s\S]*waking up/);
  });

  it('no cookie → sign-in form (after checking accounts are on), without asking for customer data', async () => {
    jar.clear();
    pys({ '/portal/status': { enabled: true } });
    await show(screenFn());
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeTruthy();
    expect(pysRequest).toHaveBeenCalledTimes(1);
    expect(pysRequest).toHaveBeenCalledWith('GET', '/portal/status');
  });
});

describe.each([
  ['ac detail', () => AcDetailScreen({ id: 'other-customers-ac' })],
  ['amc detail', () => AmcDetailScreen({ id: 'x9' })],
  ['request detail', () => RequestDetailScreen({ number: 'SR-9999' })],
  ['report', () => ReportScreen({ number: 'RPT-999' })],
  ['bill', () => BillScreen({ number: 'INV-999' })],
] as const)('%s: not found', (_name, screenFn) => {
  it("PYS 404 (missing or another customer's) → Next notFound()", async () => {
    pys({});
    await expect(screenFn()).rejects.toBeInstanceOf(NotFound);
  });

  it('a malformed id never reaches PYS', async () => {
    pys({});
    const bad = { 'ac detail': () => AcDetailScreen({ id: '../me' }), 'amc detail': () => AmcDetailScreen({ id: 'a b' }) } as Record<string, () => Promise<ReactElement>>;
    if (!bad[_name]) return;
    await expect(bad[_name]()).rejects.toBeInstanceOf(NotFound);
    expect(pysRequest).not.toHaveBeenCalled();
  });
});

describe('account tab bar', () => {
  it('names the current tab with aria-current', async () => {
    pys({ '/portal/acs': fx.acs() });
    await show(AcsScreen());
    const nav = screen.getByRole('navigation', { name: 'Your account' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Overview', 'My ACs', 'AMC', 'Service history', 'Billing', 'Profile']);
    expect(within(nav).getByRole('link', { name: 'My ACs' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull();
  });
});

describe('Overview', () => {
  it('greets, shows the four summary cards, alerts and quick actions', async () => {
    pys({ '/portal/overview': fx.overview() });
    await show(OverviewScreen());
    expect(screen.getByRole('heading', { name: 'Hello, Asha Rao' })).toBeTruthy();
    expect(screen.getByText('Tue, 1 Dec 2026, 11:00 am')).toBeTruthy();
    expect(screen.getByText('Technician: Ravi')).toBeTruthy();
    expect(screen.getByText('2 of 4 left')).toBeTruthy();
    expect(screen.getByText('₹7,998.00')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View bills' }).getAttribute('href')).toBe('/account/billing');
    expect(screen.getByRole('link', { name: 'Renew your AMC' }).getAttribute('href')).toBe('/account/amc/amc1');
    expect(screen.getByText('Gas top-up advised on Living room AC')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See the advice' }).getAttribute('href')).toBe('/account/reports/RPT-7');
    expect(screen.getByRole('link', { name: 'Raise a complaint' }).getAttribute('href')).toBe('/book?service=SVC-DIAG');
    expect(screen.getByRole('link', { name: 'Track a request' }).getAttribute('href')).toBe('/track');
  });

  it('hides "Amount due" when nothing is due; handles no visit, no AMC and no alerts', async () => {
    pys({ '/portal/overview': fx.overview({ nextVisit: null, amc: null, billing: { amountDue: 0, unpaidBills: 0 }, openRequests: 0, alerts: [] }) });
    await show(OverviewScreen());
    expect(screen.queryByText('Amount due')).toBeNull();
    expect(screen.getByText('None booked')).toBeTruthy();
    expect(screen.getByText('No active AMC')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Things to look at' })).toBeNull();
  });

  it('PYS without the v2 overview (404) falls back to the v1 page from /portal/me', async () => {
    pys({ '/portal/me': { customer: { name: 'Asha', companyName: null, email: null, phone: null, city: null }, acs: [], amc: [], requests: [] } });
    await show(OverviewScreen());
    expect(screen.getByRole('heading', { name: 'Hello, Asha' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your service requests' })).toBeTruthy();
  });
});

describe('My ACs', () => {
  it('lists each AC with words, cover badge and only the last 4 of the serial', async () => {
    pys({ '/portal/acs': fx.acs() });
    await show(AcsScreen());
    expect(screen.getByRole('heading', { name: 'Daikin 1.5 ton Split AC' })).toBeTruthy();
    expect(screen.getByText('AMC covered')).toBeTruthy();
    expect(screen.getByText('••••1234')).toBeTruthy();
    expect(screen.getByText('Last service Sun, 4 Oct 2026')).toBeTruthy();
    expect(screen.getByText(/1 open recommendation$/)).toBeTruthy();
  });

  it('empty: says we add ACs at the first visit, with "Book a service"', async () => {
    pys({ '/portal/acs': fx.acs([]) });
    await show(AcsScreen());
    expect(screen.getByText('No ACs on record yet')).toBeTruthy();
    expect(screen.getByText('We add them at your first visit.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Book a service' }).getAttribute('href')).toBe('/book');
  });
});

describe('AC detail', () => {
  it('shows specs with the full serials, warranty, AMC cover, history and advice', async () => {
    pys({ '/portal/acs/ac1': fx.acDetail() });
    await show(AcDetailScreen({ id: 'ac1' }));
    expect(screen.getByText('IDU-99887761234')).toBeTruthy();
    expect(screen.getByText('Inverter')).toBeTruthy();
    expect(screen.getByText('5 star')).toBeTruthy();
    expect(screen.getByText('Split AC')).toBeTruthy();
    expect(screen.getByText('Under warranty', { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText('1 used, 1 left of 2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Comprehensive · AMC-0001' }).getAttribute('href')).toBe('/account/amc/amc1');
    const history = screen.getByRole('region', { name: 'Service history' });
    expect(within(history).getByRole('heading', { name: 'Sun, 4 Oct 2026 · Jet service' })).toBeTruthy();
    expect(within(history).getByText('0.5 kg')).toBeTruthy();
    expect(within(history).getByText('Capacitor')).toBeTruthy();
    expect(within(history).getByText('Resolved')).toBeTruthy();
    expect(within(history).getByRole('link', { name: 'View report RPT-7 (2 photos)' }).getAttribute('href')).toBe('/account/reports/RPT-7');
    expect(screen.getByText('Replace the remote batteries')).toBeTruthy();
  });

  it('"Book a service" and "Raise a complaint" for this AC go to /book with the AC in the note', async () => {
    pys({ '/portal/acs/ac1': fx.acDetail() });
    await show(AcDetailScreen({ id: 'ac1' }));
    const book = new URL(screen.getByRole('link', { name: 'Book a service for this AC' }).getAttribute('href')!, 'https://x.test');
    expect(book.pathname).toBe('/book');
    expect(book.searchParams.get('note')).toBe('Service for my Daikin 1.5 ton · Living room. This AC is under my AMC.');
    const complaint = new URL(screen.getByRole('link', { name: 'Raise a complaint for this AC' }).getAttribute('href')!, 'https://x.test');
    expect(complaint.searchParams.get('service')).toBe('SVC-DIAG');
    expect(complaint.searchParams.get('note')).toMatch(/^Complaint about my Daikin 1\.5 ton · Living room\./);
  });

  it('empty history and no AMC read helpfully', async () => {
    pys({ '/portal/acs/ac1': fx.acDetail({ amc: [], history: [], recommendations: [] }) });
    await show(AcDetailScreen({ id: 'ac1' }));
    expect(screen.getByText('No visits on record for this AC yet.')).toBeTruthy();
    expect(screen.getByText(/This AC is not on an AMC/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Open recommendations' })).toBeNull();
  });
});

describe('AMC', () => {
  it('lists current contracts, then previous ones', async () => {
    pys({ '/portal/amc': fx.amcList() });
    await show(AmcListScreen());
    expect(screen.getByRole('link', { name: 'Comprehensive' }).getAttribute('href')).toBe('/account/amc/amc1');
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Visits: 2 of 4 left')).toBeTruthy();
    const old = screen.getByRole('region', { name: 'Previous contracts' });
    expect(within(old).getByText('Expired')).toBeTruthy();
  });

  it('empty: links to AMC plans', async () => {
    pys({ '/portal/amc': fx.amcList([]) });
    await show(AmcListScreen());
    expect(screen.getByRole('link', { name: 'See AMC plans' }).getAttribute('href')).toBe('/amc');
  });

  it('detail: includes with ✓ (and words), visits by type, timeline, Renew form', async () => {
    pys({ '/portal/amc/amc1': fx.amcDetail() });
    await show(AmcDetailScreen({ id: 'amc1' }));
    const inc = screen.getByRole('region', { name: 'What is included' });
    expect(inc.textContent).toContain('Gas charging: included');
    expect(inc.textContent).toContain('Spare parts: not included');
    expect(screen.getByText('2 used, 2 left of 4')).toBeTruthy();
    expect(screen.getByText('Dry service 1 of 2 · Jet service 1 of 2')).toBeTruthy();
    const tl = screen.getByRole('list', { name: 'Visit timeline' });
    expect(within(tl).getByText('Done')).toBeTruthy();
    expect(within(tl).getByText('Upcoming')).toBeTruthy();
    expect(within(tl).getByText('Planned')).toBeTruthy();
    expect(within(tl).getByText('Feb 2027')).toBeTruthy();
    expect(within(tl).getByText('Tue, 1 Dec 2026, 11:00 am · Technician: Ravi')).toBeTruthy();
    expect(within(tl).getByRole('link', { name: 'View report RPT-5' })).toBeTruthy();
    expect(screen.getByText('₹7,998.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ask to renew this AMC' })).toBeTruthy();
  });

  it('detail: renewal already asked for, or not yet open', async () => {
    pys({ '/portal/amc/amc1': fx.amcDetail({ canRenew: false, renewalRequestedAt: '2026-11-25T10:00:00Z' }) });
    await show(AmcDetailScreen({ id: 'amc1' }));
    expect(screen.getByText(/You asked to renew on Wed, 25 Nov 2026/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ask to renew this AMC' })).toBeNull();
    cleanup();
    pys({ '/portal/amc/amc1': fx.amcDetail({ canRenew: false }) });
    await show(AmcDetailScreen({ id: 'amc1' }));
    expect(screen.getByText(/from 30 days before the end date/)).toBeTruthy();
  });
});

describe('Service history', () => {
  it('filter chips mark the current filter; a bad ?filter= means all', async () => {
    expect(requestFilter('open')).toBe('open');
    expect(requestFilter(['completed'])).toBe('completed');
    expect(requestFilter('drop table')).toBe('all');
    pys({ '/portal/requests?filter=open': fx.requests() });
    await show(RequestsScreen({ filter: 'open' }));
    const chips = screen.getByRole('navigation', { name: 'Show requests' });
    expect(within(chips).getByRole('link', { name: 'Open' }).getAttribute('aria-current')).toBe('page');
    expect(within(chips).getByRole('link', { name: 'Completed' }).getAttribute('href')).toBe('/account/requests?filter=completed');
    expect(screen.getByRole('link', { name: 'Breakdown · SR-2026-0042' }).getAttribute('href')).toBe('/account/requests/SR-2026-0042');
    expect(screen.getByText('Visit booked')).toBeTruthy();
  });

  it('empty open list', async () => {
    pys({ '/portal/requests?filter=open': fx.requests([]) });
    await show(RequestsScreen({ filter: 'open' }));
    expect(screen.getByText('No open requests')).toBeTruthy();
  });

  it('request detail: timeline, visits, reports and the bill', async () => {
    pys({ '/portal/requests/SR-2026-0040': fx.requestDetail() });
    await show(RequestDetailScreen({ number: 'SR-2026-0040' }));
    expect(screen.getByRole('heading', { name: 'General service · SR-2026-0040' })).toBeTruthy();
    const steps = screen.getByRole('region', { name: 'Progress' });
    expect(within(steps).getByText('Technician assigned')).toBeTruthy();
    expect(within(steps).getByText('Sun, 4 Oct 2026, 2:00 pm')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Report RPT-7' }).getAttribute('href')).toBe('/account/reports/RPT-7');
    expect(screen.getByRole('link', { name: 'Invoice INV/2026/7' }).getAttribute('href')).toBe('/account/billing/INV%2F2026%2F7');
    expect(screen.getByText('Paid')).toBeTruthy();
  });

  it('request detail with no visit, report or bill yet', async () => {
    pys({ '/portal/requests/SR-2026-0040': fx.requestDetail({ visits: [], reports: [], bill: null, timeline: [] }) });
    await show(RequestDetailScreen({ number: 'SR-2026-0040' }));
    expect(screen.getByText(/No visit booked yet/)).toBeTruthy();
    expect(screen.getByText(/report shows here after the visit/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Bill' })).toBeNull();
  });
});

describe('Service report', () => {
  it('shows the customer copy with photos (alt text with date), parts table and a Print button', async () => {
    pys({ '/portal/reports/RPT-7': fx.report() });
    await show(ReportScreen({ number: 'RPT-7' }));
    expect(screen.getByRole('heading', { name: 'Service report RPT-7' })).toBeTruthy();
    expect(screen.getByText('11:00 am to 12:15 pm')).toBeTruthy();
    expect(screen.getByText('Jet service')).toBeTruthy();
    const before = screen.getByRole('img', { name: 'Before service photo, 4 Oct 2026' });
    expect(before.getAttribute('loading')).toBe('lazy');
    expect(before.closest('a')!.getAttribute('href')).toMatch(/^https:\/\/abc\.supabase\.co\//);
    expect(before.closest('a')!.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('img', { name: 'After service photo, 4 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Part' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Print / Save as PDF' })).toBeTruthy();
  });

  it('numbers photos of one kind; drops anything that is not an https link', async () => {
    expect(photoAlt('BEFORE', '2026-10-04', 2, 3)).toBe('Before service photo 2, 4 Oct 2026');
    pys({ '/portal/reports/RPT-7': fx.report({ photos: [{ kind: 'BEFORE', url: 'javascript:alert(1)', expiresAt: '' }] }) });
    await show(ReportScreen({ number: 'RPT-7' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Photos' })).toBeNull();
  });

  it('Print button calls the browser print', async () => {
    pys({ '/portal/reports/RPT-7': fx.report() });
    const print = vi.fn();
    vi.stubGlobal('print', print);
    await show(ReportScreen({ number: 'RPT-7' }));
    screen.getByRole('button', { name: 'Print / Save as PDF' }).click();
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('Billing', () => {
  it('totals at the top and every bill with its status in words', async () => {
    pys({ '/portal/billing': fx.billing() });
    await show(BillingScreen());
    expect(screen.getByText('Total due').nextSibling?.textContent).toBe('₹7,998.00');
    expect(screen.getByText('₹1,180.00')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Invoice INV/2026/9' }).getAttribute('href')).toBe('/account/billing/INV%2F2026%2F9');
    expect(screen.getByText('Due')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
  });

  it('empty', async () => {
    pys({ '/portal/billing': fx.billing([]) });
    await show(BillingScreen());
    expect(screen.getByText('No bills yet')).toBeTruthy();
  });

  it('invoice: business, customer, GST breakdown, masked payment refs, balance, Print and Pay by UPI', async () => {
    pys({ '/portal/billing/INV%2F2026%2F9': fx.bill() });
    await show(BillScreen({ number: 'INV/2026/9' }));
    expect(screen.getByRole('heading', { name: 'Tax Invoice & Payment Receipt' })).toBeTruthy();
    expect(screen.getByText('GSTIN: 27ABCDE1234F1Z5')).toBeTruthy();
    expect(screen.getByText('Customer code: C-0007')).toBeTruthy();
    const amounts = screen.getByRole('table', { name: 'Invoice amounts' });
    expect(within(amounts).getByRole('rowheader', { name: 'GST (18%)' })).toBeTruthy();
    expect(within(amounts).getByText('₹6,777.97')).toBeTruthy();
    expect(within(amounts).getByText('₹1,220.03')).toBeTruthy();
    expect(within(amounts).getByText('₹5,998.00')).toBeTruthy();
    const pays = screen.getByRole('table', { name: 'Payments received for this invoice' });
    expect(within(pays).getAllByText('••••4321')).toHaveLength(2);
    expect(within(pays).getByText('UPI (reversed)')).toBeTruthy();
    expect(within(pays).getByText('-₹500.00')).toBeTruthy();
    expect(screen.getByText('Part paid')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Print / Save as PDF' })).toBeTruthy();
    const pay = screen.getByRole('link', { name: 'Pay ₹5,998.00 by UPI' });
    expect(pay.getAttribute('href')).toBe(fx.bill().bill.upiLink);
    expect(screen.getByText(/staff confirm each payment/)).toBeTruthy();
  });

  it('no Pay by UPI when nothing is due, or the link is not a UPI link', async () => {
    pys({ '/portal/billing/INV-1': fx.bill({ number: 'INV-1', balance: 0, status: 'PAID', upiLink: null }) });
    await show(BillScreen({ number: 'INV-1' }));
    expect(screen.queryByRole('heading', { name: 'Pay by UPI' })).toBeNull();
    cleanup();
    pys({ '/portal/billing/INV-1': fx.bill({ number: 'INV-1', balance: 0, upiLink: 'upi://pay?pa=x@y&am=1' }) });
    await show(BillScreen({ number: 'INV-1' }));
    expect(screen.queryByRole('heading', { name: 'Pay by UPI' })).toBeNull();
    cleanup();
    pys({ '/portal/billing/INV-1': fx.bill({ number: 'INV-1', upiLink: 'https://evil.example/pay' }) });
    await show(BillScreen({ number: 'INV-1' }));
    expect(screen.queryByRole('heading', { name: 'Pay by UPI' })).toBeNull();
    expect(safeUpiLink('upi://pay?pa=ess@okaxis&am=1.00')).toBe('upi://pay?pa=ess@okaxis&am=1.00');
    expect(safeUpiLink('javascript:alert(1)')).toBeNull();
  });
});

describe('Profile', () => {
  it('shows details (read only), the change request form and both sign-out options', async () => {
    pys({ '/portal/overview': fx.overview() });
    await show(ProfileScreen());
    expect(screen.getByText('asha@example.com')).toBeTruthy();
    expect(screen.getByLabelText(/^What should we change\?/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out of all devices' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /email/i })).toBeNull();
  });
});
