import type { BusinessIdentity } from '@/lib/pys/types';

/**
 * Privacy notice and terms. The text published in ESS admin (content blocks legal.privacy /
 * legal.terms) is used when it is complete; until then the built-in wording below is shown.
 * Placeholders like {email} are filled from the business details. Only confirmed facts appear.
 */

export type LegalDoc = 'privacy' | 'terms';

export interface LegalBody {
  title: string;
  updatedOn: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

const DEFAULT_UPDATED = '2026-11-19';

const DEFAULTS: Record<LegalDoc, LegalBody> = {
  privacy: {
    title: 'Privacy notice',
    updatedOn: DEFAULT_UPDATED,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: ['{legalName}, {address}, handles the details you share on this website. You can reach us at {email} or {phone}.'],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'When you send a request or a message we collect your name, mobile number and (if you give it) email; the address for a visit; details about your AC such as type, size and brand; your preferred date and time; and any note you write.',
          'We also keep a one-way fingerprint of your internet address to stop misuse of the forms and of request tracking. We never store the address itself.',
        ],
      },
      {
        heading: 'Why we use it',
        paragraphs: [
          'Only to handle your request: to call or message you, plan and carry out the visit, prepare quotes and invoices, and send you updates about that request.',
          'If you tick the box for reminders and offers, we may also send service reminders and offers by WhatsApp or email. You can ask us to stop at any time.',
          'We do not sell your details.',
        ],
      },
      {
        heading: 'Who can see it',
        paragraphs: [
          'Our staff and the technician who visits you. If you ask about an AC sold by another seller, that seller receives the details needed to answer you.',
          'Our service providers who host our systems and send our messages process the data only for us.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: ['As long as needed to provide the service and for as long as tax and accounting law requires us to keep invoices and records.'],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          'Your request list (what you added before sending) and your day/night choice are saved in your own browser so they are still there when you come back. They stay on your device and you can clear them in your browser settings.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Under the Digital Personal Data Protection Act, 2023 you can ask to see the personal data we hold about you, correct it, or have it erased, and you can withdraw your consent. To do so, or to raise a complaint, contact {grievanceName} at {grievanceEmail} or {grievancePhone}.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms',
    updatedOn: DEFAULT_UPDATED,
    sections: [
      {
        heading: 'About these terms',
        paragraphs: ['These terms apply to requests made on this website to {legalName}, {address}.'],
      },
      {
        heading: 'Prices',
        paragraphs: [
          'Prices on this website include GST and come from our current price list. Repairs are priced after a diagnosis visit, and we tell you the price before any extra work.',
          'Sending a request is not a payment and does not confirm a booking: we call you to confirm the visit, the date and the price.',
        ],
      },
      {
        heading: 'Visits',
        paragraphs: ['Your preferred date and time help us plan; the visit is fixed when we confirm it with you. Please make sure someone is at home and the AC can be reached safely.'],
      },
      {
        heading: 'Our warranty',
        paragraphs: ['We give a {warrantyDays}-day warranty on our work, counted from the day the work is done. Contact us if the same problem comes back within that time.'],
      },
      {
        heading: 'AMC plans',
        paragraphs: ['An AMC covers the visits and items listed for the plan you choose, per AC, for one year. Anything not listed is quoted separately before the work is done.'],
      },
      {
        heading: 'New ACs',
        paragraphs: ['Each AC is sold by the seller named on its page, with the warranty and return policy shown there. Prices and stock are confirmed when we call you.'],
      },
      {
        heading: 'Complaints',
        paragraphs: ['Contact {grievanceName} at {grievanceEmail} or {grievancePhone}. These terms are governed by Indian law, and the courts in Mumbai have jurisdiction.'],
      },
    ],
  },
};

function isLegalBody(v: unknown): v is LegalBody {
  if (!v || typeof v !== 'object') return false;
  const b = v as Partial<LegalBody>;
  return (
    typeof b.title === 'string' &&
    b.title.trim() !== '' &&
    Array.isArray(b.sections) &&
    b.sections.length > 0 &&
    b.sections.every((s) => s && typeof s.heading === 'string' && Array.isArray(s.paragraphs) && s.paragraphs.every((p) => typeof p === 'string'))
  );
}

export function legalBody(doc: LegalDoc, block: unknown, identity: BusinessIdentity): LegalBody {
  const source = isLegalBody(block) ? block : DEFAULTS[doc];
  const g = identity.grievanceOfficer;
  const values: Record<string, string> = {
    legalName: identity.legalName,
    email: identity.email,
    phone: identity.phone,
    address: identity.address,
    warrantyDays: String(identity.warrantyDays),
    grievanceName: g.name ?? 'our grievance officer',
    grievanceEmail: g.email ?? identity.email,
    grievancePhone: g.phone ?? identity.phone,
  };
  const fill = (t: string) => t.replace(/\{([a-zA-Z]+)\}/g, (m, k: string) => values[k] ?? m);
  return {
    title: source.title,
    updatedOn: typeof source.updatedOn === 'string' && source.updatedOn ? source.updatedOn : DEFAULT_UPDATED,
    sections: source.sections.map((s) => ({ heading: fill(s.heading), paragraphs: s.paragraphs.map(fill) })),
  };
}
