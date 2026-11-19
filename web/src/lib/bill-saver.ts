/**
 * Bill saver: a rough, conservative estimate of an AC's monthly electricity cost now, after a
 * service, and with a new 5-star inverter AC. Every assumption is shown to the customer.
 */
export const BILL_ASSUMPTIONS = {
  /** Average power per ton of an ordinary AC while it runs (compressor cycles on and off). */
  kwPerTonNow: 0.9,
  /** Older ACs use more. */
  ageFactor: { new: 1, mid: 1.1, old: 1.2 },
  /** A clean coil and filter: about 10 % less. */
  afterServiceSaving: 0.1,
  kwPerTonNewInverter: 0.55,
  daysPerMonth: 30,
  /** ₹ per unit; the customer can change it to the rate on their bill. */
  defaultTariff: 10,
} as const;

export type AcAge = keyof typeof BILL_ASSUMPTIONS.ageFactor;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const to10 = (v: number) => Math.round(v / 10) * 10;

export function billEstimate(input: { tonnage: 1 | 1.5 | 2; age: AcAge; hoursPerDay: number; tariff: number }): {
  now: number;
  afterService: number;
  newInverter: number;
} {
  const a = BILL_ASSUMPTIONS;
  const hours = clamp(input.hoursPerDay, 1, 24);
  const tariff = clamp(input.tariff, 1, 30);
  const units = (kwPerTon: number) => input.tonnage * kwPerTon * hours * a.daysPerMonth;
  const now = units(a.kwPerTonNow * a.ageFactor[input.age]) * tariff;
  return {
    now: to10(now),
    afterService: to10(now * (1 - a.afterServiceSaving)),
    newInverter: to10(units(a.kwPerTonNewInverter) * tariff),
  };
}
