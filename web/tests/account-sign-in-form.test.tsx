// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const requestCode = vi.fn();
const signIn = vi.fn();
vi.mock('@/app/(site)/account/actions', () => ({
  requestCode: (...args: unknown[]) => requestCode(...args),
  signIn: (...args: unknown[]) => signIn(...args),
}));

import { SignInForm, RESEND_WAIT_S } from '@/components/account/sign-in-form';

const sent = (email: string) => ({ step: 'code', email, sentAt: Date.now(), message: `If ${email} has an account with us, we have emailed a 6-digit code.` });

beforeEach(() => {
  requestCode.mockReset();
  signIn.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function askForCode(email: string) {
  render(<SignInForm />);
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: email } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
  });
}

describe('customer sign-in form', () => {
  it('after a code is sent: the code box has focus, "send a new code" waits, then sends again for the same email', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    requestCode.mockImplementation(async (_prev: unknown, fd: FormData) => sent(String(fd.get('email'))));
    await askForCode('asha@example.com');

    const code = screen.getByLabelText(/6-digit code/);
    expect(document.activeElement).toBe(code);
    expect(code.getAttribute('pattern')).toBeNull();
    const resend = screen.getByRole('button', { name: /send a new code/ });
    expect(resend).toHaveProperty('disabled', true);
    expect(resend.textContent).toContain(`in ${RESEND_WAIT_S} s`);

    await act(async () => {
      vi.advanceTimersByTime((RESEND_WAIT_S + 1) * 1000);
    });
    expect(resend).toHaveProperty('disabled', false);
    expect(resend.textContent).toBe('send a new code');
    vi.useRealTimers();

    await act(async () => {
      fireEvent.click(resend);
    });
    expect(requestCode).toHaveBeenCalledTimes(2);
    expect((requestCode.mock.calls[1][1] as FormData).get('email')).toBe('asha@example.com');
  });

  it('"use a different email" goes back to an empty form (a plain link, works without scripts)', async () => {
    requestCode.mockImplementation(async (_prev: unknown, fd: FormData) => sent(String(fd.get('email'))));
    await askForCode('asha@example.com');
    expect(screen.getByRole('link', { name: 'use a different email' }).getAttribute('href')).toBe('/account');
  });
});
