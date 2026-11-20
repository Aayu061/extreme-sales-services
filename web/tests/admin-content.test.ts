import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: PYS (adminRequest + getMe), Next's cache calls and redirect() throwing like Next ----

const adminRequest = vi.fn<(method: string, path: string, body?: unknown) => Promise<unknown>>();
const getMe = vi.fn<() => Promise<unknown>>();
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string, body?: unknown) => adminRequest(method, path, body),
  getMe: () => getMe(),
}));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  updateTag: (tag: string) => updateTag(tag),
  revalidatePath: (p: string, type?: string) => revalidatePath(p, type),
}));
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected) throw err;
  },
}));

import { AdminAuthError, AdminForbiddenError, AdminValidationError } from '@/lib/admin/pys-admin';
import { PysError } from '@/lib/pys/client';
import {
  CONTENT_MESSAGES,
  EDITABLE_BLOCKS,
  editableBlock,
  editableBody,
  isAdminOnlyContent,
  pysContentFields,
  sameBody,
  validateBlock,
} from '@/lib/admin/content';
import { publish, saveDraft } from '@/app/admin/actions/content';
import { FALLBACK_IDENTITY } from '@/lib/data';
import { activeOffers } from '@/lib/season';
import { LEGAL_DEFAULTS, isLegalBody, legalBody } from '@/lib/legal';
import type { AdminContentBlock } from '@/lib/admin/types';

// 20 Nov 2026, 10:00 in Mumbai.
const NOW = new Date('2026-11-20T04:30:00Z');

const ADMIN = { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'a@example.com' };
const STAFF = { roles: ['ESS_STAFF'], isPysAdmin: false, name: 'Test Staff', email: 's@example.com' };

const HERO = { headline: 'What does your AC need?', subline: 'Servicing, repairs, AMC plans and new ACs across Mumbai.' };

const offer = (extra: Record<string, unknown> = {}) => ({ title: 'Jet wash week', text: 'Book a jet wash this week.', href: '/services/svc-jet-wash', linkLabel: 'See jet wash', endsOn: '2026-11-30', ...extra });

const block = (key: string, draft: unknown, extra: Partial<AdminContentBlock> = {}): AdminContentBlock => ({
  key,
  draft,
  published: draft,
  publishedVersion: 2,
  publishedAt: '2026-11-19T10:00:00Z',
  draftUpdatedAt: '2026-11-19T10:00:00Z',
  adminOnly: isAdminOnlyContent(key),
  history: [],
  ...extra,
});

beforeEach(() => {
  adminRequest.mockReset();
  getMe.mockReset();
  getMe.mockResolvedValue(ADMIN);
  updateTag.mockClear();
  revalidatePath.mockClear();
});

describe('EDITABLE_BLOCKS', () => {
  it('lists the six blocks the admin area edits, business and legal ones for ESS Admin only', () => {
    expect(EDITABLE_BLOCKS.map((b) => b.key)).toEqual(['home.hero', 'home.offers', 'faq', 'legal.privacy', 'legal.terms', 'business.identity']);
    expect(EDITABLE_BLOCKS.filter((b) => b.adminOnly).map((b) => b.key)).toEqual(['legal.privacy', 'legal.terms', 'business.identity']);
    expect(editableBlock('home.hero')?.title).toBeTruthy();
    expect(editableBlock('home.banner')).toBeNull();
    expect(editableBlock('__proto__')).toBeNull();
  });

  it('marks business.* and legal.* as admin-only, like PYS', () => {
    expect(isAdminOnlyContent('business.identity')).toBe(true);
    expect(isAdminOnlyContent('legal.terms')).toBe(true);
    expect(isAdminOnlyContent('home.hero')).toBe(false);
    expect(isAdminOnlyContent('faq')).toBe(false);
  });
});

describe('validateBlock: home.hero', () => {
  it('keeps a headline and subline, trimmed', () => {
    expect(validateBlock('home.hero', { headline: '  Cool rooms  ', subline: ' Servicing across Mumbai. ' }, NOW)).toEqual({
      ok: true,
      body: { headline: 'Cool rooms', subline: 'Servicing across Mumbai.' },
    });
  });

  it('refuses an empty headline (the home page would have no heading)', () => {
    const r = validateBlock('home.hero', { headline: '   ', subline: 'x'.repeat(10) }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.headline).toMatch(/headline/i);
  });

  it('refuses a headline too long for the home page', () => {
    const r = validateBlock('home.hero', { headline: 'x'.repeat(61), subline: 'Servicing' }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.headline).toMatch(/60/);
  });
});

