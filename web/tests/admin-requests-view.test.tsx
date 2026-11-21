// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';

// ---- Fakes: PYS answers by path; redirect() throws like Next does ----

const answers = new Map<string, unknown>();
const adminRequest = vi.fn(async (_method: string, path: string) => {
  const a = answers.get(path);
  if (a instanceof Error) throw a;
  if (a === undefined) throw new Error(`unexpected PYS call ${path}`);
  return a;
});
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string) => adminRequest(method, path),
}));

class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));
let adminPath = '/admin/requests';
let savedSearch: string | undefined;
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-ess-admin-path': adminPath }),
  cookies: async () => ({ get: (name: string) => (name === 'ess-admin-search' && savedSearch !== undefined ? { name, value: savedSearch } : undefined) }),
}));
vi.mock('@/app/admin/actions/requests', () => ({ searchRequests: vi.fn(), clearRequestsFilters: vi.fn() }));

import { AdminAuthError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import { RequestsScreen } from '@/components/admin/requests-view';
import { ApprovalInboxLink, NewestRequests, OverviewCards } from '@/components/admin/overview-view';

const lead = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `intake-${n}`,
  intakeNumber: `WEB-2026-DEV00${n}`,
  trackingCode: `ESS-DEV${n}-AB`,
  kind: 'BASKET',
  status: 'PENDING_REVIEW',
  contact: { name: `Customer ${n}`, phone: `98765432${n}0`, email: `customer${n}@example.com` },
  createdAt: '2026-11-20T09:45:00Z',
  items: [],
  ...extra,
});

const OVERVIEW = {
  requests: { pendingReview: 4, last24Hours: 3, sellerInterestPending: 1 },
  products: { total: 13, published: 11 },
  content: { blocksWithUnpublishedChanges: 0 },
};
const ENQUIRIES = { enquiries: [{ lineId: 'a', status: 'QUOTE_PENDING' }, { lineId: 'b', status: 'QUOTED' }, { lineId: 'c', status: 'QUOTE_PENDING' }] };

async function show(el: Promise<ReactElement>) {
  return render(await el);
}
const requests = (searchParams: Record<string, string>) => show(RequestsScreen({ searchParams: Promise.resolve(searchParams) }));

/** Every link and form address on the page: never a customer's phone or email. */
function expectNoContactInAddresses(container: HTMLElement) {
  const addresses = [...container.querySelectorAll('a[href], form[action]')].map((el) => el.getAttribute('href') ?? el.getAttribute('action') ?? '');
  expect(addresses.length).toBeGreaterThan(0);
  for (const a of addresses) {
    expect(a).not.toMatch(/98765432|@example\.com|customer\d/i);
  }
}

/** Every href and form action in the server HTML: never the search (it can be a phone or email). */
function addressesIn(html: string): string[] {
  return [...html.matchAll(/\s(?:href|action|formAction)="([^"]*)"/gi)].map((m) => m[1]);
}

beforeEach(() => {
  answers.clear();
  adminRequest.mockClear();
  adminPath = '/admin/requests';
  savedSearch = undefined;
});
afterEach(() => {
  cleanup();
});

