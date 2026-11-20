import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: PYS (adminRequest) and Next's revalidatePath ----

const adminRequest = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>(async () => ({ lineId: 'x', status: 'QUOTED' }));
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string, body?: unknown) => adminRequest(method, path, body),
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import { closeEnquiry, sendPrice } from '@/app/admin/actions/enquiries';

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const ALREADY = 'This enquiry was already updated. Refresh to see the latest.';
const UNREACHABLE = "We couldn't reach PYS. It may be waking up — try again in a minute.";

beforeEach(() => {
  adminRequest.mockReset();
  adminRequest.mockImplementation(async () => ({ lineId: 'x', status: 'QUOTED' }));
  revalidatePath.mockClear();
});

describe('sendPrice', () => {
  it('parses the price again on the server and sends PYS rupees per AC, with the note', async () => {
    const r = await sendPrice('line-1-1', {}, form({ total: '₹1,50,000.50', note: '  Includes installation.  ' }));
    expect(r).toEqual({ ok: true });
    expect(adminRequest).toHaveBeenCalledTimes(1);
    expect(adminRequest).toHaveBeenCalledWith('POST', '/enquiries/line-1-1/quote', { total: 150000.5, note: 'Includes installation.' });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/enquiries');
  });

  it('sends no note as null', async () => {
    await sendPrice('line-1-1', {}, form({ total: '40500', note: '   ' }));
    expect(adminRequest).toHaveBeenCalledWith('POST', '/enquiries/line-1-1/quote', { total: 40500, note: null });
    adminRequest.mockClear();
    await sendPrice('line-1-1', {}, form({ total: '40500' }));
    expect(adminRequest).toHaveBeenCalledWith('POST', '/enquiries/line-1-1/quote', { total: 40500, note: null });
  });

  it.each([['abc'], [''], ['0'], ['-5'], ['2,00,00,000']])('refuses the price %s without asking PYS', async (total) => {
    const r = await sendPrice('line-1-1', {}, form({ total }));
    expect(r.fields?.total).toMatch(/^(Enter the price per AC, e\.g\. 40,500\.|The price can be at most ₹1,00,00,000 per AC\.)$/);
    expect(adminRequest).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('refuses a note over 1,000 characters without asking PYS', async () => {
    const r = await sendPrice('line-1-1', {}, form({ total: '40500', note: 'x'.repeat(1001) }));
    expect(r).toEqual({ fields: { note: 'Keep the note to 1,000 characters or fewer.' } });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('refuses a missing or overlong line id, and keeps an odd one inside its part of the PYS path', async () => {
    expect((await sendPrice('', {}, form({ total: '40500' }))).error).toBeTruthy();
    expect((await sendPrice('x'.repeat(101), {}, form({ total: '40500' }))).error).toBeTruthy();
    expect((await sendPrice(42 as unknown as string, {}, form({ total: '40500' }))).error).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
    await sendPrice('a/../b?c', {}, form({ total: '40500' }));
    expect(adminRequest).toHaveBeenCalledWith('POST', '/enquiries/a%2F..%2Fb%3Fc/quote', { total: 40500, note: null });
  });

  it('returns { authError } when the session has ended (no redirect from inside the action)', async () => {
    adminRequest.mockRejectedValue(new AdminAuthError());
    expect(await sendPrice('line-1-1', {}, form({ total: '40500' }))).toEqual({ authError: true });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns { forbidden } when the person has no access', async () => {
    adminRequest.mockRejectedValue(new AdminForbiddenError());
    expect(await sendPrice('line-1-1', {}, form({ total: '40500' }))).toEqual({ forbidden: true });
  });

  it('puts PYS field messages on the price and note boxes, in plain words', async () => {
    adminRequest.mockRejectedValue(new AdminValidationError({ total: 'Too big: expected number to be <=10000000', note: 'Too big' }));
    expect(await sendPrice('line-1-1', {}, form({ total: '40500' }))).toEqual({
      fields: { total: 'Enter the price per AC, e.g. 40,500.', note: 'Keep the note to 1,000 characters or fewer.' },
    });
    adminRequest.mockRejectedValue(new AdminValidationError({ lineId: 'Too big' }));
    expect((await sendPrice('line-1-1', {}, form({ total: '40500' }))).error).toBe('Please check the price and note, then try again.');
  });

  it('says the enquiry was already updated (PYS 409) and refreshes the list', async () => {
    adminRequest.mockRejectedValue(new PysError(409, 'CONFLICT', 'This enquiry is not approved yet or is already closed.'));
    expect(await sendPrice('line-1-1', {}, form({ total: '40500' }))).toEqual({ conflict: true, error: ALREADY });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/enquiries');
  });

  it('says the enquiry is gone (PYS 404) and refreshes the list', async () => {
    adminRequest.mockRejectedValue(new PysError(404, 'NOT_FOUND', 'Enquiry not found'));
    expect(await sendPrice('line-1-1', {}, form({ total: '40500' }))).toEqual({
      conflict: true,
      error: "We couldn't find this enquiry any more. Refresh to see the latest.",
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/enquiries');
  });

  it('says PYS could not be reached, logging only the status', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    adminRequest.mockRejectedValue(new PysError(503, 'PYS_UNREACHABLE', 'Priya Shah 9876543210'));
    expect(await sendPrice('line-1-1', {}, form({ total: '40500', note: 'Call Priya' }))).toEqual({ error: UNREACHABLE });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('503');
    expect(logged).not.toMatch(/Priya|9876543210|40500/);
    log.mockRestore();
  });
});

describe('closeEnquiry', () => {
  it.each([
    ['SOLD' as const],
    ['NOT_TAKEN' as const],
  ])('marks the line %s in PYS and refreshes the list', async (result) => {
    expect(await closeEnquiry('line-2-1', result)).toEqual({ ok: true });
    expect(adminRequest).toHaveBeenCalledWith('POST', '/enquiries/line-2-1/close', { result });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/enquiries');
  });

  it('refuses any other result without asking PYS', async () => {
    expect((await closeEnquiry('line-2-1', 'MAYBE' as 'SOLD')).error).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('returns the same flags as sendPrice', async () => {
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await closeEnquiry('line-2-1', 'SOLD')).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await closeEnquiry('line-2-1', 'SOLD')).toEqual({ forbidden: true });
    adminRequest.mockRejectedValueOnce(new PysError(409, 'CONFLICT', 'closed'));
    expect(await closeEnquiry('line-2-1', 'SOLD')).toEqual({ conflict: true, error: ALREADY });
  });
});