describe('validateBlock: home.offers', () => {
  it('refuses a link to another website', () => {
    const r = validateBlock('home.offers', { items: [offer({ href: 'https://x.com' })] }, NOW);
    expect(r).toEqual({ ok: false, fields: { 'items.0.href': 'Use a page of this site, e.g. /amc' } });
  });

  it('refuses "//x.com" and backslash tricks that browsers read as another website', () => {
    for (const href of ['//x.com', '/\\x.com', 'amc', '/amc page']) {
      const r = validateBlock('home.offers', { items: [offer({ href })] }, NOW);
      expect(r.ok, href).toBe(false);
      if (!r.ok) expect(r.fields['items.0.href']).toBe(CONTENT_MESSAGES.offSite);
    }
  });

  it('refuses an end date in the past (India date)', () => {
    const r = validateBlock('home.offers', { items: [offer({ endsOn: '2026-11-19' })] }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields['items.0.endsOn']).toBe(CONTENT_MESSAGES.pastDate);
    // 20 Nov 20:00 UTC is already 21 Nov in Mumbai, so 20 Nov has passed there.
    const late = validateBlock('home.offers', { items: [offer({ endsOn: '2026-11-20' })] }, new Date('2026-11-20T20:00:00Z'));
    expect(late.ok).toBe(false);
  });

  it('accepts today as the last day, and an offer without a link or end date', () => {
    const r = validateBlock('home.offers', { items: [offer({ endsOn: '2026-11-20' }), { title: 'AMC for the year', text: '', href: '', linkLabel: '', endsOn: '' }] }, NOW);
    expect(r).toEqual({
      ok: true,
      body: {
        items: [
          { title: 'Jet wash week', text: 'Book a jet wash this week.', href: '/services/svc-jet-wash', linkLabel: 'See jet wash', endsOn: '2026-11-20' },
          { title: 'AMC for the year', text: null, href: null, linkLabel: null, endsOn: null },
        ],
      },
    });
    // The site's own reader keeps every offer that passes.
    if (r.ok) expect(activeOffers((r.body as { items: unknown[] }).items, NOW)).toHaveLength(2);
  });

  it('refuses a made-up date, a missing title, and link text without a link', () => {
    const r = validateBlock('home.offers', { items: [offer({ endsOn: '2026-02-30' }), offer({ title: ' ' }), offer({ href: '', linkLabel: 'See it' })] }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fields['items.0.endsOn']).toBe(CONTENT_MESSAGES.badDate);
      expect(r.fields['items.1.title']).toMatch(/title/i);
      expect(r.fields['items.2.linkLabel']).toMatch(/link/i);
    }
  });

  it('accepts an empty list (no offer card; the season tip shows)', () => {
    expect(validateBlock('home.offers', { items: [] }, NOW)).toEqual({ ok: true, body: { items: [] } });
  });
});

describe('validateBlock: faq', () => {
  it('needs a question and an answer for each item', () => {
    const r = validateBlock('faq', { items: [{ question: 'Do you service window ACs?', answer: '' }] }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields['items.0.answer']).toMatch(/answer/i);
    expect(validateBlock('faq', { items: [{ question: ' Do you service window ACs? ', answer: 'Yes.' }] }, NOW)).toEqual({
      ok: true,
      body: { items: [{ question: 'Do you service window ACs?', answer: 'Yes.' }] },
    });
  });
});

