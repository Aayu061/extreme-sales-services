'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { publish, saveDraft, type ContentActionState } from '@/app/admin/actions/content';
import { Button } from '@/components/ui/button';
import {
  CONTENT_MESSAGES,
  editableBlock,
  editableBody,
  sameBody,
  validateBlock,
  type BlockFields,
  type BlockForm,
  type ContentKey,
  type FaqForm,
  type HeroForm,
  type IdentityForm,
  type LegalForm,
  type OffersForm,
} from '@/lib/admin/content';
import { formatReceived } from '@/lib/admin/requests';
import type { AdminContentBlock } from '@/lib/admin/types';
import { PendingButton } from '../pending-button';
import { FaqFields } from './faq';
import { HeroFields } from './hero';
import { IdentityFields } from './identity';
import { LegalFields } from './legal';
import { OffersFields } from './offers';

interface Props {
  blockKey: ContentKey;
  /** The block as PYS has it, or null when PYS has never stored it (the website shows built-in text). */
  saved: AdminContentBlock | null;
  /** What the website shows when PYS has nothing: the editor starts from it. */
  fallback: unknown;
  isAdmin: boolean;
}

interface Stored {
  draft: unknown | null;
  published: unknown | null;
  version: number;
  publishedAt: string | null;
}

const storedOf = (b: AdminContentBlock | null): Stored =>
  b ? { draft: b.draft ?? null, published: b.published ?? null, version: b.publishedVersion, publishedAt: b.publishedAt } : { draft: null, published: null, version: 0, publishedAt: null };

/** The owner's rule for anything shown on the website. A reminder, not a check. */
export function ClaimsReminder() {
  return (
    <p role="note" className="rounded-2xl border border-line bg-surface/85 px-4 py-3 text-sm text-ink">
      Everything here is shown on the website. Only write what is true and confirmed: don&apos;t promise arrival times, don&apos;t call parts or ACs
      &ldquo;genuine&rdquo; or &ldquo;OEM&rdquo;, don&apos;t mention &ldquo;certified&rdquo; or &ldquo;verified&rdquo; technicians, and don&apos;t add reviews.
    </p>
  );
}

function BlockFieldsFor({ blockKey, ...props }: { blockKey: ContentKey; value: BlockForm; onChange: (v: BlockForm) => void; errors: BlockFields; disabled: boolean }) {
  switch (blockKey) {
    case 'home.hero':
      return <HeroFields {...props} value={props.value as HeroForm} />;
    case 'home.offers':
      return <OffersFields {...props} value={props.value as OffersForm} />;
    case 'faq':
      return <FaqFields {...props} value={props.value as FaqForm} />;
    case 'legal.privacy':
    case 'legal.terms':
      return <LegalFields {...props} value={props.value as LegalForm} />;
    case 'business.identity':
      return <IdentityFields {...props} value={props.value as IdentityForm} />;
  }
}

/**
 * One block's editor: its status (version, last published, unpublished changes), the fields, and
 * "Save draft" / "Publish". Publish is for ESS Admin only (PYS refuses everyone else, for every
 * key) and asks first. ESS Staff can save drafts of the home page text and questions; business
 * and legal details are read-only for them, because PYS keeps those for ESS Admins.
 */
