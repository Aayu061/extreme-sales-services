'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverEnv } from '@/lib/env';
import { CHANGE_PASSWORD_PAGE, safeAdminNext } from '@/lib/admin/gate';
import { DEV_TOKEN_COOKIE, DEV_TOKENS, devLoginEnabled } from '@/lib/admin/dev-login';
import { createSupabaseServer } from '@/lib/admin/supabase-server';

export interface AuthFormState {
  error?: string;
  message?: string;
}

const NOT_SET_UP = "Sign-in isn't set up yet. Please ask the person who looks after the website.";
const RESET_ANSWER = 'If this email has an account, we sent a link.';
const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, 'email').trim();
  const password = text(formData, 'password');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const supabase = await createSupabaseServer();
  if (!supabase) return { error: NOT_SET_UP };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Never say whether the email has an account.
    const status = (error as { status?: number } | null)?.status ?? 400;
    if (status === 429) return { error: 'Too many tries. Please wait a few minutes and try again.' };
    if (status === 0 || status >= 500) return { error: 'We could not reach the sign-in service. Please try again in a minute.' };
    return { error: 'Email or password is wrong.' };
  }
  if (data.user.user_metadata?.must_change_password === true) redirect(CHANGE_PASSWORD_PAGE);
  redirect(safeAdminNext(text(formData, 'next')) ?? '/admin');
}

/** "Sign in as test admin / staff": only on a PC with the mock PYS (checked again here). */
export async function devSignIn(formData: FormData): Promise<void> {
  if (!devLoginEnabled()) redirect('/admin/login');
  const role = text(formData, 'role') === 'staff' ? 'staff' : 'admin';
  (await cookies()).set(DEV_TOKEN_COOKIE, DEV_TOKENS[role], { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
  redirect(safeAdminNext(text(formData, 'next')) ?? '/admin');
}

export async function sendReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, 'email').trim();
  if (!email) return { error: 'Enter your email address.' };
  const supabase = await createSupabaseServer();
  if (!supabase) return { error: NOT_SET_UP };
  // Same answer whatever happens, so this can't be used to find out who has an account.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${serverEnv().SITE_URL}/admin/reset` }).catch(() => undefined);
  return { message: RESET_ANSWER };
}

export async function setNewPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = text(formData, 'password');
  const confirm = text(formData, 'confirm');
  if (password.length < 10) return { error: 'Use at least 10 characters for your new password.' };
  if (password !== confirm) return { error: 'The two passwords do not match. Type the same password twice.' };
  const supabase = await createSupabaseServer();
  if (!supabase) return { error: NOT_SET_UP };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?${new URLSearchParams({ next: CHANGE_PASSWORD_PAGE })}`);

  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'same_password') return { error: 'Choose a password that is different from your old one.' };
    if (code === 'weak_password') return { error: 'This password is too easy to guess. Try a longer one.' };
    return { error: 'We could not save your new password. Please try again in a minute.' };
  }
  redirect('/admin');
}
