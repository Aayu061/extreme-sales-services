// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

const signIn = vi.fn();
const devSignIn = vi.fn();
vi.mock('@/app/admin/actions/auth', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
  devSignIn: (...args: unknown[]) => devSignIn(...args),
  sendReset: vi.fn(),
  setNewPassword: vi.fn(),
  signOut: vi.fn(),
}));

import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LoginForm, NewPasswordForm, ResetRequestForm } from '@/components/admin/auth-forms';
import { DevSignInForm } from '@/components/admin/dev-sign-in';

beforeEach(() => {
  signIn.mockReset();
  devSignIn.mockReset();
});
afterEach(() => {
  cleanup();
});

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: password } });
};
const submit = () => act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign in' })));

describe('LoginForm', () => {
  it('asks for the email and password without calling the server', async () => {
    render(<LoginForm configured next={null} />);
    await submit();
    expect(screen.getByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(screen.getByLabelText(/^Email/).getAttribute('aria-invalid')).toBe('true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows the answer from the server when the password is wrong', async () => {
    signIn.mockResolvedValue({ error: 'Email or password is wrong.' });
    render(<LoginForm configured next="/admin/enquiries" />);
    fill('staff@ess.example', 'not-the-password');
    await submit();
    expect((await screen.findByRole('alert')).textContent).toBe('Email or password is wrong.');
    const sent = signIn.mock.calls[0][1] as FormData;
    expect(sent.get('email')).toBe('staff@ess.example');
    expect(sent.get('password')).toBe('not-the-password');
    expect(sent.get('next')).toBe('/admin/enquiries');
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('staff@ess.example');
  });

  it('offers the test sign-in only when the page passes it in', () => {
    const { rerender } = render(<LoginForm configured next={null} />);
    expect(screen.queryByRole('button', { name: 'Sign in as test admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in as test staff' })).toBeNull();
    rerender(<LoginForm devSignIn={<DevSignInForm next="/admin/users" />} configured next={null} />);
    expect(screen.getByRole('button', { name: 'Sign in as test admin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in as test staff' })).toBeTruthy();
    const form = screen.getByRole('button', { name: 'Sign in as test staff' }).closest('form')!;
    expect((form.querySelector('input[name="next"]') as HTMLInputElement).value).toBe('/admin/users');
  });

  it('keeps the test sign-in out of the browser code (client module)', () => {
    // auth-forms.tsx is 'use client': anything in it ships in the browser bundle of a live build.
    const client = readFileSync(path.join(__dirname, '../src/components/admin/auth-forms.tsx'), 'utf8');
    expect(client).not.toMatch(/Sign in as test|dev-login|DevSignInForm|import \{[^}]*\bdevSignIn\b/);
    const dev = readFileSync(path.join(__dirname, '../src/components/admin/dev-sign-in.tsx'), 'utf8');
    expect(dev).not.toMatch(/^\s*['"]use client['"]/m);
  });

  it('keeps typed details out of the address bar, even before the page script loads', () => {
    // Server HTML (what a tap before hydration submits): every form must be the Server Action
    // (React renders a POST, or a javascript: placeholder), never a plain GET form.
    for (const ui of [
      <LoginForm key="l" configured next="/admin/enquiries" />,
      <ResetRequestForm key="r" configured expired={false} />,
      <NewPasswordForm key="n" />,
      <DevSignInForm key="d" next={null} />,
    ]) {
      const forms = renderToString(ui).match(/<form[^>]*>/g) ?? [];
      expect(forms.length).toBeGreaterThan(0);
      for (const tag of forms) expect(tag).toMatch(/method="post"|action="javascript:/i);
    }
  });

  it('says so when sign-in is not set up yet', () => {
    render(<LoginForm configured={false} next={null} />);
    expect(screen.getByText(/Sign-in isn't set up yet/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Email/)).toBeNull();
  });

  it('says "Please sign in again." above the form when the session ran out', () => {
    const { rerender } = render(<LoginForm configured next="/admin/requests" expired />);
    const note = screen.getByText('Please sign in again.');
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form')!;
    expect(note.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    rerender(<LoginForm configured next={null} />);
    expect(screen.queryByText('Please sign in again.')).toBeNull();
  });
});

describe('/admin/login page', () => {
  /** The page's inner part (inside <Suspense>), resolved like the server does. */
  async function renderLoginPage(searchParams: Record<string, string>) {
    const { default: AdminLoginPage } = await import('@/app/admin/(auth)/login/page');
    const page = AdminLoginPage({ searchParams: Promise.resolve(searchParams) }) as ReactElement<{ children: ReactElement }>;
    const inner = page.props.children as ReactElement<Record<string, unknown>>;
    const resolve = inner.type as (props: Record<string, unknown>) => Promise<ReactElement>;
    return render(await resolve(inner.props));
  }

  it('shows "Please sign in again." for ?expired=1 and keeps where to go next', async () => {
    await renderLoginPage({ expired: '1', next: '/admin/requests?status=APPROVED' });
    expect(screen.getByText('Please sign in again.')).toBeTruthy();
  });

  it('does not show it on a normal visit', async () => {
    await renderLoginPage({});
    expect(screen.queryByText('Please sign in again.')).toBeNull();
  });
});
