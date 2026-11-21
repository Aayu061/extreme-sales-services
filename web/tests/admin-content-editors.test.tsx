// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Activity, type ReactElement } from 'react';

// ---- Fakes: the server actions, the router, PYS answers by path, redirect()/notFound() throwing like Next ----

type State = Record<string, unknown>;
const saveDraft = vi.fn<(key: string, body: unknown) => Promise<State>>();
const publish = vi.fn<(key: string, body: unknown) => Promise<State>>();
vi.mock('@/app/admin/actions/content', () => ({
  saveDraft: (key: string, body: unknown) => saveDraft(key, body),
  publish: (key: string, body: unknown) => publish(key, body),
}));

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
class Redirected extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/content',
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  notFound: () => {
    throw new NotFound('not found');
  },
  unstable_rethrow: (err: unknown) => {
    if (err instanceof Redirected || err instanceof NotFound) throw err;
  },
}));

const answers = new Map<string, unknown>();
const adminRequest = vi.fn(async (_method: string, path: string) => {
  const a = answers.get(path);
  if (a instanceof Error) throw a;
  if (a === undefined) throw new Error(`unexpected PYS call ${path}`);
  return a;
});
const me = { current: { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'a@example.com' } as unknown };
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (method: string, path: string) => adminRequest(method, path),
  getMe: async () => me.current,
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-ess-admin-path': '/admin/content' }) }));

import { PysError } from '@/lib/pys/client';
import { FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';
import { LEGAL_DEFAULTS } from '@/lib/legal';
import type { AdminContentBlock, AdminContentSummary } from '@/lib/admin/types';
import { ContentEditor } from '@/components/admin/content-editors/shell';
import { SiteFooter } from '@/components/site/site-footer';
import { CONTENT_MESSAGES, validateBlock } from '@/lib/admin/content';
import type { BusinessIdentity } from '@/lib/pys/types';
import { ContentEditScreen, ContentListScreen } from '@/components/admin/content-view';

const ADMIN = { roles: ['ESS_ADMIN'], isPysAdmin: false, name: 'Test Admin', email: 'a@example.com' };
const STAFF = { roles: ['ESS_STAFF'], isPysAdmin: false, name: 'Test Staff', email: 's@example.com' };

const HERO = { headline: 'What does your AC need?', subline: 'Servicing, repairs, AMC plans and new ACs across Mumbai.' };

const block = (key: string, draft: unknown, extra: Partial<AdminContentBlock> = {}): AdminContentBlock => ({
  key,
  draft,
  published: draft,
  publishedVersion: 2,
  publishedAt: '2026-11-19T10:00:00Z',
  draftUpdatedAt: '2026-11-19T10:00:00Z',
  adminOnly: /^(business|legal)\./.test(key),
  history: [],
  ...extra,
});

beforeEach(() => {
  saveDraft.mockReset();
  publish.mockReset();
  router.replace.mockClear();
  router.refresh.mockClear();
  answers.clear();
  adminRequest.mockClear();
  me.current = ADMIN;
});
afterEach(() => cleanup());

const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });

function hero(props: { isAdmin?: boolean; saved?: AdminContentBlock | null } = {}) {
  return render(<ContentEditor blockKey="home.hero" saved={props.saved === undefined ? block('home.hero', HERO) : props.saved} fallback={FALLBACK_HERO} isAdmin={props.isAdmin ?? true} />);
}

