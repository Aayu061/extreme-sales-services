/* eslint-disable @typescript-eslint/no-explicit-any -- reading parsed request bodies */
import { describe, expect, it } from 'vitest';
import { fieldErrors, normalizeIndianMobile, requestSchema, todayIst, toPysIntake } from '@/lib/request-schema';

const base = {
  ref: 'web-test-0001',
  contact: { name: 'Asha Rao', phone: '98765 43210' },
  consent: { privacy: true, marketing: false },
  hp: '',
  elapsedMs: 12000,
};
const address = { line: '12 Sea View, Chembur', city: 'Mumbai', pincode: '400071' };
const shiftDay = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

describe('normalizeIndianMobile', () => {
  it('accepts the usual ways people type an Indian mobile', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobile('098765-43210')).toBe('9876543210');
    expect(normalizeIndianMobile('919876543210')).toBe('9876543210');
  });
  it('refuses numbers that are not Indian mobiles', () => {
    expect(normalizeIndianMobile('12345')).toBeNull();
    expect(normalizeIndianMobile('5876543210')).toBeNull();
  });
});

describe('requestSchema', () => {
  it('needs an address when a visit is involved', () => {
    const r = requestSchema.safeParse({ ...base, kind: 'BASKET', items: [{ type: 'SERVICE', ref: 'SVC-GAS', quantity: 1 }] });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues).address).toBeTruthy();
  });

  it('does not need an address for ACs only', () => {
    const r = requestSchema.safeParse({ ...base, kind: 'BASKET', items: [{ type: 'PRODUCT', ref: 'p1', quantity: 1 }] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contact.phone).toBe('9876543210');
  });

  it('refuses a preferred date in the past (India time)', () => {
    const r = requestSchema.safeParse({
      ...base,
      kind: 'BASKET',
      items: [{ type: 'SERVICE', ref: 'SVC-GAS', quantity: 1 }],
      address,
      when: { date: shiftDay(todayIst(), -1) },
    });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues)['when.date']).toBe('Choose today or a later date.');
  });

  it('needs a real message on the contact form', () => {
    const r = requestSchema.safeParse({ ...base, kind: 'CONTACT', message: 'hey' });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues).message).toBeTruthy();
  });

  it('shows a friendly phone error', () => {
    const r = requestSchema.safeParse({ ...base, contact: { name: 'Asha', phone: '12345' }, kind: 'CONTACT', message: 'Please call me back' });
    expect(fieldErrors(r.error!.issues)['contact.phone']).toBe('Enter a valid 10-digit mobile number.');
  });
});

describe('seller message length', () => {
  it('keeps the whole dealer message within what PYS accepts', () => {
    const r = requestSchema.safeParse({ ...base, kind: 'SELLER_INTEREST', business: { name: 'Cool Traders', city: 'Thane', sells: 'ACs' }, message: 'x'.repeat(1401) });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues).message).toBeTruthy();
    const ok = requestSchema.parse({
      ...base,
      kind: 'SELLER_INTEREST',
      business: { name: 'x'.repeat(120), city: 'y'.repeat(80), gstin: '27ABCDE1234F1Z5', sells: 'z'.repeat(300) },
      message: 'm'.repeat(1400),
    });
    expect(((toPysIntake(ok, undefined) as Record<string, any>).request.message as string).length).toBeLessThanOrEqual(2000);
  });
});

describe('toPysIntake', () => {
  it('builds the PYS basket body', () => {
    const r = requestSchema.parse({
      ...base,
      kind: 'BASKET',
      items: [{ type: 'AMC', ref: 'ORD-4', quantity: 1, ac: { type: 'SPLIT', tonnage: 1.5 } }],
      address,
      when: { date: todayIst(), slot: 'MORNING' },
    });
    const body = toPysIntake(r, 'a'.repeat(64)) as Record<string, any>;
    expect(body.kind).toBe('BASKET');
    expect(body.externalReferenceId).toBe('web-test-0001');
    expect(body.items).toEqual([{ type: 'AMC', amcPlanCode: 'ORD-4', quantity: 1, ac: { type: 'SPLIT', tonnage: 1.5 } }]);
    expect(body.request).toEqual({ preferredDate: todayIst(), preferredSlot: 'MORNING' });
    expect(body.consent).toEqual({ privacy: true, marketing: false, noticeVersion: '2026-11-19' });
    expect(body.meta).toEqual({ clientIpHash: 'a'.repeat(64), honeypot: '', elapsedMs: 12000 });
  });

  it('writes the dealer details into the message', () => {
    const r = requestSchema.parse({
      ...base,
      kind: 'SELLER_INTEREST',
      business: { name: 'Cool Traders', city: 'Thane', gstin: '27abcde1234f1z5', sells: 'Split ACs' },
      message: 'We stock Voltas.',
    });
    const body = toPysIntake(r, undefined) as Record<string, any>;
    expect(body.request.message).toBe('Business: Cool Traders\nCity: Thane\nGSTIN: 27ABCDE1234F1Z5\nSells: Split ACs\n\nWe stock Voltas.');
    expect(body.meta.clientIpHash).toBeUndefined();
  });
});
