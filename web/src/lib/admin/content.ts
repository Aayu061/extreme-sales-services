import { LEGAL_PLACEHOLDERS, isLegalBody, type LegalBody } from '@/lib/legal';
import type { BusinessIdentity, HomeHero } from '@/lib/pys/types';
import { activeOffers, indiaDate } from '@/lib/season';

/**
 * Website text and business details (PYS content blocks). Used by the editors in the browser and
 * again by the server actions, so the same checks run on both sides.
 *
 * validateBlock follows the rules the public site already reads with (lib/season activeOffers,
 * lib/legal isLegalBody / legalBody, the BusinessIdentity shape in lib/data), and is stricter where
 * the site would quietly drop or blank something: a published block can never break or empty a
 * public page.
 */

export type ContentKey = 'home.hero' | 'home.offers' | 'faq' | 'legal.privacy' | 'legal.terms' | 'business.identity';

export interface EditableBlock {
  key: ContentKey;
  title: string;
  /** Where it shows on the website, in plain words. */
  about: string;
  /** Only an ESS Admin can change it (PYS: business.* and legal.*). */
  adminOnly: boolean;
  /** Show the owner's "no unconfirmed claims" reminder. */
  claimsReminder: boolean;
}

/** The blocks this admin area edits, in list order. Other PYS keys are not shown. */
export const EDITABLE_BLOCKS: readonly EditableBlock[] = [
  { key: 'home.hero', title: 'Home page heading', about: 'The big heading and the line under it at the top of the home page.', adminOnly: false, claimsReminder: true },
  { key: 'home.offers', title: 'Offers on the home page', about: "The offer card at the top of the home page. With no live offer, the month's season tip shows.", adminOnly: false, claimsReminder: true },
  { key: 'faq', title: 'Questions and answers', about: 'Common questions and their answers.', adminOnly: false, claimsReminder: true },
  { key: 'legal.privacy', title: 'Privacy notice', about: 'The privacy notice page (/legal/privacy).', adminOnly: true, claimsReminder: false },
  { key: 'legal.terms', title: 'Terms', about: 'The terms page (/legal/terms).', adminOnly: true, claimsReminder: false },
  { key: 'business.identity', title: 'Business details', about: 'Name, address, phone, email, hours and warranty: in the footer, the contact page, the legal pages and emails.', adminOnly: true, claimsReminder: true },
];

export function editableBlock(key: string): EditableBlock | null {
  return EDITABLE_BLOCKS.find((b) => b.key === key) ?? null;
}

/** Same rule as PYS (ADMIN_ONLY_CONTENT in essAdmin.service.ts). */
export const isAdminOnlyContent = (key: string) => /^(business\.|legal\.)/.test(key);

export const contentHref = (key: string) => `/admin/content/${encodeURIComponent(key)}`;

export const CONTENT_MESSAGES = {
  offSite: 'Use a page of this site, e.g. /amc',
  pastDate: 'This day has passed. Choose today or a later day.',
  badDate: 'Enter a real date, e.g. 2026-12-31.',
  checkFields: 'Please check the highlighted details.',
  saved: 'Draft saved. It is not on the website yet.',
  savedStaff: 'Draft saved. An ESS Admin can now publish it to the website.',
  published: 'Published. The website shows it now.',
  savedNotPublished: 'Your changes were saved as a draft, but not published. Please try Publish again.',
  adminOnlyPublish: 'Only an ESS Admin can publish this.',
  adminOnlyEdit: 'Only an ESS Admin can change business and legal details.',
  notEditable: 'This text is not edited here.',
  notSaved: 'PYS could not save this text. It may be too long; please shorten it and try again.',
  unreachable: "We couldn't reach PYS. It may be waking up — try again in a minute.",
  signIn: 'Please sign in again.',
  forbidden: "You don't have access to this.",
  changedElsewhere: 'This text was changed since you opened it. The editor now shows the latest saved draft; please make your changes again.',
} as const;

