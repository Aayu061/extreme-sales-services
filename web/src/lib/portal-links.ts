/** S11b: addresses inside the customer account, and the "book / complain for this AC" links into /book. */

const enc = encodeURIComponent;

export const accountHref = {
  overview: () => '/account',
  acs: () => '/account/acs',
  ac: (id: string) => `/account/acs/${enc(id)}`,
  amcList: () => '/account/amc',
  amc: (id: string) => `/account/amc/${enc(id)}`,
  requests: (filter?: 'open' | 'completed' | 'all') => (filter && filter !== 'all' ? `/account/requests?filter=${filter}` : '/account/requests'),
  request: (n: string) => `/account/requests/${enc(n)}`,
  report: (n: string) => `/account/reports/${enc(n)}`,
  billing: () => '/account/billing',
  bill: (n: string) => `/account/billing/${enc(n)}`,
  profile: () => '/account/profile',
};

/** Where an overview alert leads. */
export function alertHref(link: { kind: 'amc' | 'ac' | 'bill' | 'report'; id: string } | null): string | null {
  if (!link?.id) return null;
  switch (link.kind) {
    case 'amc':
      return accountHref.amc(link.id);
    case 'ac':
      return accountHref.ac(link.id);
    case 'bill':
      return accountHref.bill(link.id);
    case 'report':
      return accountHref.report(link.id);
    default:
      return null;
  }
}

/** The /book note is plain text the customer can still edit; keep it short and on one line. */
export const BOOK_NOTE_MAX = 300;
export function cleanBookNote(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, BOOK_NOTE_MAX);
}

/** The diagnosis visit is what a complaint becomes in the catalogue; /book ignores it if the code is not offered. */
export const COMPLAINT_SERVICE_CODE = 'SVC-DIAG';

/**
 * "Book a service for this AC": opens /book with a note naming the AC, so staff know which unit. The customer
 * picks the service on /book as usual.
 */
export function bookForAcHref(ac: { label: string }, opts: { amcCovered?: boolean } = {}): string {
  const note = cleanBookNote(`Service for my ${ac.label}.${opts.amcCovered ? ' This AC is under my AMC.' : ''}`);
  return `/book?note=${enc(note)}`;
}

/** "Raise a complaint for this AC": a diagnosis visit plus a note naming the AC; the customer adds the problem. */
export function complaintForAcHref(ac: { label: string }, opts: { amcCovered?: boolean } = {}): string {
  const note = cleanBookNote(`Complaint about my ${ac.label}.${opts.amcCovered ? ' This AC is under my AMC.' : ''} Problem: `);
  return `/book?service=${enc(COMPLAINT_SERVICE_CODE)}&note=${enc(note)}`;
}
