'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashClientIp } from '@/lib/client-ip';
import { serverEnv } from '@/lib/env';
import { PysError, pysRequest } from '@/lib/pys/client';
import { ACCOUNT_COOKIE, ACCOUNT_MAX_AGE_S, accountToken, isPortalOff, isPortalRef } from '@/lib/account';

const PORTAL_OFF_TEXT = 'Customer login is not available right now. You can still track a request with its code.';
const RATE_LIMITED_TEXT = 'Too many tries from this connection. Please wait an hour and try again.';

/** PYS refused because this connection (by its IP fingerprint) has made too many tries. */
const isRateLimited = (err: unknown) => err instanceof PysError && err.status === 429 && err.code === 'RATE_LIMITED';

/** Same one-way IP fingerprint as /track, so PYS can limit tries per connection without the address. */
async function clientIpHash(): Promise<string | undefined> {
  return hashClientIp(await headers(), serverEnv().PYS_INTEGRATION_SECRET ?? '');
}

export interface SignInState {
  step: 'email' | 'code';
  email: string;
  error?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

/** Step 1: ask PYS to email a code. The answer is the same whether or not the email has an account. */
export async function requestCode(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = text(formData, 'email').toLowerCase();
  if (!EMAIL_RE.test(email)) return { step: 'email', email, error: 'Enter the email address we have for you, like name@example.com.' };
  try {
    await pysRequest('POST', '/portal/code', { body: { email, clientIpHash: await clientIpHash() } });
  } catch (err) {
    if (isPortalOff(err)) return { step: 'email', email, error: PORTAL_OFF_TEXT };
    if (isRateLimited(err)) return { step: 'email', email, error: RATE_LIMITED_TEXT };
    return { step: 'email', email, error: 'We could not send a code right now. Please try again in a minute.' };
  }
  return {
    step: 'code',
    email,
    message: `If ${email} has an account with us, we have emailed a 6-digit code. It works for 10 minutes.`,
  };
}

/** Step 2: check the code; on success keep the session in an httpOnly cookie and show the account. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = text(formData, 'email').toLowerCase();
  const code = text(formData, 'code').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return { step: 'code', email, error: 'Enter the 6-digit code from the email.' };
  let token: string;
  try {
    const res = await pysRequest<{ token: string; expiresAt: string }>('POST', '/portal/sign-in', {
      body: { email, code, clientIpHash: await clientIpHash() },
    });
    token = res.token;
  } catch (err) {
    if (isPortalOff(err)) return { step: 'code', email, error: PORTAL_OFF_TEXT };
    if (isRateLimited(err)) return { step: 'code', email, error: RATE_LIMITED_TEXT };
    if (err instanceof PysError && err.status === 401) {
      return { step: 'code', email, error: 'That code is not right or has expired. Check the email, or ask for a new code.' };
    }
    return { step: 'code', email, error: 'We could not sign you in right now. Please try again in a minute.' };
  }
  (await cookies()).set(ACCOUNT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.SITE_URL?.startsWith('http://'),
    sameSite: 'lax',
    path: '/',
    maxAge: ACCOUNT_MAX_AGE_S,
  });
  redirect('/account');
}

export async function signOut(): Promise<void> {
  const token = await accountToken();
  if (token) {
    // The cookie is removed even when PYS cannot be reached: this browser is signed out either way and the token is
    // gone from it. The PYS session then ends on its own (7 days idle at most); "Sign out everywhere" on the profile
    // page ends it at once and reports a failure.
    await pysRequest('POST', '/portal/sign-out', { headers: { 'X-PYS-Customer-Session': token } }).catch(() => undefined);
  }
  (await cookies()).delete(ACCOUNT_COOKIE);
  redirect('/account');
}

// ---------------------------------------------------------------------------------------------------------------
// S11b customer portal v2: renew an AMC, ask staff to change details, sign out everywhere.
// The customer is always the one in the session cookie; the browser only says which of their contracts.
// ---------------------------------------------------------------------------------------------------------------

const SESSION_ENDED_TEXT = 'Your session has ended. Please sign in again.';
const TRY_AGAIN_TEXT = 'We could not send this right now. Please try again in a minute, or call us.';
const NOT_RENEWABLE_TEXT = 'This contract cannot be renewed online right now. Please call us and we will help you renew it.';

/** Shown on an account page after PYS said the session has ended: removes the old cookie (only if PYS agrees). */
export async function forgetEndedSession(): Promise<void> {
  const token = await accountToken();
  if (!token) return;
  try {
    await pysRequest('GET', '/portal/me', { headers: { 'X-PYS-Customer-Session': token } });
  } catch (err) {
    if (err instanceof PysError && err.status === 401) (await cookies()).delete(ACCOUNT_COOKIE);
  }
}

export interface PortalFormState {
  status: 'idle' | 'done' | 'error';
  reference?: string;
  /** Renewal only: a request for this contract was already open, so nothing new was sent (its reference is shown). */
  already?: boolean;
  error?: string;
  /** What the customer typed, kept when there is an error so they do not lose it. */
  value?: string;
}

/** "Renew this AMC": an AMC_RENEWAL request in the PYS approval inbox. No payment online; staff call to confirm. */
export async function renewAmc(_prev: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const id = text(formData, 'contractId');
  const note = text(formData, 'note');
  if (!isPortalRef(id)) return { status: 'error', error: TRY_AGAIN_TEXT };
  if (note.length > 500) return { status: 'error', error: 'Keep the note under 500 characters.', value: note };
  const token = await accountToken();
  if (!token) return { status: 'error', error: SESSION_ENDED_TEXT, value: note };
  try {
    const res = await pysRequest<{ requested: boolean; reference: string; alreadyRequested?: boolean }>(
      'POST',
      `/portal/amc/${encodeURIComponent(id)}/renew`,
      { headers: { 'X-PYS-Customer-Session': token }, body: note ? { note } : {} }
    );
    return res.alreadyRequested === true
      ? { status: 'done', reference: res.reference, already: true }
      : { status: 'done', reference: res.reference };
  } catch (err) {
    if (err instanceof PysError && err.status === 503 && err.code === 'PORTAL_OFF') return { status: 'error', error: PORTAL_OFF_TEXT, value: note };
    if (err instanceof PysError && err.status === 401) return { status: 'error', error: SESSION_ENDED_TEXT, value: note };
    if (err instanceof PysError && err.status === 404) return { status: 'error', error: 'We could not find this contract on your account. Please call us.' };
    // Trying again cannot help here (the contract is outside the renewal window or not renewable online).
    if (err instanceof PysError && err.status === 409) return { status: 'error', error: NOT_RENEWABLE_TEXT, value: note };
    if (err instanceof PysError && err.status === 400) return { status: 'error', error: 'Please check the note (plain text, at most 500 characters).', value: note };
    if (isRateLimited(err)) return { status: 'error', error: 'Too many requests. Please wait a while and try again, or call us.', value: note };
    return { status: 'error', error: TRY_AGAIN_TEXT, value: note };
  }
}

/** "Request a change" on the profile: customers cannot edit their details; this asks staff to do it. */
export async function requestProfileChange(_prev: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const message = text(formData, 'message');
  if (message.length < 5) return { status: 'error', error: 'Tell us what to change (at least 5 characters).', value: message };
  if (message.length > 1000) return { status: 'error', error: 'Keep the message under 1000 characters.', value: message };
  const token = await accountToken();
  if (!token) return { status: 'error', error: SESSION_ENDED_TEXT, value: message };
  try {
    const res = await pysRequest<{ requested: boolean; reference: string }>('POST', '/portal/profile/change-request', {
      headers: { 'X-PYS-Customer-Session': token },
      body: { message },
    });
    return { status: 'done', reference: res.reference };
  } catch (err) {
    if (err instanceof PysError && err.status === 503 && err.code === 'PORTAL_OFF') return { status: 'error', error: PORTAL_OFF_TEXT, value: message };
    if (err instanceof PysError && err.status === 401) return { status: 'error', error: SESSION_ENDED_TEXT, value: message };
    if (isRateLimited(err)) {
      return { status: 'error', error: 'You have sent 5 change requests today. Please try again tomorrow, or call us.', value: message };
    }
    if (err instanceof PysError && err.status === 400) {
      return { status: 'error', error: 'Please write between 5 and 1000 characters of plain text.', value: message };
    }
    return { status: 'error', error: TRY_AGAIN_TEXT, value: message };
  }
}

/** Ends every session this customer has (phones, other computers and this one), then shows the sign-in form. */
export async function signOutAll(): Promise<PortalFormState> {
  const token = await accountToken();
  if (token) {
    try {
      await pysRequest('POST', '/portal/sign-out-all', { headers: { 'X-PYS-Customer-Session': token } });
    } catch (err) {
      // An ended session is already signed out here; anything else means the other devices may still be signed in.
      if (!(err instanceof PysError && err.status === 401)) {
        return { status: 'error', error: 'We could not sign out your other devices right now. Please try again in a minute.' };
      }
    }
  }
  (await cookies()).delete(ACCOUNT_COOKIE);
  redirect('/account');
}
