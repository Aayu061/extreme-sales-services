import { z } from 'zod';
import { PRIVACY_NOTICE_VERSION } from '@/lib/notice-version';

/**
 * Rules for every form that sends something to ESS (book, contact, sell). The browser checks
 * them first to show friendly messages; the server checks them again before calling PYS. Limits
 * match PYS's createIntakeSchema (server/src/validators/intake.validator.ts in the PYS repo).
 */

/** S12 / E1: the built-in privacy notice version (notice-version.ts). Requests record the version the visitor was shown. */
export const NOTICE_VERSION = PRIVACY_NOTICE_VERSION;

/** "+91 98765 43210", "098765-43210", "919876543210" → "9876543210"; anything else → null. */
export function normalizeIndianMobile(v: string): string | null {
  let d = (v ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Today's date (YYYY-MM-DD) in India. */
export function todayIst(now = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optText = (max: number, message: string) => z.preprocess(blank, z.string().trim().max(max, message).optional());
const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const mobile = z
  .string({ message: 'Enter a valid 10-digit mobile number.' })
  .max(20, 'Enter a valid 10-digit mobile number.')
  .transform((v, ctx) => {
    const n = normalizeIndianMobile(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit mobile number.' });
      return z.NEVER;
    }
    return n;
  });

const common = {
  ref: z.string().regex(/^[A-Za-z0-9_.:-]{8,200}$/, 'Please reload the page and try again.'),
  contact: z.object({
    name: z.string({ message: 'Enter your name.' }).trim().min(2, 'Enter your name.').max(120, 'Name is too long.'),
    phone: mobile,
    email: z.preprocess(blank, z.string().trim().toLowerCase().max(254).email('Enter a valid email or leave it empty.').optional()),
  }),
  consent: z.object({
    privacy: z.literal(true, { message: 'Please tick this box so we can handle your request.' }),
    marketing: z.boolean().default(false),
  }),
  hp: z.string().max(500).default(''),
  elapsedMs: z.number().int().min(0).max(86_400_000).default(0),
};

export const AC_TYPES = ['SPLIT', 'WINDOW', 'CASSETTE', 'TOWER', 'UNKNOWN'] as const;
export const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

const item = z.object({
  type: z.enum(['SERVICE', 'AMC']),
  ref: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  ac: z
    .object({
      type: z.enum(AC_TYPES).optional(),
      tonnage: z.number().positive().max(50).optional(),
    })
    .optional(),
});

/** One AC in an enquiry; notes carry e.g. "Installation needed". */
const acItem = z.object({
  type: z.literal('PRODUCT'),
  ref: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  notes: optText(500, 'Note is too long.'),
});

const basket = z
  .object({
    kind: z.literal('BASKET'),
    ...common,
    items: z.array(item).min(1, 'Your request is empty.').max(30, 'A request can have up to 30 items.'),
    address: z
      .object({
        line: z.string({ message: 'Enter your flat, building and street.' }).trim().min(3, 'Enter your flat, building and street.').max(300),
        area: optText(120, 'Area is too long.'),
        landmark: optText(120, 'Landmark is too long.'),
        city: z.string({ message: 'Enter your city.' }).trim().min(2, 'Enter your city.').max(80),
        pincode: z.preprocess(blank, z.string().trim().regex(/^[1-9]\d{5}$/, 'Pincode is 6 digits.').optional()),
      })
      .optional(),
    when: z
      .object({
        date: z.preprocess(
          blank,
          z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.')
            .refine(isRealDate, 'Choose a date.')
            .refine((d) => d >= todayIst(), 'Choose today or a later date.')
            .optional(),
        ),
        slot: z.enum(SLOTS).optional(),
      })
      .optional(),
    message: optText(2000, 'Keep the note under 2000 characters.'),
  })
  .superRefine((v, ctx) => {
    // Every booking leads to a visit, so it needs the address.
    if (!v.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter the address for the visit.' });
    }
  });

const contact = z.object({
  kind: z.literal('CONTACT'),
  ...common,
  message: z.string({ message: 'Write a short message.' }).trim().min(5, 'Write a short message (at least 5 characters).').max(2000, 'Keep the message under 2000 characters.'),
});

const seller = z.object({
  kind: z.literal('SELLER_INTEREST'),
  ...common,
  business: z.object({
    name: z.string({ message: 'Enter your business name.' }).trim().min(2, 'Enter your business name.').max(120),
    city: z.string({ message: 'Enter your city.' }).trim().min(2, 'Enter your city.').max(80),
    gstin: z.preprocess(
      (v) => (typeof v === 'string' ? (v.trim() === '' ? undefined : v.trim().toUpperCase()) : v),
      z.string().regex(/^[0-9A-Z]{15}$/, 'GSTIN has 15 letters and digits.').optional(),
    ),
    sells: z.string({ message: 'Tell us what you sell.' }).trim().min(2, 'Tell us what you sell.').max(300),
  }),
  // PYS takes 2000 characters in total; the business details use up to ~560 of them.
  message: optText(1400, 'Keep the message under 1400 characters.'),
});

const enquiry = z.object({
  kind: z.literal('PRODUCT_ENQUIRY'),
  ...common,
  items: z.array(acItem).min(1, 'Your enquiry is empty.').max(10, 'An enquiry can have up to 10 ACs.'),
  area: optText(300, 'Area is too long.'),
  city: z.string({ message: 'Enter your city.' }).trim().min(2, 'Enter your city.').max(80),
  pincode: z.preprocess(blank, z.string().trim().regex(/^[1-9]\d{5}$/, 'Pincode is 6 digits.').optional()),
  message: optText(1900, 'Keep the message under 1900 characters.'),
});

export const requestSchema = z.discriminatedUnion('kind', [basket, enquiry, contact, seller]);
export type SiteRequest = z.infer<typeof requestSchema>;
/** What the browser fills in (before the phone is tidied). */
export type SiteRequestInput = z.input<typeof requestSchema>;

/** Field path → first message, e.g. { 'contact.phone': 'Enter a valid…' }. */
export function fieldErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join('.') || '_';
    out[key] ??= i.message;
  }
  return out;
}

const REF_FIELD = { SERVICE: 'serviceCode', AMC: 'amcPlanCode', PRODUCT: 'productId' } as const;

/** The body PYS expects on POST /api/v1/ess/intakes. */
export function toPysIntake(r: SiteRequest, clientIpHash: string | undefined, noticeVersion: string = NOTICE_VERSION): Record<string, unknown> {
  let message: string | undefined;
  const request: Record<string, unknown> = {};
  const body: Record<string, unknown> = {
    kind: r.kind,
    externalReferenceId: r.ref,
    contact: r.contact,
    consent: { privacy: true, marketing: r.consent.marketing, noticeVersion },
    meta: { clientIpHash, honeypot: r.hp, elapsedMs: r.elapsedMs },
  };
  if (r.kind === 'BASKET') {
    body.items = r.items.map((i) => ({ type: i.type, [REF_FIELD[i.type]]: i.ref, quantity: i.quantity, ...(i.ac && (i.ac.type || i.ac.tonnage) ? { ac: i.ac } : {}) }));
    if (r.address) body.address = r.address;
    if (r.when?.date) request.preferredDate = r.when.date;
    if (r.when?.slot) request.preferredSlot = r.when.slot;
    message = r.message;
  } else if (r.kind === 'PRODUCT_ENQUIRY') {
    body.items = r.items.map((i) => ({ type: 'PRODUCT', productId: i.ref, quantity: i.quantity, ...(i.notes ? { notes: i.notes } : {}) }));
    // PYS needs a street line for an address; without an area the city goes in the message.
    if (r.area && r.area.length >= 3) body.address = { line: r.area, city: r.city, ...(r.pincode ? { pincode: r.pincode } : {}) };
    message = [!body.address ? `City: ${r.city}` : null, r.message].filter(Boolean).join('\n\n') || undefined;
  } else if (r.kind === 'CONTACT') {
    message = r.message;
  } else {
    const b = r.business;
    message = `Business: ${b.name}\nCity: ${b.city}\nGSTIN: ${b.gstin ?? 'not given'}\nSells: ${b.sells}${r.message ? `\n\n${r.message}` : ''}`;
  }
  if (message) request.message = message;
  if (Object.keys(request).length) body.request = request;
  return body;
}
