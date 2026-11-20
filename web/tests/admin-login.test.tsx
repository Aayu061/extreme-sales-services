// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const signIn = vi.fn();
const devSignIn = vi.fn();
vi.mock('@/app/admin/actions/auth', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
  devSignIn: (...args: unknown[]) => devSignIn(...args),
  sendReset: vi.fn(),
  setNewPassword: vi.fn(),
  signOut: vi.fn(),
}));

import { LoginForm } from '@/components/admin/auth-forms';

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
    render(<LoginForm devLogin={false} configured next={null} />);
    await submit();
    expect(screen.getByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(screen.getByLabelText(/^Email/).getAttribute('aria-invalid')).toBe('true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows the answer from the server when the password is wrong', async () => {
    signIn.mockResolvedValue({ error: 'Email or password is wrong.' });
    render(<LoginForm devLogin={false} configured next="/admin/enquiries" />);
    fill('staff@ess.example', 'not-the-password');
    await submit();
    expect((await screen.findByRole('alert')).textContent).toBe('Email or password is wrong.');
    const sent = signIn.mock.calls[0][1] as FormData;
    expect(sent.get('email')).toBe('staff@ess.example');
    expect(sent.get('password')).toBe('not-the-password');
    expect(sent.get('next')).toBe('/admin/enquiries');
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('staff@ess.example');
  });

  it('offers the test sign-in only when the page allows it', () => {
    const { rerender } = render(<LoginForm devLogin={false} configured next={null} />);
    expect(screen.queryByRole('button', { name: 'Sign in as test admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in as test staff' })).toBeNull();
    rerender(<LoginForm devLogin configured next={null} />);
    expect(screen.getByRole('button', { name: 'Sign in as test admin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in as test staff' })).toBeTruthy();
  });

  it('says so when sign-in is not set up yet', () => {
    render(<LoginForm devLogin={false} configured={false} next={null} />);
    expect(screen.getByText(/Sign-in isn't set up yet/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Email/)).toBeNull();
  });
});
