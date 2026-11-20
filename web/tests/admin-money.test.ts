import { describe, expect, it } from 'vitest';
import { MAX_PRICE, parseRupees, priceError } from '@/lib/admin/money';
import { ENQUIRY_TABS, enquiryTab, enquiryTabParam, whatsappHref, telHref } from '@/lib/admin/enquiries';

describe('parseRupees', () => {
  it.each([
    ['40500', 40500],
    ['40,500', 40500],
    ['₹40,500', 40500],
    ['₹ 40,500', 40500],
    ['1,50,000.50', 150000.5],
    ['40500.5', 40500.5],
    ['  98,500  ', 98500],
    ['150,000', 150000],
    ['40,500/-', 40500],
    ['Rs. 40,500', 40500],
    ['1,00,00,000', 10_000_000],
  ])('accepts %s', (input, value) => {
    expect(parseRupees(input)).toBe(value);
  });

  it.each([
    ['0'],
    ['0.00'],
    ['-40500'],
    ['−40500'],
    ['abc'],
    [''],
    ['   '],
    ['1,00,00,000.01'],
    ['10000001'],
    ['2 crore'],
    ['40,5,00'],
    [',40500'],
    ['40500.'],
    ['40500.555'],
    ['4e4'],
    ['Infinity'],
    ['0x10'],
  ])('refuses %s', (input) => {
    expect(parseRupees(input)).toBeNull();
  });

  it('caps at 1 crore (the PYS limit)', () => {
    expect(MAX_PRICE).toBe(10_000_000);
  });

  it('says in plain words what is wrong with a price', () => {
    expect(priceError('40,500')).toBeNull();
    expect(priceError('abc')).toBe('Enter the price per AC, e.g. 40,500.');
    expect(priceError('')).toBe('Enter the price per AC, e.g. 40,500.');
    expect(priceError('0')).toBe('Enter the price per AC, e.g. 40,500.');
    expect(priceError('2,00,00,000')).toBe('The price can be at most ₹1,00,00,000 per AC.');
  });
});

describe('AC enquiry tabs', () => {
  it('groups PYS line statuses into the three tabs', () => {
    expect(ENQUIRY_TABS.map((t) => [t.key, t.statuses])).toEqual([
      ['waiting', ['QUOTE_PENDING']],
      ['sent', ['QUOTED']],
      ['closed', ['FULFILLED', 'CANCELLED']],
    ]);
    expect(enquiryTab('QUOTE_PENDING')).toBe('waiting');
    expect(enquiryTab('QUOTED')).toBe('sent');
    expect(enquiryTab('FULFILLED')).toBe('closed');
    expect(enquiryTab('CANCELLED')).toBe('closed');
    expect(enquiryTab('PENDING')).toBeNull();
  });

  it('reads the tab from the address; anything unknown is "waiting"', () => {
    expect(enquiryTabParam('sent')).toBe('sent');
    expect(enquiryTabParam(['closed', 'sent'])).toBe('closed');
    expect(enquiryTabParam('nope')).toBe('waiting');
    expect(enquiryTabParam(undefined)).toBe('waiting');
  });
});

describe('customer contact links', () => {
  it('builds WhatsApp and call links from a 10-digit Indian mobile number', () => {
    expect(whatsappHref('9876543210')).toBe('https://wa.me/919876543210');
    expect(whatsappHref('+91 98765 43210')).toBe('https://wa.me/919876543210');
    expect(whatsappHref('098765-43210')).toBe('https://wa.me/919876543210');
    expect(telHref('98765 43210')).toBe('tel:+919876543210');
  });

  it('gives no WhatsApp link for a number that is not an Indian mobile', () => {
    expect(whatsappHref('12345')).toBeNull();
    expect(whatsappHref('022 2525 1234')).toBeNull();
    expect(whatsappHref('')).toBeNull();
  });

  it('still lets staff call a number that is not a mobile, digits only', () => {
    expect(telHref('022-2525-1234')).toBe('tel:02225251234');
    expect(telHref('abc')).toBeNull();
  });
});