describe('validateBlock: legal', () => {
  const legal = (extra: Record<string, unknown> = {}) => ({
    title: 'Privacy notice',
    updatedOn: '2026-11-20',
    sections: [
      { heading: 'Who we are', paragraphs: ['{legalName}, {address}.'] },
      { heading: 'Your rights', paragraphs: ['Write to {grievanceEmail}.', 'Or call {grievancePhone}.'] },
    ],
    ...extra,
  });

  it('accepts a complete text, which the legal page then shows (placeholders filled)', () => {
    const r = validateBlock('legal.privacy', legal(), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(isLegalBody(r.body)).toBe(true);
      const shown = legalBody('privacy', r.body, FALLBACK_IDENTITY);
      expect(shown.title).toBe('Privacy notice');
      expect(shown.sections[0].paragraphs[0]).toBe(`${FALLBACK_IDENTITY.legalName}, ${FALLBACK_IDENTITY.address}.`);
    }
  });

  it('accepts the built-in wording as it is', () => {
    expect(validateBlock('legal.terms', LEGAL_DEFAULTS.terms, NOW).ok).toBe(true);
    expect(validateBlock('legal.privacy', LEGAL_DEFAULTS.privacy, NOW).ok).toBe(true);
  });

  it('refuses no sections, an empty heading or paragraph, the same heading twice and an unknown placeholder', () => {
    const none = validateBlock('legal.privacy', legal({ sections: [] }), NOW);
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.fields.sections).toMatch(/section/i);

    const r = validateBlock(
      'legal.terms',
      legal({
        sections: [
          { heading: 'Prices', paragraphs: ['Include GST.', ' '] },
          { heading: ' ', paragraphs: ['x'] },
          { heading: 'prices', paragraphs: ['Again.'] },
          { heading: 'Contact', paragraphs: ['Write to {mail}.'] },
          { heading: 'Empty', paragraphs: [] },
        ],
      }),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fields['sections.0.paragraphs.1']).toMatch(/paragraph/i);
      expect(r.fields['sections.1.heading']).toMatch(/heading/i);
      expect(r.fields['sections.2.heading']).toMatch(/already/i);
      expect(r.fields['sections.3.paragraphs.0']).toMatch(/\{mail\}/);
      expect(r.fields['sections.4.paragraphs']).toMatch(/paragraph/i);
    }
  });

  it('needs the "last updated" date as a real date', () => {
    const r = validateBlock('legal.privacy', legal({ updatedOn: '20/11/2026' }), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.updatedOn).toBe(CONTENT_MESSAGES.badDate);
  });
});

describe('validateBlock: business.identity', () => {
  const identity = (extra: Record<string, unknown> = {}) => ({ ...FALLBACK_IDENTITY, ...extra });

  it('refuses business details without a phone number', () => {
    const r = validateBlock('business.identity', identity({ phone: '' }), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.phone).toMatch(/phone/i);
    const missing = { ...identity() } as Record<string, unknown>;
    delete missing.phone;
    expect(validateBlock('business.identity', missing, NOW).ok).toBe(false);
  });

  it('keeps every field of the business details, in the shape the site reads', () => {
    const r = validateBlock('business.identity', identity(), NOW);
    expect(r).toEqual({ ok: true, body: FALLBACK_IDENTITY });
  });

  it('turns form text into the stored shape: days as a number, empty optional fields as null, GSTIN in capitals', () => {
    const r = validateBlock(
      'business.identity',
      identity({ warrantyDays: '30', whatsapp: ' ', proprietorName: '', gstin: '27antpp9778j1zo', grievanceOfficer: { name: '', email: '', phone: '' }, extra: 'x' }),
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body).toMatchObject({ warrantyDays: 30, whatsapp: null, proprietorName: null, gstin: '27ANTPP9778J1ZO', grievanceOfficer: { name: null, email: null, phone: null } });
      expect(Object.keys(r.body).sort()).toEqual(Object.keys(FALLBACK_IDENTITY).sort());
    }
  });

  it('refuses warranty days outside 0–365, a bad email, a bad GSTIN and a phone without enough digits', () => {
    const r = validateBlock(
      'business.identity',
      identity({ warrantyDays: 400, email: 'not-an-email', gstin: '27ANT', phone: 'call us', grievanceOfficer: { name: null, email: 'nope', phone: null } }),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fields.warrantyDays).toMatch(/365/);
      expect(r.fields.email).toMatch(/email/i);
      expect(r.fields.gstin).toMatch(/15/);
      expect(r.fields.phone).toMatch(/phone/i);
      expect(r.fields['grievanceOfficer.email']).toMatch(/email/i);
    }
    const half = validateBlock('business.identity', identity({ warrantyDays: '4.5' }), NOW);
    expect(half.ok).toBe(false);
  });
});

