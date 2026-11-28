import type { BusinessIdentity } from '@/lib/pys/types';
import { PRIVACY_NOTICE_VERSION } from '@/lib/notice-version';

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

const DEFAULT_UPDATED = '2026-11-27';

export { PRIVACY_NOTICE_VERSION };

/**
 * The version of the privacy notice a visitor is shown right now: the "Last updated" date of the text published
 * in ESS admin when one is complete, else the built-in version. Recorded with each request's consent.
 */
export function privacyNoticeVersion(publishedBlock: unknown): string {
  return isLegalBody(publishedBlock) && typeof publishedBlock.updatedOn === 'string' && publishedBlock.updatedOn
    ? publishedBlock.updatedOn
    : PRIVACY_NOTICE_VERSION;
}

/** The {placeholders} legal text may use; each is filled from the business details. */
export const LEGAL_PLACEHOLDERS = ['legalName', 'email', 'phone', 'address', 'warrantyDays', 'grievanceName', 'grievanceEmail', 'grievancePhone'] as const;

/** The built-in wording, shown until a complete text is published in ESS admin. */
export const LEGAL_DEFAULTS: Readonly<Record<LegalDoc, LegalBody>> = {
  privacy: {
    title: 'Privacy notice',
    updatedOn: PRIVACY_NOTICE_VERSION,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: ['{legalName}, {address}, handles the details you share on this website and the records we keep when you are our customer. You can reach us at {email} or {phone}.'],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'When you send a request or a message, we collect your name, mobile number and (if you give it) email; the address for a visit; details about your AC such as type, size and brand; your preferred date and time; and any note you write.',
          'To stop misuse of our forms, of request tracking and of sign-in, our website turns your internet (IP) address into a one-way fingerprint before sending it to our systems. We do not store the internet address itself. The fingerprint is kept as described under "How long we keep it".',
          'When you are our customer, we also keep the details of your ACs, AMC contracts, visits, service reports, bills and payments so that we can look after your ACs and answer your questions.',
        ],
      },
      {
        heading: 'Your website account',
        paragraphs: [
          'Website accounts are only for our active AMC and regular customers, and only when our staff switch one on for you. To sign in, you enter the email address we have on record for you and we email you a 6-digit code.',
          'Each code can be used once and works for 10 minutes. A code also stops working after 5 wrong tries. We keep codes only as a keyed one-way fingerprint, never the code itself. After 10 wrong codes in 24 hours, sign-in to that account is locked for 24 hours. We also limit how many codes can be asked for, and how many wrong codes can be tried, from one connection, using the fingerprint of your internet address described above.',
          'When you sign in, we record the time. Your account shows only your own records: your contact details, your ACs (with their serial numbers), your AMC contracts with the visits used and left, your service requests with the visit times and the first name of the technician, the service reports of finished visits, and your bills and payments.',
          'Service report photos are shown through private links that stop working after 10 minutes. Payment references are shown only by their last 4 characters. For a bill with an amount due, the account shows a UPI payment link for that amount and our business UPI QR code, with the amount and bill number to enter. You pay in your own UPI app; we do not receive or store your UPI PIN or bank details through the website.',
          'From your account you can ask us to renew an AMC or to change your details. Our staff check these requests and make the change; nothing is changed or charged automatically.',
        ],
      },
      {
        heading: 'Why we use it',
        paragraphs: [
          'To handle your request: to call or message you, plan and carry out the visit, prepare quotes and invoices, send you updates about that request, and keep the service and billing records the law requires.',
          'If you tick the box for reminders and offers, we may also send service reminders and offers by WhatsApp or email. You can withdraw this at any time (see "Your choices and rights").',
          'We do not sell your details.',
        ],
      },
      {
        heading: 'Who can see it',
        paragraphs: [
          'Our staff, and the technician who visits you. If you ask about an AC sold by another seller, that seller receives the details needed to answer you.',
          'Our service providers process data only for us and under our instructions. Supabase stores our database and files in Mumbai, India. Render runs our business system and Vercel runs this website, both in the United States; your details pass through these services when the website and our staff use them. Google sends our emails.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'As long as needed to provide the service, and invoices and billing records for the period GST and accounting law require (currently 6 years).',
          'Sign-in codes stop working after 10 minutes, and their fingerprints are deleted after 7 days. A website sign-in ends after 7 days without use, after 30 days at most, when you sign out, when your account is switched off, or when the email address we have on record for you changes. The record of an ended sign-in is deleted after 30 days.',
          'Internet-address fingerprints used to limit sign-in attempts are deleted within about 2 days. The fingerprint kept with a request you send is deleted after 30 days; the request itself is kept as described above.',
        ],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          'Your request list (what you added before sending) and your day/night choice are saved in your own browser so they are still there when you come back. They stay on your device, and you can clear them in your browser settings.',
          'If you sign in to your website account, one essential cookie (ess_account) keeps you signed in. It is needed for the account to work, cannot be read by scripts on the page, is sent only over secure connections, is not used for tracking, lasts at most 30 days, and is removed when you sign out.',
          'We do not use advertising or tracking cookies.',
        ],
      },
      {
        heading: 'How we protect it',
        paragraphs: [
          'Your details are sent over encrypted connections, and access inside our systems is limited by role. Sign-in codes and sign-in sessions are stored only as one-way fingerprints. No method is completely secure, but we work to protect your data, and we will tell you and the authorities about a personal data breach as the law requires.',
        ],
      },
      {
        heading: 'Your choices and rights',
        paragraphs: [
          'You can ask us at any time to: tell you what personal data we hold about you; correct it or bring it up to date; erase it, unless the law requires us to keep it (for example invoices); stop sending you reminders and offers; or switch off your website account.',
          'You can also withdraw your consent to us using your details. This does not affect what we did before. We may still keep records the law requires, and we may not be able to carry out a service without the details it needs.',
          'To make any of these requests, or to raise a complaint, contact our grievance officer {grievanceName} at {grievanceEmail} or {grievancePhone}. Tell us your name and the mobile number or email we have for you, and what you would like us to do. We may ask you to confirm who you are before acting. We will reply within 30 days.',
          'We give you these choices now. Where the Digital Personal Data Protection Act, 2023 and its Rules give you rights, you also have those rights from the date the relevant provisions apply, including the right to complain to the Data Protection Board of India.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: ['Our services are for adults. If you are under 18, please ask a parent or guardian to contact us for you.'],
      },
      {
        heading: 'Changes to this notice',
        paragraphs: ['If we change how we use your data, we will update this notice and the date at the top. For important changes, we will tell you by email or when you next use our website.'],
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
        heading: 'Your account',
        paragraphs: [
          'Website accounts are for our active AMC and regular customers and are switched on by us. Keep your sign-in codes private and do not share them with anyone, including people who say they are from us. Anyone who can read your email can receive your codes, so keep your email safe.',
          'Please keep the email address we have on record for you up to date; codes are sent only to that address. Your account shows the information we hold about your ACs, AMC and service requests. If something looks wrong, tell us so we can correct it.',
          'We may switch an account off at any time, for example if the AMC or regular service ends, if we think someone else has used it, or if you ask us to. Tell us straight away if you think someone else has used your account.',
        ],
      },
      {
        heading: 'AMC plans',
        paragraphs: ['An AMC covers the visits and items listed for the plan you choose, per AC, for one year. Anything not listed is quoted separately before the work is done.'],
      },
      {
        heading: 'New ACs',
        paragraphs: [
          'Each AC is sold by the seller named on its page, with the warranty and return policy shown there. Prices and stock are confirmed when we call you.',
          'For an AC enquiry the seller sends you a price. If the seller changes that price, we email you the updated price, and only the latest price applies.',
        ],
      },
      {
        heading: 'Complaints',
        paragraphs: ['Contact {grievanceName} at {grievanceEmail} or {grievancePhone}. These terms are governed by Indian law, and the courts in Mumbai have jurisdiction.'],
      },
    ],
  },
};

/** Whether a published block is complete enough to replace the built-in wording. */
export function isLegalBody(v: unknown): v is LegalBody {
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
  const source = isLegalBody(block) ? block : LEGAL_DEFAULTS[doc];
  const g = identity.grievanceOfficer;
  const values: Record<(typeof LEGAL_PLACEHOLDERS)[number], string> = {
    legalName: identity.legalName,
    email: identity.email,
    phone: identity.phone,
    address: identity.address,
    warrantyDays: String(identity.warrantyDays),
    grievanceName: g.name ?? 'our grievance officer',
    grievanceEmail: g.email ?? identity.email,
    grievancePhone: g.phone ?? identity.phone,
  };
  const fill = (t: string) => t.replace(/\{([a-zA-Z]+)\}/g, (m, k: string) => (values as Record<string, string>)[k] ?? m);
  return {
    title: source.title,
    // Same rule as privacyNoticeVersion(): the page date is always the version recorded with consent.
    updatedOn: typeof source.updatedOn === 'string' && source.updatedOn ? source.updatedOn : LEGAL_DEFAULTS[doc].updatedOn,
    sections: source.sections.map((s) => ({ heading: fill(s.heading), paragraphs: s.paragraphs.map(fill) })),
  };
}