describe('Requests screen', () => {
  it('lists the requests with number, kind, name, received and status, each opening PYS', async () => {
    answers.set('/leads?page=1&pageSize=25', {
      items: [lead(1, { kind: 'PRODUCT_ENQUIRY', status: 'APPROVED' }), lead(2, { kind: 'SELLER_INTEREST' })],
      total: 2,
      page: 1,
      pageSize: 25,
    });
    const { container } = await requests({});
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[0]).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Number', 'Kind', 'Name', 'Received', 'Status', 'Approve in PYS']);
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'WEB-2026-DEV001',
      'AC enquiry',
      'Customer 1',
      '20 Nov 2026, 3:15 pm',
      'Approved',
      'Open in PYS',
    ]);
    expect(within(rows[2]).getByText('Dealer interest')).toBeTruthy();
    expect(within(rows[2]).getByText('Waiting for approval')).toBeTruthy();

    const open = within(rows[1]).getByRole('link', { name: 'Open in PYS: WEB-2026-DEV001 (opens in a new tab)' });
    expect(open.getAttribute('href')).toBe('https://place-your-service.vercel.app/intakes');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');

    // Phones and emails are not shown here, and never end up in an address.
    expect(container.textContent).not.toMatch(/98765432|@example\.com/);
    expectNoContactInAddresses(container);
    expect(screen.getByText('Showing 1–2 of 2')).toBeTruthy();
  });

  it('asks PYS with status, kind and page from the address and the search saved on the server', async () => {
    savedSearch = '9820012345';
    answers.set('/leads?status=APPROVED&kind=CONTACT&search=9820012345&page=2&pageSize=25', { items: [lead(3)], total: 26, page: 2, pageSize: 25 });
    const { container } = await requests({ status: 'APPROVED', kind: 'CONTACT', page: '2' });
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('APPROVED');
    expect((screen.getByLabelText('Kind') as HTMLSelectElement).value).toBe('CONTACT');
    expect((screen.getByLabelText(/^Search/) as HTMLInputElement).value).toBe('9820012345');

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByText('Page 2 of 2')).toBeTruthy();
    expect(within(pages).getByRole('link', { name: 'Previous page' }).getAttribute('href')).toBe('/admin/requests?status=APPROVED&kind=CONTACT');
    expect(within(pages).queryByRole('link', { name: 'Next page' })).toBeNull();
    expect(screen.getByText('Showing 26–26 of 26')).toBeTruthy();
    for (const el of container.querySelectorAll('a[href]')) expect(el.getAttribute('href')).not.toContain('9820012345');
  });

  it('never puts the search in a link or form address, and posts the form (works before the page script loads)', async () => {
    savedSearch = 'priya@example.com';
    answers.set('/leads?search=priya%40example.com&page=1&pageSize=25', { items: [lead(1)], total: 30, page: 1, pageSize: 25 });
    const html = renderToString(await RequestsScreen({ searchParams: Promise.resolve({}) }));
    const addresses = addressesIn(html);
    expect(addresses.length).toBeGreaterThan(0);
    for (const a of addresses) expect(a).not.toMatch(/priya|%40|@/i);
    const forms = html.match(/<form[^>]*>/g) ?? [];
    expect(forms.length).toBeGreaterThan(0);
    for (const tag of forms) expect(tag).toMatch(/method="post"|action="javascript:/i);
  });

  it('does not let the browser remember searches (they can be customer phones or emails)', async () => {
    answers.set('/leads?page=1&pageSize=25', { items: [lead(1)], total: 1, page: 1, pageSize: 25 });
    await requests({});
    expect((screen.getByLabelText(/^Search/) as HTMLInputElement).getAttribute('autocomplete')).toBe('off');
  });

  it('ignores a search in the address (an old link), neither reading nor repeating it', async () => {
    answers.set('/leads?kind=BASKET&page=1&pageSize=25', { items: [lead(1)], total: 30, page: 1, pageSize: 25 });
    const { container } = await requests({ kind: 'BASKET', search: '9876543210' });
    expect(adminRequest).toHaveBeenCalledWith('GET', '/leads?kind=BASKET&page=1&pageSize=25');
    expect((screen.getByLabelText(/^Search/) as HTMLInputElement).value).toBe('');
    expect(container.innerHTML).not.toContain('9876543210');
  });

  it('ignores filters PYS does not know instead of failing', async () => {
    answers.set('/leads?page=1&pageSize=25', { items: [lead(1)], total: 30, page: 1, pageSize: 25 });
    await requests({ status: 'NOPE', page: '-3' });
    expect(adminRequest).toHaveBeenCalledWith('GET', '/leads?page=1&pageSize=25');
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Next page' }).getAttribute('href')).toBe('/admin/requests?page=2');
  });

  it('says so in plain words when nothing matches, with Clear filters (which also forgets the search)', async () => {
    savedSearch = 'zzz';
    answers.set('/leads?kind=CONTACT&search=zzz&page=1&pageSize=25', { items: [], total: 0, page: 1, pageSize: 25 });
    await requests({ kind: 'CONTACT' });
    expect(screen.getByText('No requests match these filters')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    // A button posting to the clear action, not a link: a link could not forget the saved search.
    const clear = screen.getAllByRole('button', { name: 'Clear filters' });
    expect(clear.length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull();
  });

  it('says there are no requests yet when there are none at all', async () => {
    answers.set('/leads?page=1&pageSize=25', { items: [], total: 0, page: 1, pageSize: 25 });
    await requests({});
    expect(screen.getByText('No requests yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('offers the first page when the page asked for is past the end', async () => {
    answers.set('/leads?page=9&pageSize=25', { items: [], total: 3, page: 9, pageSize: 25 });
    await requests({ page: '9' });
    expect(screen.getByRole('link', { name: 'Go to the first page' }).getAttribute('href')).toBe('/admin/requests');
  });

  it('explains when PYS cannot be reached, with Try again (without the search)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    savedSearch = '9820012345';
    answers.set('/leads?status=SPAM&search=9820012345&page=1&pageSize=25', new PysError(503, 'HTTP_503', 'PYS answered 503'));
    await requests({ status: 'SPAM' });
    expect(screen.getByRole('alert').textContent).toContain("We couldn't reach PYS. It may be waking up — try again in a minute.");
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/admin/requests?status=SPAM');
    log.mockRestore();
  });

  it('sends an expired session to sign in again, back to the same filters', async () => {
    adminPath = '/admin/requests?kind=BASKET';
    answers.set('/leads?kind=BASKET&page=1&pageSize=25', new AdminAuthError());
    await expect(RequestsScreen({ searchParams: Promise.resolve({ kind: 'BASKET' }) })).rejects.toMatchObject({
      url: '/admin/login?expired=1&next=%2Fadmin%2Frequests%3Fkind%3DBASKET',
    });
  });
});

describe('Overview', () => {
  it('shows the four numbers', async () => {
    adminPath = '/admin';
    answers.set('/overview', OVERVIEW);
    answers.set('/enquiries', ENQUIRIES);
    await show(OverviewCards());
    const card = (name: string) => screen.getByRole('heading', { name }).closest('section')!;
    expect(within(card('Waiting for approval')).getByText('4')).toBeTruthy();
    expect(within(card('Last 24 hours')).getByText('3')).toBeTruthy();
    expect(within(card('AC enquiries waiting for your price')).getByText('2')).toBeTruthy();
    expect(card('Products shown / hidden').textContent).toContain('11 shown');
    expect(card('Products shown / hidden').textContent).toContain('2 hidden');
    expect(within(card('Waiting for approval')).getByText('1 of them is dealer interest')).toBeTruthy();
  });

  it('links to the PYS Approval Inbox in a new tab', () => {
    render(<ApprovalInboxLink />);
    const inbox = screen.getByRole('link', { name: 'Open the Approval Inbox in PYS (opens in a new tab)' });
    expect(inbox.getAttribute('href')).toBe('https://place-your-service.vercel.app/intakes');
    expect(inbox.getAttribute('target')).toBe('_blank');
    expect(inbox.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('explains when PYS cannot be reached', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    adminPath = '/admin';
    answers.set('/overview', new TypeError('fetch failed'));
    answers.set('/enquiries', ENQUIRIES);
    await show(OverviewCards());
    expect(screen.getByRole('alert').textContent).toContain("We couldn't reach PYS.");
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/admin');
    log.mockRestore();
  });

  it('lists the 5 newest requests, with a link to all of them', async () => {
    answers.set('/leads?page=1&pageSize=5', { items: [1, 2, 3, 4, 5].map((n) => lead(n)), total: 30, page: 1, pageSize: 5 });
    const { container } = await show(NewestRequests());
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'See all requests' }).getAttribute('href')).toBe('/admin/requests');
    expectNoContactInAddresses(container);
  });
});
