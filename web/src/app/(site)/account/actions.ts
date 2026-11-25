'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PysError, pysRequest } from '@/lib/pys/client';
import { ACCOUNT_COOKIE, ACCOUNT_MAX_AGE_S, accountToken } from '@/lib/account';

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
    await pysRequest('POST', '/portal/code', { body: { email } });
  } catch {
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
    const res = await pysRequest<{ token: string; expiresAt: string }>('POST', '/portal/sign-in', { body: { email, code } });
    token = res.token;
  } catch (err) {
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
    await pysRequest('POST', '/portal/sign-out', { headers: { 'X-PYS-Customer-Session': token } }).catch(() => undefined);
  }
  (await cookies()).delete(ACCOUNT_COOKIE);
  redirect('/account');
}
