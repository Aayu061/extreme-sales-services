'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { CONTENT_MESSAGES, editableBlock, pysContentFields, validateBlock, type BlockFields } from '@/lib/admin/content';
import { isEssAdmin } from '@/lib/admin/nav';
import { AdminAuthError, AdminForbiddenError, AdminValidationError, adminRequest, getMe } from '@/lib/admin/pys-admin';
import type { AdminContentBlock } from '@/lib/admin/types';
import { PysError } from '@/lib/pys/client';

/**
 * Website text and business details: save a draft, or publish to the live website. The text is
 * checked again here with validateBlock (never trusting the browser) and only the clean value is
 * sent to PYS. PYS checks the person's role itself; these actions check it first too, so a refused
 * publish never reaches PYS.
 *
 * Publishing always saves what is on the screen as the draft first, then publishes that draft:
 * what goes live is exactly what the admin saw (not a draft someone else saved meanwhile). Then
 * the public pages' cached content (tag "content", the tag lib/data.ts reads with) is expired at
 * once (R8).
 *
 * R7: an ended session or missing access is returned as a flag ({ authError } / { forbidden }).
 */

export interface ContentActionState {
  ok?: true;
  /** The block as PYS has it now (after saving, or after publishing). */
  block?: AdminContentBlock;
  error?: string;
  fields?: BlockFields;
  authError?: true;
  forbidden?: true;
}

const LIST = '/admin/content';

const blockPath = (key: string) => `/content/${encodeURIComponent(key)}`;

/** A PYS failure as the answer the screen shows. Logs status and code only (never the text). */
function failure(err: unknown, what: 'save' | 'publish' | 'role'): ContentActionState {
  unstable_rethrow(err);
  if (err instanceof AdminAuthError) return { authError: true };
  if (err instanceof AdminForbiddenError) return { forbidden: true };
  if (err instanceof AdminValidationError) {
    const fields = pysContentFields(err.fields);
    return fields ? { fields } : { error: CONTENT_MESSAGES.notSaved };
  }
  if (err instanceof PysError && err.status === 400) return { error: CONTENT_MESSAGES.notSaved };
  console.error(`Content ${what} in PYS failed`, err instanceof PysError ? `${err.status} ${err.code}` : err instanceof Error ? err.name : 'unknown');
  return { error: CONTENT_MESSAGES.unreachable };
}

async function signedInIsAdmin(): Promise<boolean> {
  const me = await getMe();
  return isEssAdmin(me.roles);
}

/** "Save draft": stores the text in PYS without changing the website. */
export async function saveDraft(key: string, body: unknown): Promise<ContentActionState> {
  const block = typeof key === 'string' ? editableBlock(key) : null;
  if (!block) return { error: CONTENT_MESSAGES.notEditable };
  const checked = validateBlock(block.key, body);
  if (!checked.ok) return { fields: checked.fields };

  let saved: AdminContentBlock;
  try {
    // PYS keeps business and legal details for ESS Admins (drafts too).
    if (block.adminOnly && !(await signedInIsAdmin())) return { error: CONTENT_MESSAGES.adminOnlyEdit };
    saved = await adminRequest<AdminContentBlock>('PUT', blockPath(block.key), { body: checked.body });
  } catch (err) {
    return failure(err, 'save');
  }
  revalidatePath(LIST, 'layout');
  return { ok: true, block: saved };
}

/** "Publish" (ESS Admin only, for every key): saves `body` as the draft, then publishes it. */
export async function publish(key: string, body: unknown): Promise<ContentActionState> {
  const block = typeof key === 'string' ? editableBlock(key) : null;
  if (!block) return { error: CONTENT_MESSAGES.notEditable };

  try {
    if (!(await signedInIsAdmin())) return { error: CONTENT_MESSAGES.adminOnlyPublish };
  } catch (err) {
    return failure(err, 'role');
  }
  const checked = validateBlock(block.key, body);
  if (!checked.ok) return { fields: checked.fields };

  let saved: AdminContentBlock;
  try {
    saved = await adminRequest<AdminContentBlock>('PUT', blockPath(block.key), { body: checked.body });
  } catch (err) {
    return failure(err, 'save');
  }

  let published: AdminContentBlock;
  try {
    published = await adminRequest<AdminContentBlock>('POST', `${blockPath(block.key)}/publish`);
  } catch (err) {
    const answer = failure(err, 'publish');
    revalidatePath(LIST, 'layout');
    // The draft is saved: the screen keeps it as the new starting point.
    return answer.authError || answer.forbidden ? answer : { error: CONTENT_MESSAGES.savedNotPublished, block: saved };
  }
  // Public pages: expired at once (R8), so the next visitor already sees the published text.
  updateTag('content');
  revalidatePath(LIST, 'layout');
  return { ok: true, block: published };
}