describe('ContentEditor: the reminder and who sees which buttons', () => {
  it('shows the "no unconfirmed claims" reminder on the hero editor', () => {
    hero();
    const note = screen.getByRole('note');
    expect(note.textContent).toMatch(/arrival times/);
    expect(note.textContent).toMatch(/genuine/);
    expect(note.textContent).toMatch(/certified/);
    expect(note.textContent).toMatch(/reviews/);
  });

  it('shows the reminder on offers, questions and business details too, but not on legal text', () => {
    const { unmount } = render(<ContentEditor blockKey="home.offers" saved={block('home.offers', { items: [] })} fallback={{ items: [] }} isAdmin />);
    expect(screen.getByRole('note').textContent).toMatch(/arrival times/);
    unmount();
    const faq = render(<ContentEditor blockKey="faq" saved={block('faq', { items: [] })} fallback={{ items: [] }} isAdmin />);
    expect(screen.getByRole('note').textContent).toMatch(/arrival times/);
    faq.unmount();
    const id = render(<ContentEditor blockKey="business.identity" saved={block('business.identity', FALLBACK_IDENTITY)} fallback={FALLBACK_IDENTITY} isAdmin />);
    expect(screen.getByRole('note').textContent).toMatch(/arrival times/);
    id.unmount();
    render(<ContentEditor blockKey="legal.terms" saved={null} fallback={LEGAL_DEFAULTS.terms} isAdmin />);
    expect(screen.queryByText(/arrival times/)).toBeNull();
  });

  it('has no Publish for ESS Staff on business.identity, and says only an ESS Admin can publish it', () => {
    render(<ContentEditor blockKey="business.identity" saved={block('business.identity', FALLBACK_IDENTITY)} fallback={FALLBACK_IDENTITY} isAdmin={false} />);
    expect(screen.queryByRole('button', { name: /publish/i })).toBeNull();
    expect(screen.getByText('Only an ESS Admin can publish this.')).toBeTruthy();
    // PYS keeps changes to business details for ESS Admins too: read-only for staff.
    expect(screen.queryByRole('button', { name: /save draft/i })).toBeNull();
    expect(field(/^Phone/).disabled).toBe(true);
  });

  it('gives ESS Staff "Save draft" only on the home page text', () => {
    hero({ isAdmin: false });
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /publish/i })).toBeNull();
  });

  it('gives an ESS Admin both buttons', () => {
    hero();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
  });
});

describe('ContentEditor: draft status', () => {
  it('shows "Unpublished changes" when the saved draft differs from the published version', () => {
    hero({ saved: block('home.hero', { headline: 'Cool rooms', subline: HERO.subline }, { published: HERO }) });
    expect(screen.getByText('Unpublished changes')).toBeTruthy();
  });

  it('does not show it when they are the same (whatever the order of the fields)', () => {
    hero({ saved: block('home.hero', { subline: HERO.subline, headline: HERO.headline }, { published: HERO }) });
    expect(screen.queryByText('Unpublished changes')).toBeNull();
    expect(screen.getByText(/Version 2/)).toBeTruthy();
  });

  it('shows the badge after a draft is saved, and says changes typed are not saved yet', async () => {
    const changed = { headline: 'Cool rooms', subline: HERO.subline };
    saveDraft.mockResolvedValue({ ok: true, block: block('home.hero', changed, { published: HERO }) });
    hero();
    type('Headline', 'Cool rooms');
    expect(screen.getByText(/not saved yet/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByText('Unpublished changes')).toBeTruthy());
    expect(saveDraft).toHaveBeenCalledWith('home.hero', changed);
    expect(screen.queryByText(/not saved yet/i)).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/Draft saved/);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('says when the website still shows its built-in wording (never saved in PYS)', () => {
    render(<ContentEditor blockKey="legal.privacy" saved={null} fallback={LEGAL_DEFAULTS.privacy} isAdmin />);
    expect(screen.getByText(/built-in wording/i)).toBeTruthy();
    expect(screen.queryByText('Unpublished changes')).toBeNull();
  });
});

describe('ContentEditor: kept by Next while the text changes elsewhere', () => {
  // Next (Cache Components) keeps a page the person leaves in a hidden <Activity> and shows it
  // again with fresh server data: the editor must follow that data, not the copy it started with.
  const NEWER = { headline: 'Cool rooms all summer', subline: HERO.subline };
  const page = (mode: 'visible' | 'hidden', saved: AdminContentBlock) => (
    <Activity mode={mode}>
      <ContentEditor blockKey="home.hero" saved={saved} fallback={FALLBACK_HERO} isAdmin />
    </Activity>
  );

  it('shows the newer draft and its "Unpublished changes" badge', async () => {
    const { rerender } = render(page('visible', block('home.hero', HERO)));
    expect(screen.getByText('Up to date')).toBeTruthy();
    await act(async () => rerender(page('hidden', block('home.hero', HERO))));
    await act(async () => rerender(page('visible', block('home.hero', NEWER, { published: HERO }))));
    expect(field('Headline').value).toBe(NEWER.headline);
    expect(screen.getByText('Unpublished changes')).toBeTruthy();
    expect(screen.queryByText(CONTENT_MESSAGES.changedElsewhere)).toBeNull();
  });

  it('says so when it replaces changes that were not saved, and a save then starts from the newer draft', async () => {
    saveDraft.mockResolvedValue({ ok: true, block: block('home.hero', NEWER, { published: HERO }) });
    const { rerender } = render(page('visible', block('home.hero', HERO)));
    type('Headline', 'Typed here');
    await act(async () => rerender(page('hidden', block('home.hero', HERO))));
    await act(async () => rerender(page('visible', block('home.hero', NEWER, { published: HERO }))));
    expect(field('Headline').value).toBe(NEWER.headline);
    expect(screen.getByText(CONTENT_MESSAGES.changedElsewhere)).toBeTruthy();
    expect(screen.queryByText(/not saved yet/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledWith('home.hero', NEWER));
  });

  it('keeps "Draft saved" when the fresh block arrives after saving', async () => {
    const changed = { headline: 'Cool rooms', subline: HERO.subline };
    saveDraft.mockResolvedValue({ ok: true, block: block('home.hero', changed, { published: HERO }) });
    const { rerender } = render(page('visible', block('home.hero', HERO)));
    type('Headline', 'Cool rooms');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Draft saved/));
    await act(async () => rerender(page('visible', block('home.hero', changed, { published: HERO }))));
    expect(screen.getByRole('status').textContent).toMatch(/Draft saved/);
    expect(screen.queryByText(CONTENT_MESSAGES.changedElsewhere)).toBeNull();
  });
});

