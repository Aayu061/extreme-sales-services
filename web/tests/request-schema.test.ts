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

  it('refuses ACs in a booking (ACs are enquired about) and tidies the mobile', () => {
    expect(requestSchema.safeParse({ ...base, kind: 'BASKET', items: [{ type: 'PRODUCT', ref: 'p1', quantity: 1 }], address }).success).toBe(false);
    const r = requestSchema.parse({ ...base, kind: 'BASKET', items: [{ type: 'SERVICE', ref: 'SVC-GAS', quantity: 1 }], address });
    expect(r.contact.phone).toBe('9876543210');
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

describe('AC enquiry', () => {
  const enquiry = { ...base, kind: 'PRODUCT_ENQUIRY', city: 'Thane', items: [{ type: 'PRODUCT', ref: 'p1', quantity: 2, notes: 'Installation needed' }, { type: 'PRODUCT', ref: 'p2', quantity: 1 }] };

  it('accepts several ACs and only ACs, up to 10', () => {
    expect(requestSchema.safeParse(enquiry).success).toBe(true);
    expect(requestSchema.safeParse({ ...enquiry, items: [{ type: 'SERVICE', ref: 'SVC-GAS', quantity: 1 }] }).success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => ({ type: 'PRODUCT', ref: `p${i}`, quantity: 1 }));
    expect(fieldErrors(requestSchema.safeParse({ ...enquiry, items: eleven }).error!.issues).items).toBe('An enquiry can have up to 10 ACs.');
  });

  it('builds the PYS enquiry body with the delivery area', () => {
    const body = toPysIntake(requestSchema.parse({ ...enquiry, area: 'Vashi Sector 17', pincode: '400703', message: 'Need it this week' }), undefined) as Record<string, any>;
    expect(body.kind).toBe('PRODUCT_ENQUIRY');
    expect(body.items).toEqual([
      { type: 'PRODUCT', productId: 'p1', quantity: 2, notes: 'Installation needed' },
      { type: 'PRODUCT', productId: 'p2', quantity: 1 },
    ]);
    expect(body.address).toEqual({ line: 'Vashi Sector 17', city: 'Thane', pincode: '400703' });
    expect(body.request).toEqual({ message: 'Need it this week' });
  });

  it('puts the city in the message when no area is given', () => {
    const body = toPysIntake(requestSchema.parse(enquiry), undefined) as Record<string, any>;
    expect(body.address).toBeUndefined();
    expect(body.request.message).toBe('City: Thane');
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