describe('validateBlock: anything else', () => {
  it('refuses a key the admin area does not edit, and a body that is not an object', () => {
    expect(validateBlock('home.banner', {}, NOW).ok).toBe(false);
    expect(validateBlock('home.hero', null, NOW).ok).toBe(false);
    expect(validateBlock('home.offers', { items: 'x' }, NOW).ok).toBe(false);
  });

  it('refuses text over PYS 64 KB limit', () => {
    const r = validateBlock('faq', { items: Array.from({ length: 40 }, () => ({ question: 'Why?', answer: 'x'.repeat(1990) })) }, NOW);
    expect(r.ok).toBe(false);
  });
});

describe('sameBody / editableBody / pysContentFields', () => {
  it('compares text blocks whatever the order of their fields', () => {
    expect(sameBody({ a: 1, b: { c: [1, 2], d: null } }, { b: { d: null, c: [1, 2] }, a: 1 })).toBe(true);
    expect(sameBody({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameBody({ items: [1, 2] }, { items: [2, 1] })).toBe(false);
    expect(sameBody(null, null)).toBe(true);
    expect(sameBody(null, {})).toBe(false);
  });

  it('fills the editor like the site fills the page: missing parts from the built-in values', () => {
    expect(editableBody('home.hero', { headline: 'Cool' }, HERO)).toEqual({ headline: 'Cool', subline: HERO.subline });
    expect(editableBody('home.offers', {}, { items: [] })).toEqual({ items: [] });
    expect(editableBody('home.offers', { items: [{ title: 'Sale', href: null }] }, { items: [] })).toEqual({
      items: [{ title: 'Sale', text: '', href: '', linkLabel: '', endsOn: '' }],
    });
    expect(editableBody('legal.terms', { title: '' }, LEGAL_DEFAULTS.terms)).toEqual(LEGAL_DEFAULTS.terms);
    const id = editableBody('business.identity', { phone: '+91 90000 00000' }, FALLBACK_IDENTITY) as unknown as Record<string, unknown>;
    expect(id.phone).toBe('+91 90000 00000');
    expect(id.proprietorName).toBe('');
    expect(id.warrantyDays).toBe(String(FALLBACK_IDENTITY.warrantyDays));
  });

  it('turns PYS field names (body.x) into the form fields', () => {
    expect(pysContentFields({ 'body.phone': 'Too small', 'body.grievanceOfficer.email': 'Invalid email' })).toEqual({
      phone: 'Too small',
      'grievanceOfficer.email': 'Invalid email',
    });
    expect(pysContentFields({ key: 'Invalid content key' })).toBeNull();
  });
});

// ---------------------------------------------------------------- actions

describe('saveDraft', () => {
  it('checks the text again and saves it as a draft in PYS (the website is not refreshed)', async () => {
    adminRequest.mockResolvedValue(block('home.hero', HERO, { draft: { headline: 'Cool', subline: 'Servicing across Mumbai.' } }));
    const state = await saveDraft('home.hero', { headline: ' Cool ', subline: 'Servicing across Mumbai.' });
    expect(adminRequest).toHaveBeenCalledTimes(1);
    expect(adminRequest).toHaveBeenCalledWith('PUT', '/content/home.hero', { body: { headline: 'Cool', subline: 'Servicing across Mumbai.' } });
    expect(state.ok).toBe(true);
    expect(state.block?.draft).toEqual({ headline: 'Cool', subline: 'Servicing across Mumbai.' });
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content', 'layout');
  });

  it('refuses a bad text without calling PYS', async () => {
    const state = await saveDraft('home.offers', { items: [offer({ href: 'https://x.com' })] });
    expect(state.fields).toEqual({ 'items.0.href': 'Use a page of this site, e.g. /amc' });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('refuses a key the admin area does not edit without calling PYS', async () => {
    const state = await saveDraft('home.banner', { a: 1 });
    expect(state.error).toBeTruthy();
    expect(adminRequest).not.toHaveBeenCalled();
    expect(getMe).not.toHaveBeenCalled();
  });

  it('lets ESS Staff save a draft of the home page text', async () => {
    getMe.mockResolvedValue(STAFF);
    adminRequest.mockResolvedValue(block('home.hero', HERO));
    expect((await saveDraft('home.hero', HERO)).ok).toBe(true);
  });

  it('refuses ESS Staff on business details before PYS is asked to save', async () => {
    getMe.mockResolvedValue(STAFF);
    const state = await saveDraft('business.identity', FALLBACK_IDENTITY);
    expect(state.error).toBe(CONTENT_MESSAGES.adminOnlyEdit);
    expect(state.ok).toBeUndefined();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("shows PYS's own field messages on the form", async () => {
    adminRequest.mockRejectedValue(new AdminValidationError({ 'body.phone': 'Too small: expected string to have >=6 characters' }));
    const state = await saveDraft('business.identity', FALLBACK_IDENTITY);
    expect(state.fields).toEqual({ phone: 'Too small: expected string to have >=6 characters' });
  });

  it('returns flags for an ended session or no access (R7), and a plain message when PYS is away', async () => {
    adminRequest.mockRejectedValueOnce(new AdminAuthError());
    expect(await saveDraft('home.hero', HERO)).toEqual({ authError: true });
    adminRequest.mockRejectedValueOnce(new AdminForbiddenError());
    expect(await saveDraft('home.hero', HERO)).toEqual({ forbidden: true });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    adminRequest.mockRejectedValueOnce(new PysError(503, 'PYS_UNREACHABLE', 'down'));
    expect(await saveDraft('home.hero', HERO)).toEqual({ error: CONTENT_MESSAGES.unreachable });
    expect(JSON.stringify(log.mock.calls)).not.toContain('What does your AC need');
    log.mockRestore();
  });

  it('says so when PYS finds the text too long (400)', async () => {
    adminRequest.mockRejectedValue(new PysError(400, 'BAD_REQUEST', 'This content is too long (64 KB limit).'));
    expect((await saveDraft('home.hero', HERO)).error).toBe(CONTENT_MESSAGES.notSaved);
  });
});

describe('publish', () => {
  it('saves what is on the screen as the draft, publishes it and refreshes the website at once', async () => {
    const published = block('home.hero', HERO, { publishedVersion: 3 });
    adminRequest.mockResolvedValueOnce(block('home.hero', HERO, { published: { headline: 'Old', subline: 'Old text' } })).mockResolvedValueOnce(published);
    const state = await publish('home.hero', HERO);
    expect(adminRequest.mock.calls).toEqual([
      ['PUT', '/content/home.hero', { body: HERO }],
      ['POST', '/content/home.hero/publish', undefined],
    ]);
    expect(state).toEqual({ ok: true, block: published });
    expect(updateTag).toHaveBeenCalledWith('content');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content', 'layout');
  });

  it('refuses ESS Staff before PYS is called, for every key', async () => {
    getMe.mockResolvedValue(STAFF);
    for (const key of ['home.hero', 'business.identity']) {
      const state = await publish(key, key === 'home.hero' ? HERO : FALLBACK_IDENTITY);
      expect(state.error).toBe(CONTENT_MESSAGES.adminOnlyPublish);
    }
    expect(adminRequest).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('checks the role first, then the text', async () => {
    getMe.mockResolvedValue(STAFF);
    expect((await publish('home.offers', { items: [offer({ href: 'https://x.com' })] })).error).toBe(CONTENT_MESSAGES.adminOnlyPublish);
    getMe.mockResolvedValue(ADMIN);
    const state = await publish('home.offers', { items: [offer({ href: 'https://x.com' })] });
    expect(state.fields?.['items.0.href']).toBe(CONTENT_MESSAGES.offSite);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('keeps the saved draft when publishing fails, and does not refresh the website', async () => {
    const saved = block('home.hero', HERO, { published: { headline: 'Old', subline: 'Old text' } });
    adminRequest.mockResolvedValueOnce(saved).mockRejectedValueOnce(new PysError(500, 'INTERNAL_SERVER_ERROR', 'x'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const state = await publish('home.hero', HERO);
    log.mockRestore();
    expect(state.error).toBe(CONTENT_MESSAGES.savedNotPublished);
    expect(state.block).toBe(saved);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('returns the R7 flags when the session ended while checking the role', async () => {
    getMe.mockRejectedValue(new AdminAuthError());
    expect(await publish('home.hero', HERO)).toEqual({ authError: true });
    expect(adminRequest).not.toHaveBeenCalled();
  });
});