/** One message per field, by path: "headline", "items.0.href", "sections.2.paragraphs.1", "grievanceOfficer.email". */
export type BlockFields = Record<string, string>;
export type BlockCheck = { ok: true; body: Record<string, unknown> } | { ok: false; fields: BlockFields };

/** PYS's limit for one block (MAX_CONTENT_BYTES in essAdmin.service.ts). */
const MAX_BYTES = 64 * 1024;

export const LIMITS = {
  headline: 60,
  subline: 160,
  offers: 10,
  offerTitle: 80,
  offerText: 200,
  offerHref: 200,
  offerLinkLabel: 40,
  faqItems: 50,
  question: 200,
  answer: 2000,
  legalTitle: 80,
  sections: 30,
  heading: 120,
  paragraphs: 20,
  paragraph: 3000,
  warrantyDays: 365,
} as const;

// ---------------------------------------------------------------- small checks

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** A string trimmed, or '' for anything that is not text (null, missing). Numbers are kept as text. */
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

class Checker {
  fields: BlockFields = {};
  problem(path: string, message: string) {
    this.fields[path] ??= message;
  }
  /** Required text of min–max characters. */
  text(path: string, value: unknown, label: string, min: number, max: number): string {
    const v = str(value);
    if (!v) this.problem(path, `Enter the ${label}.`);
    else if (v.length < min) this.problem(path, `The ${label} needs at least ${min} characters.`);
    else if (v.length > max) this.problem(path, `Keep the ${label} to ${max} characters or fewer.`);
    return v;
  }
  /** Optional text: empty becomes null. */
  optional(path: string, value: unknown, label: string, max: number): string | null {
    const v = str(value);
    if (v.length > max) this.problem(path, `Keep the ${label} to ${max} characters or fewer.`);
    return v || null;
  }
  get ok() {
    return Object.keys(this.fields).length === 0;
  }
}

/** A real calendar day written YYYY-MM-DD. */
function isRealDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * A page of this site: starts with one "/", and nothing a browser could read as another website
 * ("//x.com", "/\x.com") or that breaks the link (spaces). Same rule as activeOffers, a bit stricter.
 */
export function isSitePath(v: string): boolean {
  return v.startsWith('/') && !v.startsWith('//') && !/[\s\\]/.test(v);
}

/** Loose email check, like zod's email(): something@something.something, no spaces. */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** A phone number: digits with spaces, dashes, brackets or a leading +; 6–20 characters (PYS) and at least 8 digits. */
function phoneProblem(v: string, label: string): string | null {
  if (!/^\+?[\d\s()-]+$/.test(v) || v.replace(/\D/g, '').length < 8) return `Enter the ${label} with its digits, e.g. +91 79778 05245.`;
  if (v.length > 20) return `Keep the ${label} to 20 characters or fewer.`;
  return null;
}

// ---------------------------------------------------------------- per block

function hero(b: Obj, c: Checker): HomeHero {
  return {
    headline: c.text('headline', b.headline, 'headline', 2, LIMITS.headline),
    subline: c.text('subline', b.subline, 'line under the headline', 2, LIMITS.subline),
  };
}

function offers(b: Obj, c: Checker, now: Date) {
  if (!Array.isArray(b.items)) {
    c.problem('items', 'The offers list is missing.');
    return { items: [] };
  }
  if (b.items.length > LIMITS.offers) c.problem('items', `Keep it to ${LIMITS.offers} offers or fewer.`);
  const today = indiaDate(now);
  const items = b.items.map((raw, i) => {
    const o = isObj(raw) ? raw : {};
    const p = `items.${i}`;
    const title = c.text(`${p}.title`, o.title, 'title', 2, LIMITS.offerTitle);
    const text = c.optional(`${p}.text`, o.text, 'text', LIMITS.offerText);
    const href = c.optional(`${p}.href`, o.href, 'link', LIMITS.offerHref);
    if (href && !isSitePath(href)) c.problem(`${p}.href`, CONTENT_MESSAGES.offSite);
    const linkLabel = c.optional(`${p}.linkLabel`, o.linkLabel, 'link text', LIMITS.offerLinkLabel);
    if (linkLabel && !href) c.problem(`${p}.linkLabel`, 'Add the page to link to, or leave the link text empty.');
    const endsOn = str(o.endsOn) || null;
    if (endsOn && !isRealDate(endsOn)) c.problem(`${p}.endsOn`, CONTENT_MESSAGES.badDate);
    else if (endsOn && endsOn < today) c.problem(`${p}.endsOn`, CONTENT_MESSAGES.pastDate);
    return { title, text, href, linkLabel, endsOn };
  });
  // The site's own reader must keep every offer that passed (it drops bad ones quietly).
  if (c.ok && activeOffers(items, now).length !== items.length) c.problem('items', 'One of the offers would not show on the website. Please check them.');
  return { items };
}

