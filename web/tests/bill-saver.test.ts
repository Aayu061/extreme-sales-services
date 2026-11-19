import { describe, expect, it } from 'vitest';
import { billEstimate } from '@/lib/bill-saver';

describe('billEstimate', () => {
  it('gives the rough monthly bill now, after a service and with a new 5-star inverter', () => {
    expect(billEstimate({ tonnage: 1.5, age: 'mid', hoursPerDay: 8, tariff: 10 })).toEqual({ now: 3560, afterService: 3210, newInverter: 1980 });
  });

  it('treats 0 hours as 1 hour a day', () => {
    expect(billEstimate({ tonnage: 1, age: 'new', hoursPerDay: 0, tariff: 10 })).toEqual(billEstimate({ tonnage: 1, age: 'new', hoursPerDay: 1, tariff: 10 }));
  });

  it('always shows the new inverter as cheapest and the serviced AC cheaper than now', () => {
    for (const age of ['new', 'mid', 'old'] as const) {
      const e = billEstimate({ tonnage: 2, age, hoursPerDay: 10, tariff: 9 });
      expect(e.newInverter).toBeLessThan(e.afterService);
      expect(e.afterService).toBeLessThan(e.now);
    }
  });
});
