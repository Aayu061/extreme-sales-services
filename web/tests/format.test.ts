import { describe, it, expect } from 'vitest';
import { formatDate, formatInr, gstBreakupText, lowestTotal, servicePriceText } from '@/lib/format';

describe('price and date formatting', () => {
  it('formats rupees Indian-style, with paise only when needed', () => {
    expect(formatInr(1199)).toBe('₹1,199');
    expect(formatInr(141482.5)).toBe('₹1,41,482.50');
  });

  it('reads service prices the way customers expect', () => {
    const price = { base: 1199, gstRatePercent: 18, gst: 215.82, total: 1414.82 };
    expect(servicePriceText({ pricingModel: 'FIXED', price })).toBe('₹1,414.82');
    expect(servicePriceText({ pricingModel: 'FROM', price })).toBe('From ₹1,414.82');
    expect(servicePriceText({ pricingModel: 'QUOTE_AFTER_DIAGNOSIS', price: null })).toBe('Price after inspection');
    expect(gstBreakupText(price)).toBe('₹1,199 + ₹215.82 GST (18%)');
    expect(gstBreakupText({ base: 1500, gstRatePercent: 0, gst: 0, total: 1500 })).toBe('₹1,500 (no GST)');
  });

  it('finds the lowest total and formats dates in India time', () => {
    expect(lowestTotal([null, { base: 1, gstRatePercent: 0, gst: 0, total: 900 }, { base: 1, gstRatePercent: 0, gst: 0, total: 450 }])).toBe(450);
    expect(lowestTotal([null])).toBeNull();
    expect(formatDate('2026-11-25')).toBe('Wed, 25 Nov 2026');
    expect(formatDate(null)).toBeNull();
  });
});