function faq(b: Obj, c: Checker) {
  if (!Array.isArray(b.items)) {
    c.problem('items', 'The questions list is missing.');
    return { items: [] };
  }
  if (b.items.length > LIMITS.faqItems) c.problem('items', `Keep it to ${LIMITS.faqItems} questions or fewer.`);
  return {
    items: b.items.map((raw, i) => {
      const q = isObj(raw) ? raw : {};
      return {
        question: c.text(`items.${i}.question`, q.question, 'question', 2, LIMITS.question),
        answer: c.text(`items.${i}.answer`, q.answer, 'answer', 2, LIMITS.answer),
      };
    }),
  };
}

const KNOWN_PLACEHOLDERS = new Set<string>(LEGAL_PLACEHOLDERS);
const PLACEHOLDER_LIST = LEGAL_PLACEHOLDERS.map((p) => `{${p}}`).join(', ');

function placeholderProblem(text: string): string | null {
  const unknown = [...text.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).find((k) => !KNOWN_PLACEHOLDERS.has(k));
  return unknown ? `{${unknown}} is not filled in on the website. Use one of ${PLACEHOLDER_LIST}.` : null;
}

function legal(b: Obj, c: Checker): LegalBody {
  const title = c.text('title', b.title, 'page title', 2, LIMITS.legalTitle);
  const updatedOn = str(b.updatedOn);
  if (!isRealDate(updatedOn)) c.problem('updatedOn', CONTENT_MESSAGES.badDate);
  const rawSections = Array.isArray(b.sections) ? b.sections : [];
  if (rawSections.length === 0) c.problem('sections', 'Add at least one section.');
  if (rawSections.length > LIMITS.sections) c.problem('sections', `Keep it to ${LIMITS.sections} sections or fewer.`);
  const seen = new Set<string>();
  const sections = rawSections.map((raw, i) => {
    const s = isObj(raw) ? raw : {};
    const p = `sections.${i}`;
    const heading = c.text(`${p}.heading`, s.heading, 'heading', 2, LIMITS.heading);
    const fold = heading.toLowerCase();
    if (heading && seen.has(fold)) c.problem(`${p}.heading`, 'This heading is already used. Give each section its own heading.');
    seen.add(fold);
    const headingPlaceholder = placeholderProblem(heading);
    if (headingPlaceholder) c.problem(`${p}.heading`, headingPlaceholder);
    const rawParagraphs = Array.isArray(s.paragraphs) ? s.paragraphs : [];
    if (rawParagraphs.length === 0) c.problem(`${p}.paragraphs`, 'Add at least one paragraph.');
    if (rawParagraphs.length > LIMITS.paragraphs) c.problem(`${p}.paragraphs`, `Keep it to ${LIMITS.paragraphs} paragraphs or fewer.`);
    const paragraphs = rawParagraphs.map((t, j) => {
      const v = c.text(`${p}.paragraphs.${j}`, t, 'paragraph', 1, LIMITS.paragraph);
      const bad = placeholderProblem(v);
      if (bad) c.problem(`${p}.paragraphs.${j}`, bad);
      return v;
    });
    return { heading, paragraphs };
  });
  const body = { title, updatedOn, sections };
  // The legal page's own check: anything less and it would show the built-in wording instead.
  if (c.ok && !isLegalBody(body)) c.problem('sections', 'This text is not complete. Please check every section.');
  return body;
}

