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
        paragraphs: ['{legalName}, {address}, handles the details you share on this website. You can reach us at {email} or {phone}.'],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'When you send a request or a message we collect your name, mobile number and (if you give it) email; the address for a visit; details about your AC such as type, size and brand; your preferred date and time; and any note you write.',
          'We also keep a one-way fingerprint of your internet address to stop misuse of the forms and of request tracking. We never store the address itself.',
          'When you are a customer, we also keep the details of your ACs, AMC contracts, visits, service reports and payments so that we can look after your ACs and answer your questions.',
        ],
      },
      {
        heading: 'Your website account',
        paragraphs: [
          'Website accounts are only for our active AMC and regular customers, and only when our staff switch one on for you. To sign in, you enter the email address we have on record for you and we email you a 6-digit code.',
          'Each code works only once and only for 10 minutes. We keep it only as a keyed one-way fingerprint (a hash), never the code itself, and the code is not kept in our records of the emails we send. After 10 wrong codes in 24 hours, sign-in to that account is locked for 24 hours.',
          'To stop anyone trying codes again and again, we also limit the number of tries from one connection. For this we use the one-way fingerprint of your internet address described above, never the address itself.',
          'When you sign in, we record the time. Your account shows only your own records: your contact details, your ACs (with their serial numbers), your AMC contracts with the visits used and left, your service requests with the visit times and the first name of the technician, the service reports of finished visits, and your bills and payments.',
          'Service report photos are shown through private links that stop working after 10 minutes. Payment references are shown only by their last 4 characters. For a bill with an amount due, the account shows a UPI payment link for that amount; paying is done in your own UPI app.',
          'From your account you can ask us to renew an AMC or to change your details. These requests go to our staff, who check them and make the change; nothing is changed or charged automatically.',
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
          'Our service providers process the data only for us and under our instructions: Supabase (database and file storage), Render and Vercel (hosting our systems and this website), and Google (sending our emails). Some of these providers may store data outside India.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'As long as needed to provide the service and for as long as tax and accounting law requires us to keep invoices and records.',
          'Sign-in codes stop working after 10 minutes, and their fingerprints are deleted after 7 days. A website sign-in ends after 7 days without use, after 30 days at most, when you sign out, when your account is switched off, or when the email address we have on record for you changes; the record of an ended sign-in is deleted after 30 days.',
          'Misuse-prevention records (the internet-address fingerprints) are kept only briefly.',
        ],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          'Your request list (what you added before sending) and your day/night choice are saved in your own browser so they are still there when you come back. They stay on your device and you can clear them in your browser settings.',
          'If you sign in to your website account, one essential cookie (ess_account) keeps you signed in. It is needed for the account to work, cannot be read by scripts on the page, is not used for tracking, and is removed when you sign out.',
          'We do not use advertising or tracking cookies.',
        ],
      },
      {
        heading: 'How we protect it',
        paragraphs: [
          'Your details are sent over encrypted connections and access inside our systems is limited by role. Sign-in codes and sign-in sessions are stored only as one-way fingerprints, never as the code or session itself. No method is completely secure, but we work to protect your data and will tell you and the authorities about a personal data breach as the law requires.',
        ],
      },
      {
        heading: 'Backup copies (ESS-PYS Backups)',
        paragraphs: [
          'To protect your records against technical failure, our internal tool ESS-PYS Backups makes a copy of our customer and service database (the records described above, plus the sign-in records of our own staff) once a night. Status: the tool is ready and tested, but it is switched on for our live records only after our final approval; until then it runs only with test data.',
          'Each copy is encrypted on our side before it is uploaded, with a key that only we hold and keep offline. It is then stored in a private folder (ESS-PYS-Backups) in our business Google Drive. The files are not shared with anyone; Google stores them for us but receives only the encrypted files and cannot read them. A checksum (SHA-256) is kept with each copy so that we can prove it has not changed.',
          'The tool connects to Google Drive with the narrowest permission Google offers (drive.file: it can only see and manage the files it creates itself, not anything else in the Drive). Its sign-in token and the database password are stored only as protected secrets of our automated systems and are never written into our code, logs or the backup files.',
          'Copies are kept for 30 days and then deleted automatically; the newest good copy is always kept. A copy is used only to restore our records after a failure: we download it, check its checksum, decrypt it on our own computer and restore it into our database. We do not use backup copies for any other purpose.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Under the Digital Personal Data Protection Act, 2023 you can ask to see the personal data we hold about you, correct it, or have it erased, and you can withdraw your consent. To do so, or to raise a complaint, contact {grievanceName} at {grievanceEmail} or {grievancePhone}. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.',
          'You can also ask us to switch off your website account at any time.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: ['Our services are for adults. Please do not send us requests on behalf of anyone under 18 without their parent or guardian.'],
      },
      {
        heading: 'Changes to this notice',
        paragraphs: ['If we change how we use your data, we will update this notice and the date at the top. For important changes we will tell you by email or when you next use our website.'],
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
