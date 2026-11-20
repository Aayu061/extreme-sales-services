// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';

// ---- Fakes: PYS (adminRequest + getMe), Next's cache calls, the router, redirect() throwing like Next ----
// The real server actions run (no fake): a click on the screen goes through the action to adminRequest,
// so these tests also show what reaches PYS.

const adminRequest = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>();
const me = { current: { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'a@example.com' } as unknown };
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string, body?: unknown) => adminRequest(method, path, body),
  getMe: async () => me.current,
}));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => updateTag(tag),
  revalidatePath: (p: string, type?: string) => revalidatePath(p, type),
}));
const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/display',
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  notFound: () => {
    throw new Error('not found');
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-ess-admin-path': '/admin/display' }) }));

import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import { DISPLAY_MESSAGES, checkDisplayItems, displayChanges, displayRows, moveItem } from '@/lib/admin/display';
import { AREA_MESSAGES, checkArea } from '@/lib/admin/areas';
import { saveDisplay } from '@/app/admin/actions/display';
import { removeArea, saveArea } from '@/app/admin/actions/areas';
import { DisplayEditor } from '@/components/admin/display-editor';
import { DisplayScreen } from '@/components/admin/display-view';
import { AreasEditor } from '@/components/admin/areas-editor';
import { AreasScreen } from '@/components/admin/areas-view';
import type { AdminCatalogDisplay, AdminServiceArea } from '@/lib/admin/types';

const ADMIN = { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'a@example.com' };
const STAFF = { roles: ['ESS_STAFF'], isPysAdmin: false, name: 'Test Staff', email: 's@example.com' };

const svc = (code: string, name: string, displayOrder: number, extra: Record<string, unknown> = {}) => ({
  code,
  name,
  category: 'CLEANING',
  isPublic: true,
  isActive: true,
  displayOrder,
  ...extra,
});
const plan = (code: string, name: string, displayOrder: number, extra: Record<string, unknown> = {}) => ({
  ...svc(code, name, displayOrder, extra),
  category: 'ORDINARY',
  planCode: `${code}-PLAN`,
});

const DISPLAY: AdminCatalogDisplay = {
  services: [svc('SVC-DRY', 'Dry service', 10), svc('SVC-JET-WASH', 'Jet wash', 20), svc('SVC-FOAM', 'Foam jet wash', 30)],
  amcPlans: [plan('ORD-3', 'Ordinary AMC (3 visits)', 10), plan('ORD-4', 'Ordinary AMC (4 visits)', 20)],
};

const AREAS: AdminServiceArea[] = [
  { pincodePrefix: '400', label: 'Mumbai, Thane & Navi Mumbai', isActive: true, notes: null, updatedAt: '2026-11-19T00:00:00Z' },
  { pincodePrefix: '400088', label: 'Trombay', isActive: false, notes: 'Not served for now', updatedAt: '2026-11-19T00:00:00Z' },
];

beforeEach(() => {
  adminRequest.mockReset();
  updateTag.mockClear();
  revalidatePath.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
  me.current = ADMIN;
});
afterEach(() => {
  cleanup();
});

/* ---------------------------------------------------------------- moving and what changed */

describe('moveItem', () => {
  const list = ['a', 'b', 'c'];

  it('moves a row one place up or down', () => {
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the order alone at the edges: the first row cannot go up, the last cannot go down', () => {
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(list, 2, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(list, 5, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem([], 0, 1)).toEqual([]);
  });

  it('returns a new list and never changes the one given', () => {
    const out = moveItem(list, 0, 1);
    expect(out).not.toBe(list);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('displayChanges (only changed rows are sent)', () => {
  const rows = () => displayRows(DISPLAY);

  it('sends nothing when nothing changed, or when a row is moved and moved back', () => {
    const r = rows();
    expect(displayChanges(r.services, r.services)).toEqual([]);
    const back = moveItem(moveItem(r.services, 0, 1), 1, -1);
    expect(displayChanges(r.services, back)).toEqual([]);
  });

  it('a swap of two rows sends just those two, trading their places', () => {
    const r = rows();
    expect(displayChanges(r.services, moveItem(r.services, 1, -1))).toEqual([
      { type: 'SERVICE', code: 'SVC-JET-WASH', displayOrder: 10 },
      { type: 'SERVICE', code: 'SVC-DRY', displayOrder: 20 },
    ]);
  });

  it('hiding a row sends only its shown flag', () => {
    const r = rows();
    const now = r.amcPlans.map((p) => (p.code === 'ORD-4' ? { ...p, isPublic: false } : p));
    expect(displayChanges(r.amcPlans, now)).toEqual([{ type: 'AMC', code: 'ORD-4', isPublic: false }]);
  });

  it('numbers the list again when places are tied (PYS default 100), sending the rows whose place number changes', () => {
    const tied = displayRows({ services: [], amcPlans: [plan('A', 'A', 100), plan('B', 'B', 100), plan('C', 'C', 100)] }).amcPlans;
    expect(displayChanges(tied, moveItem(tied, 2, -1))).toEqual([
      { type: 'AMC', code: 'A', displayOrder: 10 },
      { type: 'AMC', code: 'C', displayOrder: 20 },
      { type: 'AMC', code: 'B', displayOrder: 30 },
    ]);
  });

  it('shows rows in PYS display order', () => {
    const r = displayRows({ services: [svc('B', 'B', 20), svc('A', 'A', 10)], amcPlans: [] });
    expect(r.services.map((s) => s.code)).toEqual(['A', 'B']);
  });
});

describe('checkDisplayItems (mirrors PYS catalogDisplayPatchSchema)', () => {
  it('accepts changed rows only, with PYS keys', () => {
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC-DRY', isPublic: false }])).toEqual({
      ok: true,
      items: [{ type: 'SERVICE', code: 'SVC-DRY', isPublic: false }],
    });
  });

  it('refuses an empty list, unknown keys, bad codes, places out of range and rows with no change', () => {
    expect(checkDisplayItems([]).ok).toBe(false);
    expect(checkDisplayItems('x').ok).toBe(false);
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC-DRY', isPublic: false, price: 1 }]).ok).toBe(false);
    expect(checkDisplayItems([{ type: 'PRODUCT', code: 'SVC-DRY', isPublic: false }]).ok).toBe(false);
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC DRY', isPublic: false }]).ok).toBe(false);
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC-DRY', displayOrder: 100_001 }]).ok).toBe(false);
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC-DRY', displayOrder: 1.5 }]).ok).toBe(false);
    expect(checkDisplayItems([{ type: 'SERVICE', code: 'SVC-DRY' }]).ok).toBe(false);
    expect(checkDisplayItems(Array.from({ length: 201 }, (_, i) => ({ type: 'SERVICE', code: `S-${i}`, isPublic: true }))).ok).toBe(false);
  });
});

/* ---------------------------------------------------------------- saveDisplay (server action) */

describe('saveDisplay', () => {
  const items = [{ type: 'SERVICE', code: 'SVC-JET-WASH', isPublic: false }];

  it('ESS Staff is refused before any PYS call, and nothing is refreshed', async () => {
    me.current = STAFF;
    expect(await saveDisplay(items)).toEqual({ forbidden: true });
    expect(adminRequest).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('sends PYS the changed rows and expires the public catalog at once (updateTag "catalog")', async () => {
    adminRequest.mockResolvedValueOnce(DISPLAY);
    expect(await saveDisplay(items)).toEqual({ ok: true, display: DISPLAY });
    expect(adminRequest).toHaveBeenCalledWith('PATCH', '/catalog-display', { items });
    expect(updateTag).toHaveBeenCalledWith('catalog');
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it('checks the rows again on the server: bad ones never reach PYS', async () => {
    expect(await saveDisplay([{ type: 'SERVICE', code: 'SVC-DRY', isPublic: 'yes' }])).toEqual({ error: DISPLAY_MESSAGES.invalid });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('turns PYS answers into plain words', async () => {
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await saveDisplay(items)).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await saveDisplay(items)).toEqual({ forbidden: true });
    adminRequest.mockRejectedValueOnce(new AdminValidationError({ 'items.0': 'Invalid code' }));
    expect(await saveDisplay(items)).toEqual({ error: DISPLAY_MESSAGES.notSaved });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('a service PYS no longer has (404): says so and still refreshes the catalog (earlier rows may be saved)', async () => {
    adminRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'Service SVC-X not found'));
    expect(await saveDisplay(items)).toEqual({ error: DISPLAY_MESSAGES.gone });
    expect(updateTag).toHaveBeenCalledWith('catalog');
  });
});

/* ---------------------------------------------------------------- the "Services shown" screen */

describe('DisplayEditor', () => {
  const patchCalls = () => adminRequest.mock.calls.filter(([m]) => m === 'PATCH');

  it('lists services and AMC plans in two groups, with the note "Prices are set in PYS."', () => {
    render(<DisplayEditor display={DISPLAY} />);
    expect(screen.getByText('Prices are set in PYS.')).toBeTruthy();
    const services = screen.getByRole('region', { name: 'Services' });
    const plans = screen.getByRole('region', { name: 'AMC plans' });
    expect(within(services).getByText('Jet wash')).toBeTruthy();
    expect(within(plans).getByText('Ordinary AMC (4 visits)')).toBeTruthy();
    expect(within(services).getByRole('switch', { name: 'Show Jet wash on the website' }).getAttribute('aria-checked')).toBe('true');
  });

  it("disables the first row's Up and the last row's Down, in each group", () => {
    render(<DisplayEditor display={DISPLAY} />);
    const btn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
    expect(btn('Move Dry service up').disabled).toBe(true);
    expect(btn('Move Dry service down').disabled).toBe(false);
    expect(btn('Move Foam jet wash down').disabled).toBe(true);
    expect(btn('Move Ordinary AMC (3 visits) up').disabled).toBe(true);
    expect(btn('Move Ordinary AMC (4 visits) down').disabled).toBe(true);
  });

  it('"Save changes" is off until something changes, and back off after undoing', () => {
    render(<DisplayEditor display={DISPLAY} />);
    const save = screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByRole('switch', { name: 'Show Jet wash on the website' }));
    expect(save.disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Undo changes' }));
    expect(save.disabled).toBe(true);
  });

  it('sends only the changed rows, once, however many times Save is pressed', async () => {
    let resolve!: (v: unknown) => void;
    adminRequest.mockImplementation((method) => (method === 'PATCH' ? new Promise((r) => (resolve = r)) : Promise.resolve(undefined)));
    render(<DisplayEditor display={DISPLAY} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Show Jet wash on the website' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Ordinary AMC (4 visits) up' }));
    const save = screen.getByRole('button', { name: 'Save changes' });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(patchCalls()[0][2]).toEqual({
      items: [
        { type: 'SERVICE', code: 'SVC-JET-WASH', isPublic: false },
        { type: 'AMC', code: 'ORD-4', displayOrder: 10 },
        { type: 'AMC', code: 'ORD-3', displayOrder: 20 },
      ],
    });
    const after: AdminCatalogDisplay = {
      services: DISPLAY.services.map((s) => (s.code === 'SVC-JET-WASH' ? { ...s, isPublic: false } : s)),
      amcPlans: [{ ...DISPLAY.amcPlans[1], displayOrder: 10 }, { ...DISPLAY.amcPlans[0], displayOrder: 20 }],
    };
    await act(async () => resolve(after));
    expect(await screen.findByText(DISPLAY_MESSAGES.saved)).toBeTruthy();
    expect(patchCalls()).toHaveLength(1);
    expect(updateTag).toHaveBeenCalledWith('catalog');
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a session that ended mid-use goes back to sign in', async () => {
    adminRequest.mockRejectedValue(new AdminAuthError());
    render(<DisplayEditor display={DISPLAY} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Show Jet wash on the website' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/admin\/login\?expired=1/)));
  });
});

describe('DisplayScreen', () => {
  it('ESS Staff sees "Only an ESS Admin can do this" and no PYS data is read', async () => {
    me.current = STAFF;
    render((await DisplayScreen()) as ReactElement);
    expect(screen.getByText(/Only an ESS Admin can do this/)).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('ESS Admin gets the services and AMC plans from PYS', async () => {
    adminRequest.mockResolvedValueOnce(DISPLAY);
    render((await DisplayScreen()) as ReactElement);
    expect(adminRequest).toHaveBeenCalledWith('GET', '/catalog-display', undefined);
    expect(screen.getByRole('heading', { level: 1, name: 'Services shown' })).toBeTruthy();
    expect(screen.getByText('Jet wash')).toBeTruthy();
  });
});

/* ---------------------------------------------------------------- pincodes */

describe('checkArea (mirrors PYS serviceAreaSchema)', () => {
  const base = { pincodePrefix: '400088', label: 'Trombay', isActive: true, notes: '' };

  it('a prefix with a space, too short, too long or starting with 0: "Use 2–6 digits of the pincode."', () => {
    for (const pincodePrefix of ['40 0', '4', '4000881', '0400', '40a', '']) {
      expect(checkArea({ ...base, pincodePrefix })).toEqual({ ok: false, fields: { pincodePrefix: 'Use 2–6 digits of the pincode.' } });
    }
  });

  it('trims like PYS, and an empty note is null', () => {
    expect(checkArea({ ...base, pincodePrefix: ' 400088 ', label: '  Trombay ' })).toEqual({
      ok: true,
      input: { pincodePrefix: '400088', label: 'Trombay', isActive: true, notes: null },
    });
  });

  it('needs an area name of 2–120 characters and notes up to 300', () => {
    expect(checkArea({ ...base, label: 'T' })).toEqual({ ok: false, fields: { label: AREA_MESSAGES.label } });
    expect(checkArea({ ...base, label: 'x'.repeat(121) })).toEqual({ ok: false, fields: { label: AREA_MESSAGES.label } });
    expect(checkArea({ ...base, notes: 'x'.repeat(301) })).toEqual({ ok: false, fields: { notes: AREA_MESSAGES.notes } });
  });
});

describe('saveArea and removeArea', () => {
  const good = { pincodePrefix: '400088', label: 'Trombay', isActive: true, notes: '' };

  it('ESS Staff is refused before any PYS call', async () => {
    me.current = STAFF;
    expect(await saveArea(good)).toEqual({ forbidden: true });
    expect(await removeArea('400088')).toEqual({ forbidden: true });
    expect(adminRequest).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('a prefix with a space never reaches PYS', async () => {
    expect(await saveArea({ ...good, pincodePrefix: '40 0' })).toEqual({ fields: { pincodePrefix: 'Use 2–6 digits of the pincode.' } });
    expect(await removeArea('40 0')).toEqual({ error: AREA_MESSAGES.prefix });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('saves the clean values and expires the public areas at once (updateTag "areas")', async () => {
    adminRequest.mockResolvedValueOnce({ areas: AREAS });
    expect(await saveArea(good)).toEqual({ ok: true, areas: AREAS });
    expect(adminRequest).toHaveBeenCalledWith('PUT', '/service-areas', { pincodePrefix: '400088', label: 'Trombay', isActive: true, notes: null });
    expect(updateTag).toHaveBeenCalledWith('areas');
  });

  it('removes a prefix and expires the public areas at once', async () => {
    adminRequest.mockResolvedValueOnce({ areas: AREAS.slice(0, 1) });
    expect(await removeArea('400088')).toEqual({ ok: true, areas: AREAS.slice(0, 1) });
    expect(adminRequest).toHaveBeenCalledWith('DELETE', '/service-areas/400088', undefined);
    expect(updateTag).toHaveBeenCalledWith('areas');
  });

  it('maps PYS refusals: 422 to the field, 404 on remove to "already removed"', async () => {
    adminRequest.mockRejectedValueOnce(new AdminValidationError({ pincodePrefix: 'Use 2–6 digits of the pincode' }));
    expect(await saveArea(good)).toEqual({ fields: { pincodePrefix: 'Use 2–6 digits of the pincode.' } });
    adminRequest.mockRejectedValueOnce(new PysError(404, 'NOT_FOUND', 'Service area not found'));
    expect(await removeArea('400088')).toEqual({ error: AREA_MESSAGES.gone });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await saveArea(good)).toEqual({ forbidden: true });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('AreasEditor', () => {
  it('lists the prefixes with their area names and whether they are covered', () => {
    render(<AreasEditor areas={AREAS} />);
    const list = screen.getByRole('list', { name: 'Pincode prefixes' });
    expect(within(list).getByText('Mumbai, Thane & Navi Mumbai')).toBeTruthy();
    expect(within(list).getByText('Not covered')).toBeTruthy();
  });

  it('a prefix with a space shows "Use 2–6 digits of the pincode." and nothing is sent', () => {
    render(<AreasEditor areas={AREAS} />);
    fireEvent.change(screen.getByLabelText('Pincode prefix'), { target: { value: '40 0' } });
    fireEvent.change(screen.getByLabelText('Area name'), { target: { value: 'Somewhere' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add prefix' }));
    expect(screen.getByText('Use 2–6 digits of the pincode.')).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('adds a prefix (one PYS call for a double click) and shows the new list', async () => {
    let resolve!: (v: unknown) => void;
    adminRequest.mockImplementation((method) => (method === 'PUT' ? new Promise((r) => (resolve = r)) : Promise.resolve(undefined)));
    render(<AreasEditor areas={AREAS.slice(0, 1)} />);
    fireEvent.change(screen.getByLabelText('Pincode prefix'), { target: { value: '421' } });
    fireEvent.change(screen.getByLabelText('Area name'), { target: { value: 'Kalyan' } });
    const add = screen.getByRole('button', { name: 'Add prefix' });
    fireEvent.click(add);
    fireEvent.click(add);
    await waitFor(() => expect(adminRequest.mock.calls.filter(([m]) => m === 'PUT')).toHaveLength(1));
    const kalyan = { pincodePrefix: '421', label: 'Kalyan', isActive: true, notes: null, updatedAt: null };
    await act(async () => resolve({ areas: [AREAS[0], kalyan] }));
    expect(await screen.findByText(AREA_MESSAGES.saved)).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Pincode prefixes' })).getByText('Kalyan')).toBeTruthy();
  });

  it('an existing prefix cannot be added twice (use Edit instead)', () => {
    render(<AreasEditor areas={AREAS} />);
    fireEvent.change(screen.getByLabelText('Pincode prefix'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Area name'), { target: { value: 'Mumbai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add prefix' }));
    expect(screen.getByText(AREA_MESSAGES.exists)).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('Remove asks first, on the page; "Keep it" sends nothing, "Yes, remove" sends one DELETE', async () => {
    adminRequest.mockResolvedValue({ areas: AREAS.slice(0, 1) });
    render(<AreasEditor areas={AREAS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove 400088' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(adminRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove 400088' }));
    expect(screen.getByText(/Remove 400088 \(Trombay\)\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove 400088' }));
    await waitFor(() => expect(adminRequest).toHaveBeenCalledWith('DELETE', '/service-areas/400088', undefined));
    expect(await screen.findByText('400088 removed.')).toBeTruthy();
    expect(adminRequest).toHaveBeenCalledTimes(1);
  });

  it('Edit fills the form with the prefix fixed and saves the new name', async () => {
    adminRequest.mockResolvedValue({ areas: AREAS });
    render(<AreasEditor areas={AREAS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit 400088' }));
    const prefix = screen.getByLabelText('Pincode prefix') as HTMLInputElement;
    expect(prefix.value).toBe('400088');
    expect(prefix.readOnly).toBe(true);
    fireEvent.change(screen.getByLabelText('Area name'), { target: { value: 'Trombay and Mankhurd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(adminRequest).toHaveBeenCalledWith('PUT', '/service-areas', { pincodePrefix: '400088', label: 'Trombay and Mankhurd', isActive: false, notes: 'Not served for now' }),
    );
  });
});

describe('AreasScreen', () => {
  it('ESS Staff sees "Only an ESS Admin can do this" and no PYS data is read', async () => {
    me.current = STAFF;
    render((await AreasScreen()) as ReactElement);
    expect(screen.getByText(/Only an ESS Admin can do this/)).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('ESS Admin gets the prefixes from PYS', async () => {
    adminRequest.mockResolvedValueOnce({ areas: AREAS });
    render((await AreasScreen()) as ReactElement);
    expect(adminRequest).toHaveBeenCalledWith('GET', '/service-areas', undefined);
    expect(screen.getByRole('heading', { level: 1, name: 'Pincodes' })).toBeTruthy();
  });
});