function identity(b: Obj, c: Checker): BusinessIdentity {
  const g = isObj(b.grievanceOfficer) ? b.grievanceOfficer : {};
  const phone = c.text('phone', b.phone, 'phone number', 6, 20);
  const phoneBad = phone ? phoneProblem(phone, 'phone number') : null;
  if (phoneBad) c.problem('phone', phoneBad);
  const whatsapp = c.optional('whatsapp', b.whatsapp, 'WhatsApp number', 20);
  const waBad = whatsapp ? phoneProblem(whatsapp, 'WhatsApp number') : null;
  if (waBad) c.problem('whatsapp', waBad);
  const email = c.text('email', b.email, 'email address', 3, 254);
  if (email && !isEmail(email)) c.problem('email', 'Enter an email address like name@example.com.');
  const gstin = c.optional('gstin', b.gstin, 'GSTIN', 15)?.toUpperCase() ?? null;
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) c.problem('gstin', 'A GSTIN is 15 characters: 2 digits, then letters and digits.');

  const daysText = str(b.warrantyDays);
  const days = /^\d{1,4}$/.test(daysText) ? Number(daysText) : NaN;
  if (!(days >= 0 && days <= LIMITS.warrantyDays)) c.problem('warrantyDays', `Enter a whole number of days from 0 to ${LIMITS.warrantyDays}.`);

  const gName = c.optional('grievanceOfficer.name', g.name, 'name', 120);
  const gEmail = c.optional('grievanceOfficer.email', g.email, 'email address', 254);
  if (gEmail && !isEmail(gEmail)) c.problem('grievanceOfficer.email', 'Enter an email address like name@example.com.');
  const gPhone = c.optional('grievanceOfficer.phone', g.phone, 'phone number', 20);
  const gPhoneBad = gPhone ? phoneProblem(gPhone, 'phone number') : null;
  if (gPhoneBad) c.problem('grievanceOfficer.phone', gPhoneBad);

  // Exactly the fields of BusinessIdentity, in PYS's businessIdentitySchema (strict) shape.
  return {
    legalName: c.text('legalName', b.legalName, 'legal name', 2, 200),
    tradeName: c.text('tradeName', b.tradeName, 'trade name', 2, 200),
    proprietorName: c.optional('proprietorName', b.proprietorName, "owner's name", 120),
    gstin,
    address: c.text('address', b.address, 'address', 5, 500),
    phone,
    whatsapp,
    email,
    hours: c.text('hours', b.hours, 'opening hours', 2, 120),
    warrantyDays: days,
    // The footer's "Complaints" box (an e-commerce rules disclosure) shows the grievance email and
    // phone with no fallback of its own, so an empty one is stored as the business email / phone:
    // the published block always carries a contact, and the footer and legal pages agree.
    grievanceOfficer: { name: gName, email: gEmail ?? (email || null), phone: gPhone ?? (phone || null) },
  };
}

/**
 * Checks one block before it is saved or published. On success `body` is the clean value to store
 * (trimmed; empty optional fields as null; days as a number; only known fields).
 */
export function validateBlock(key: string, body: unknown, now: Date = new Date()): BlockCheck {
  const block = editableBlock(key);
  if (!block) return { ok: false, fields: { form: CONTENT_MESSAGES.notEditable } };
  if (!isObj(body)) return { ok: false, fields: { form: 'This text is empty. Please fill it in.' } };
  const c = new Checker();
  let out: object;
  switch (block.key) {
    case 'home.hero':
      out = hero(body, c);
      break;
    case 'home.offers':
      out = offers(body, c, now);
      break;
    case 'faq':
      out = faq(body, c);
      break;
    case 'legal.privacy':
    case 'legal.terms':
      out = legal(body, c);
      break;
    case 'business.identity':
      out = identity(body, c);
      break;
  }
  if (!c.ok) return { ok: false, fields: c.fields };
  if (new TextEncoder().encode(JSON.stringify(out)).length > MAX_BYTES) {
    return { ok: false, fields: { form: 'This text is too long to save (64 KB at most). Please shorten it.' } };
  }
  return { ok: true, body: out as Record<string, unknown> };
}