export function ContentEditor({ blockKey, saved, fallback, isAdmin }: Props) {
  const def = editableBlock(blockKey)!;
  const canEdit = isAdmin || !def.adminOnly;
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const publishRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  const [stored, setStored] = useState<Stored>(() => storedOf(saved));
  const [value, setValue] = useState<BlockForm>(() => editableBody(blockKey, saved?.draft ?? null, fallback));
  const [errors, setErrors] = useState<BlockFields>({});
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [, startTransition] = useTransition();
  // A second press while one is on its way is ignored: the buttons are disabled once React has
  // re-rendered, and this ref covers a click that lands before that.
  const inFlight = useRef(false);

  const baseline = useMemo(() => editableBody(blockKey, stored.draft, fallback), [blockKey, stored.draft, fallback]);
  const dirty = !sameBody(value, baseline);
  const unpublished = stored.draft !== null && !sameBody(stored.draft, stored.published);

  // After a check or PYS refuses a field, move to the first one with a message.
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  useEffect(() => {
    if (asking) yesRef.current?.focus();
  }, [asking]);

  function check(): boolean {
    const result = validateBlock(blockKey, value);
    if (result.ok) {
      setErrors({});
      return true;
    }
    setErrors(result.fields);
    setMessage(result.fields.form ?? CONTENT_MESSAGES.checkFields);
    setNotice(null);
    return false;
  }

  function settle(result: ContentActionState, done: string) {
    if (result.block) {
      setStored(storedOf(result.block));
      setValue(editableBody(blockKey, result.block.draft, fallback));
    }
    if (result.authError) {
      setMessage(CONTENT_MESSAGES.signIn);
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/admin/login?${new URLSearchParams({ expired: '1', next })}`);
    } else if (result.forbidden) {
      setMessage(CONTENT_MESSAGES.forbidden);
      router.replace('/admin/no-access');
    } else if (result.ok) {
      setErrors({});
      setMessage(null);
      setNotice(done);
      router.refresh();
    } else if (result.fields) {
      setErrors(result.fields);
      setMessage(result.fields.form ?? CONTENT_MESSAGES.checkFields);
    } else {
      setMessage(result.error ?? CONTENT_MESSAGES.unreachable);
      if (result.block) router.refresh();
    }
  }

  function run(kind: 'save' | 'publish') {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setMessage(null);
    setNotice(null);
    const body = value;
    startTransition(async () => {
      let result: ContentActionState;
      try {
        result = kind === 'save' ? await saveDraft(blockKey, body) : await publish(blockKey, body);
      } catch {
        result = { error: CONTENT_MESSAGES.unreachable };
      } finally {
        inFlight.current = false;
      }
      setBusy(null);
      setAsking(false);
      settle(result, kind === 'publish' ? CONTENT_MESSAGES.published : isAdmin ? CONTENT_MESSAGES.saved : CONTENT_MESSAGES.savedStaff);
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || busy || inFlight.current || asking) return;
    if (check()) run('save');
  }

  function askToPublish() {
    if (busy || inFlight.current) return;
    if (check()) {
      setMessage(null);
      setNotice(null);
      setAsking(true);
    }
  }

  const neverStored = saved === null && stored.draft === null;

  return (
    <div ref={root} className="flex flex-col gap-5">
      <div className="glass flex flex-col gap-2 rounded-[24px] p-4 text-ink sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {neverStored ? (
            <span className="rounded-full bg-line/60 px-3 py-1 text-sm font-semibold text-ink">Built-in wording</span>
          ) : unpublished ? (
            <span className="rounded-full bg-heat/12 px-3 py-1 text-sm font-semibold text-heat">Unpublished changes</span>
          ) : (
            <span className="rounded-full bg-cool/12 px-3 py-1 text-sm font-semibold text-cool">Up to date</span>
          )}
          <span className="text-muted tabular-nums">
            {stored.version > 0 ? `Version ${stored.version}${stored.publishedAt ? ` · published ${formatReceived(stored.publishedAt)}` : ''}` : 'Not published yet'}
          </span>
        </div>
        <p className="text-muted">
          {neverStored
            ? 'PYS has no saved text for this yet, so the website shows the text below. Save a draft to change it; publish to put it on the website.'
            : unpublished
              ? 'The saved draft is different from what the website shows. Publish it to put it on the website.'
              : 'The website shows the saved text.'}
        </p>
      </div>

      {def.claimsReminder && <ClaimsReminder />}
      {def.adminOnly && !isAdmin && (
        <div className="rounded-2xl border border-line bg-surface/85 px-4 py-3 text-ink">
          <p className="font-semibold">Only an ESS Admin can publish this.</p>
          <p className="mt-1 text-sm text-muted">Business and legal details are also changed only by an ESS Admin, so you can read them here but not save a draft.</p>
        </div>
      )}

      <div role="status">{notice && <p className="rounded-2xl bg-cool/12 px-4 py-3 font-semibold text-cool">{notice}</p>}</div>
      {message && (
        <p role="alert" className="rounded-2xl bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
          {message}
        </p>
      )}

      <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-5">
        <div className="glass min-w-0 rounded-[24px] p-4 text-ink sm:p-5">
          <BlockFieldsFor
            blockKey={blockKey}
            value={value}
            onChange={(v) => {
              setValue(v);
              setNotice(null);
            }}
            errors={errors}
            disabled={!canEdit}
          />
        </div>

        {canEdit && (
          <div className="glass sticky bottom-3 z-10 flex flex-col gap-3 rounded-[24px] p-4 text-ink">
            {dirty && <p className="text-sm font-semibold text-ink">You have changes that are not saved yet.</p>}
            {!isAdmin && <p className="text-sm text-muted">An ESS Admin publishes it to the website.</p>}
            {asking ? (
              <div className="flex flex-col gap-3">
                <p className="font-semibold">Publish to the live website?</p>
                <p className="text-sm text-muted">Everyone visiting the website sees this text at once. It is also kept as the saved draft.</p>
                <div className="flex flex-wrap gap-3">
                  <PendingButton ref={yesRef} type="button" size="sm" pending={busy === 'publish'} pendingLabel="Publishing…" onClick={() => run('publish')}>
                    Yes, publish
                  </PendingButton>
                  <Button
                    variant="glass"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => {
                      setAsking(false);
                      requestAnimationFrame(() => publishRef.current?.focus());
                    }}
                  >
                    No, go back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <PendingButton variant={isAdmin ? 'glass' : 'taxi'} size="sm" pending={busy === 'save'} disabled={busy !== null} pendingLabel="Saving…">
                  Save draft
                </PendingButton>
                {isAdmin && (
                  <Button ref={publishRef} size="sm" disabled={busy !== null} onClick={askToPublish}>
                    Publish
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
