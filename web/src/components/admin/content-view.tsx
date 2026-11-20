import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { EDITABLE_BLOCKS, contentHref, editableBlock, type ContentKey } from '@/lib/admin/content';
import { loadAdmin } from '@/lib/admin/guard';
import { isEssAdmin } from '@/lib/admin/nav';
import { adminRequest, getMe } from '@/lib/admin/pys-admin';
import { formatReceived } from '@/lib/admin/requests';
import type { AdminContentBlock, AdminContentSummary } from '@/lib/admin/types';
import { FALLBACK_HERO, FALLBACK_IDENTITY } from '@/lib/data';
import { LEGAL_DEFAULTS } from '@/lib/legal';
import { PysError } from '@/lib/pys/client';
import { ContentEditor } from './content-editors/shell';
import { PysUnreachable } from './pys-link';

const LIST = '/admin/content';
const linkStyles = 'inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline';

const listBlocks = () => adminRequest<{ blocks: AdminContentSummary[] }>('GET', '/content');

/** One block from PYS, or null when PYS has never stored it (legal texts start that way). */
async function readBlock(key: string): Promise<AdminContentBlock | null> {
  try {
    return await adminRequest<AdminContentBlock>('GET', `/content/${encodeURIComponent(key)}`);
  } catch (err) {
    if (err instanceof PysError && err.status === 404) return null;
    throw err;
  }
}

/** What the website shows when PYS has nothing for a block (the editor starts from it). */
function fallbackFor(key: ContentKey): unknown {
  switch (key) {
    case 'home.hero':
      return FALLBACK_HERO;
    case 'home.offers':
    case 'faq':
      return { items: [] };
    case 'legal.privacy':
      return LEGAL_DEFAULTS.privacy;
    case 'legal.terms':
      return LEGAL_DEFAULTS.terms;
    case 'business.identity':
      return FALLBACK_IDENTITY;
  }
}

/** Where the block shows on the website, for "See it on the website". */
const PUBLIC_PAGE: Partial<Record<ContentKey, string>> = {
  'home.hero': '/',
  'home.offers': '/',
  'legal.privacy': '/legal/privacy',
  'legal.terms': '/legal/terms',
  'business.identity': '/contact',
};

function Badge({ tone, children }: { tone: 'heat' | 'cool' | 'plain'; children: string }) {
  const styles = { heat: 'bg-heat/12 text-heat', cool: 'bg-cool/12 text-cool', plain: 'bg-line/60 text-ink' }[tone];
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${styles}`}>{children}</span>;
}

/** The list of blocks (rendered per request, inside <Suspense>): version, last published, draft status. */
export async function ContentListScreen() {
  const [result, me] = await Promise.all([loadAdmin(listBlocks(), LIST), loadAdmin(getMe(), LIST)]);
  if (!result.ok || !me.ok) return <PysUnreachable retryHref={LIST} />;
  const admin = isEssAdmin(me.data.roles);
  const byKey = new Map(result.data.blocks.map((b) => [b.key, b]));

  return (
    <ul className="flex flex-col gap-4">
      {EDITABLE_BLOCKS.map((def) => {
        const b = byKey.get(def.key);
        return (
          <li key={def.key} className="glass flex flex-col gap-2 rounded-[24px] p-5 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="text-lg font-bold">
                <Link href={contentHref(def.key)} className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:text-cool hover:underline">
                  {def.title}
                </Link>
              </h2>
              {!b ? (
                <Badge tone="plain">Built-in wording</Badge>
              ) : b.hasUnpublishedChanges ? (
                <Badge tone="heat">Unpublished changes</Badge>
              ) : (
                <Badge tone="cool">Up to date</Badge>
              )}
            </div>
            <p className="text-muted">{def.about}</p>
            <p className="text-sm text-muted tabular-nums">
              {b && b.publishedVersion > 0
                ? `Version ${b.publishedVersion}${b.publishedAt ? ` · last published ${formatReceived(b.publishedAt)}` : ''}`
                : 'Not published yet'}
              {b?.hasUnpublishedChanges && b.draftUpdatedAt ? ` · draft saved ${formatReceived(b.draftUpdatedAt)}` : ''}
            </p>
            {def.adminOnly && !admin && <p className="text-sm font-semibold text-ink">Only an ESS Admin can change this.</p>}
          </li>
        );
      })}
    </ul>
  );
}

const decode = (key: string) => {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
};

/** One block's editor page. A key not edited here shows the admin "not found" without asking PYS. */
export async function ContentEditScreen({ params }: { params: Promise<{ key: string }> }) {
  const key = decode((await params).key);
  const def = editableBlock(key);
  if (!def) notFound();
  const here = contentHref(def.key);
  const [result, me] = await Promise.all([loadAdmin(readBlock(def.key), here), loadAdmin(getMe(), here)]);
  if (!result.ok || !me.ok) return <PysUnreachable retryHref={here} />;
  const page = PUBLIC_PAGE[def.key];

  return (
    <>
      <h1 className="text-[clamp(26px,3.6vw,36px)] font-bold text-ink">{def.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
        <span>{def.about}</span>
        {page && (
          <a href={page} target="_blank" rel="noopener noreferrer" aria-label="See it on the website (opens in a new tab)" className={linkStyles}>
            See it on the website
            <ExternalLink aria-hidden="true" size={16} className="ml-1 shrink-0" />
          </a>
        )}
      </div>
      <div className="mt-6">
        <ContentEditor blockKey={def.key} saved={result.data} fallback={fallbackFor(def.key)} isAdmin={isEssAdmin(me.data.roles)} />
      </div>
    </>
  );
}