describe('ContentEditor: saving and publishing', () => {
  it('saves the draft once on a double click', async () => {
    let resolve: (s: State) => void = () => {};
    saveDraft.mockImplementation(() => new Promise((r) => (resolve = r)));
    hero();
    const button = screen.getByRole('button', { name: 'Save draft' });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => resolve({ ok: true, block: block('home.hero', HERO) }));
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('asks "Publish to the live website?" first, and publishes only on yes', async () => {
    publish.mockResolvedValue({ ok: true, block: block('home.hero', HERO, { publishedVersion: 3 }) });
    hero();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Publish to the live website?')).toBeTruthy();
    expect(publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'No, go back' }));
    expect(screen.queryByText('Publish to the live website?')).toBeNull();
    expect(publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const yes = screen.getByRole('button', { name: 'Yes, publish' });
    fireEvent.click(yes);
    fireEvent.click(yes);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Published/));
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith('home.hero', HERO);
    expect(screen.getByText(/Version 3/)).toBeTruthy();
  });

  it('checks the text before asking, and does not ask when something is wrong', () => {
    hero();
    type('Headline', '  ');
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.queryByText('Publish to the live website?')).toBeNull();
    expect(field('Headline').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toMatch(/check/i);
    expect(publish).not.toHaveBeenCalled();
  });

  it('sends an ended session to sign in again, coming back here', async () => {
    saveDraft.mockResolvedValue({ authError: true });
    hero();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(router.replace.mock.calls[0][0]).toMatch(/^\/admin\/login\?expired=1&next=/);
  });

  it('sends no access to the no-access page', async () => {
    publish.mockResolvedValue({ forbidden: true });
    hero();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, publish' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/no-access'));
  });

  it("shows PYS's field messages next to the fields", async () => {
    saveDraft.mockResolvedValue({ fields: { phone: 'Too small: expected string to have >=6 characters' } });
    render(<ContentEditor blockKey="business.identity" saved={block('business.identity', FALLBACK_IDENTITY)} fallback={FALLBACK_IDENTITY} isAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByText('Too small: expected string to have >=6 characters')).toBeTruthy());
    expect(field(/^Phone/).getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Business details and the footer', () => {
  it('says empty grievance contacts are saved as the business email and phone', () => {
    render(<ContentEditor blockKey="business.identity" saved={block('business.identity', FALLBACK_IDENTITY)} fallback={FALLBACK_IDENTITY} isAdmin />);
    expect(screen.getByText(/empty email or phone is saved as the business email and phone/i)).toBeTruthy();
  });

  it('shows a complaints contact in the footer for business details saved without one', () => {
    const r = validateBlock('business.identity', { ...FALLBACK_IDENTITY, grievanceOfficer: { name: null, email: '', phone: '' } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    render(<SiteFooter identity={r.body as unknown as BusinessIdentity} />);
    const box = screen.getByText('Complaints').parentElement as HTMLElement;
    expect(within(box).getByRole('link', { name: FALLBACK_IDENTITY.email })).toBeTruthy();
    expect(within(box).getByText(FALLBACK_IDENTITY.phone)).toBeTruthy();
  });
});

describe('Offers editor', () => {
  it('says to use a page of this site for a link to another website, without saving', () => {
    render(<ContentEditor blockKey="home.offers" saved={block('home.offers', { items: [] })} fallback={{ items: [] }} isAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Add an offer' }));
    type('Title', 'Jet wash week');
    type(/^Link to a page/, 'https://x.com');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Use a page of this site, e.g. /amc')).toBeTruthy();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('saves an offer with a page of this site', async () => {
    saveDraft.mockResolvedValue({ ok: true, block: block('home.offers', { items: [] }) });
    render(<ContentEditor blockKey="home.offers" saved={block('home.offers', { items: [] })} fallback={{ items: [] }} isAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Add an offer' }));
    type('Title', 'Jet wash week');
    type(/^Link to a page/, '/amc');
    type(/^Link text/, 'Compare AMC plans');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    expect(saveDraft.mock.calls[0][1]).toEqual({ items: [{ title: 'Jet wash week', text: '', href: '/amc', linkLabel: 'Compare AMC plans', endsOn: '' }] });
  });
});

describe('Legal editor', () => {
  const legal = { title: 'Terms', updatedOn: '2026-11-20', sections: [
    { heading: 'Prices', paragraphs: ['Include GST.'] },
    { heading: 'Visits', paragraphs: ['We confirm by phone.'] },
  ] };

  it('shows each section as a heading and paragraphs, with labelled add / remove / move buttons', () => {
    render(<ContentEditor blockKey="legal.terms" saved={block('legal.terms', legal)} fallback={LEGAL_DEFAULTS.terms} isAdmin />);
    expect((screen.getByLabelText('Section 1 heading') as HTMLInputElement).value).toBe('Prices');
    expect((screen.getByLabelText('Section 2, paragraph 1') as HTMLTextAreaElement).value).toBe('We confirm by phone.');
    expect(screen.getByRole('button', { name: 'Move section 1 up' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move section 2 down' }).hasAttribute('disabled')).toBe(true);
    for (const name of ['Move section 1 down', 'Remove section 1', 'Add a paragraph to section 1', 'Remove paragraph 1 of section 1', 'Add a section']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('moves, adds and removes sections and paragraphs', async () => {
    saveDraft.mockResolvedValue({ ok: true, block: block('legal.terms', legal) });
    render(<ContentEditor blockKey="legal.terms" saved={block('legal.terms', legal)} fallback={LEGAL_DEFAULTS.terms} isAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Move section 1 down' }));
    expect((screen.getByLabelText('Section 1 heading') as HTMLInputElement).value).toBe('Visits');
    // Focus follows the section that moved.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move section 2 up' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add a paragraph to section 2' }));
    fireEvent.change(screen.getByLabelText('Section 2, paragraph 2'), { target: { value: 'Ask before extra work.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add a section' }));
    fireEvent.change(screen.getByLabelText('Section 3 heading'), { target: { value: 'Complaints' } });
    fireEvent.change(screen.getByLabelText('Section 3, paragraph 1'), { target: { value: 'Write to {email}.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove section 1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    expect(saveDraft.mock.calls[0][1]).toEqual({
      title: 'Terms',
      updatedOn: '2026-11-20',
      sections: [
        { heading: 'Prices', paragraphs: ['Include GST.', 'Ask before extra work.'] },
        { heading: 'Complaints', paragraphs: ['Write to {email}.'] },
      ],
    });
  });
});

// ---------------------------------------------------------------- screens

const summary = (key: string, extra: Partial<AdminContentSummary> = {}): AdminContentSummary => ({
  key,
  publishedVersion: 2,
  publishedAt: '2026-11-19T10:00:00Z',
  draftUpdatedAt: '2026-11-19T10:00:00Z',
  hasUnpublishedChanges: false,
  adminOnly: /^(business|legal)\./.test(key),
  ...extra,
});

describe('ContentListScreen', () => {
  it("shows each block's version, last published date and draft status, and only the blocks edited here", async () => {
    answers.set('/content', {
      blocks: [summary('business.identity'), summary('faq', { publishedVersion: 1 }), summary('home.hero', { publishedVersion: 4, hasUnpublishedChanges: true }), summary('home.offers'), summary('seo.extra')],
    });
    render((await ContentListScreen()) as ReactElement);
    const heroRow = screen.getByRole('link', { name: /Home page heading/ }).closest('li') as HTMLElement;
    expect(within(heroRow).getByText(/Version 4/)).toBeTruthy();
    expect(within(heroRow).getByText(/19 Nov 2026/)).toBeTruthy();
    expect(within(heroRow).getByText('Unpublished changes')).toBeTruthy();
    const faqRow = screen.getByRole('link', { name: /Questions and answers/ }).closest('li') as HTMLElement;
    expect(within(faqRow).getByText('Up to date')).toBeTruthy();
    // legal.* is not in PYS yet: the site shows its built-in wording.
    const privacyRow = screen.getByRole('link', { name: /Privacy notice/ }).closest('li') as HTMLElement;
    expect(within(privacyRow).getByText(/built-in wording/i)).toBeTruthy();
    expect(screen.queryByText(/seo\.extra/)).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('marks the blocks only an ESS Admin can change, for ESS Staff', async () => {
    me.current = STAFF;
    answers.set('/content', { blocks: [summary('business.identity'), summary('home.hero')] });
    render((await ContentListScreen()) as ReactElement);
    const row = screen.getByRole('link', { name: /Business details/ }).closest('li') as HTMLElement;
    expect(within(row).getByText(/Only an ESS Admin can change this/)).toBeTruthy();
  });

  it("says when PYS can't be reached", async () => {
    answers.set('/content', new PysError(503, 'PYS_UNREACHABLE', 'down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render((await ContentListScreen()) as ReactElement);
    log.mockRestore();
    expect(screen.getByRole('alert').textContent).toMatch(/couldn.t reach PYS/);
  });
});

describe('ContentEditScreen', () => {
  it('shows the editor for a block, with its heading', async () => {
    answers.set('/content/home.hero', block('home.hero', HERO));
    render((await ContentEditScreen({ params: Promise.resolve({ key: 'home.hero' }) })) as ReactElement);
    expect(screen.getByRole('heading', { level: 1, name: 'Home page heading' })).toBeTruthy();
    expect(field('Headline').value).toBe(HERO.headline);
  });

  it('starts a legal text PYS does not have yet from the built-in wording', async () => {
    answers.set('/content/legal.privacy', new PysError(404, 'NOT_FOUND', 'Content block not found'));
    render((await ContentEditScreen({ params: Promise.resolve({ key: 'legal.privacy' }) })) as ReactElement);
    expect((screen.getByLabelText('Section 1 heading') as HTMLInputElement).value).toBe(LEGAL_DEFAULTS.privacy.sections[0].heading);
  });

  it('shows the admin "not found" for a key not edited here, without asking PYS', async () => {
    await expect(ContentEditScreen({ params: Promise.resolve({ key: 'seo.extra' }) })).rejects.toBeInstanceOf(NotFound);
    expect(adminRequest).not.toHaveBeenCalled();
  });
});