// ---------------------------------------------------------------- comparing and editing

/** JSON with object keys sorted, so two blocks compare by content, not by field order. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (isObj(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export const sameBody = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);

/** What the editors work on: the stored shape with every value as text. */
export interface HeroForm {
  headline: string;
  subline: string;
}
export interface OfferForm {
  title: string;
  text: string;
  href: string;
  linkLabel: string;
  endsOn: string;
}
export interface OffersForm {
  items: OfferForm[];
}
export interface FaqForm {
  items: Array<{ question: string; answer: string }>;
}
export type LegalForm = LegalBody;
export interface IdentityForm {
  legalName: string;
  tradeName: string;
  proprietorName: string;
  gstin: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  warrantyDays: string;
  grievanceOfficer: { name: string; email: string; phone: string };
}
export type BlockForm = HeroForm | OffersForm | FaqForm | LegalForm | IdentityForm;

/** Text for a form field; null and missing become ''. Untrimmed, so typing is not disturbed. */
const formText = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

export const emptyOffer = (): OfferForm => ({ title: '', text: '', href: '', linkLabel: '', endsOn: '' });

/**
 * The block as the editor shows it. Missing parts come from `fallback` (what the website shows
 * when PYS has nothing), the same way the site fills its pages, so the editor starts from what
 * visitors see.
 */
export function editableBody(key: string, raw: unknown, fallback: unknown): BlockForm {
  const b = isObj(raw) ? raw : {};
  const f = isObj(fallback) ? fallback : {};
  const pick = (k: string) => (b[k] !== undefined && b[k] !== null ? b[k] : f[k]);
  switch (key) {
    case 'home.hero':
      return { headline: formText(pick('headline')), subline: formText(pick('subline')) };
    case 'home.offers': {
      const items = Array.isArray(b.items) ? b.items : Array.isArray(f.items) ? f.items : [];
      return {
        items: items.map((o) => {
          const x = isObj(o) ? o : {};
          return { title: formText(x.title), text: formText(x.text), href: formText(x.href), linkLabel: formText(x.linkLabel), endsOn: formText(x.endsOn) };
        }),
      };
    }
    case 'faq': {
      const items = Array.isArray(b.items) ? b.items : Array.isArray(f.items) ? f.items : [];
      return { items: items.map((q) => (isObj(q) ? { question: formText(q.question), answer: formText(q.answer) } : { question: '', answer: '' })) };
    }
    case 'legal.privacy':
    case 'legal.terms': {
      const source = isLegalBody(raw) ? raw : isLegalBody(fallback) ? fallback : { title: '', updatedOn: '', sections: [] };
      return {
        title: source.title,
        updatedOn: formText(source.updatedOn),
        sections: source.sections.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] })),
      };
    }
    case 'business.identity': {
      const g = isObj(b.grievanceOfficer) ? b.grievanceOfficer : isObj(f.grievanceOfficer) ? f.grievanceOfficer : {};
      // A field PYS has (even as null) is kept as it is; only missing fields come from the fallback.
      const own = (k: string) => formText(k in b ? b[k] : f[k]);
      return {
        legalName: own('legalName'),
        tradeName: own('tradeName'),
        proprietorName: own('proprietorName'),
        gstin: own('gstin'),
        address: own('address'),
        phone: own('phone'),
        whatsapp: own('whatsapp'),
        email: own('email'),
        hours: own('hours'),
        warrantyDays: own('warrantyDays'),
        grievanceOfficer: { name: formText(g.name), email: formText(g.email), phone: formText(g.phone) },
      };
    }
    default:
      return {} as BlockForm;
  }
}

/** PYS names fields of the block "body.phone", "body.grievanceOfficer.email"; the form names them without "body.". */
export function pysContentFields(fields: Record<string, string>): BlockFields | null {
  const out: BlockFields = {};
  for (const [path, message] of Object.entries(fields)) {
    if (!path.startsWith('body.')) return null;
    out[path.slice('body.'.length)] = message;
  }
  return Object.keys(out).length ? out : null;
}
