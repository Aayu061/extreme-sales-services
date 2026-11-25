// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from '@/components/admin/alert';
import { handleAdminAccess, NO_ACCESS_HREF, signInAgainHref } from '@/lib/admin/access-redirect';

describe('S07 shared admin Alert', () => {
  it('a problem is announced (role=alert) in the AA error-text colour; done is quiet', () => {
    render(
      <>
        <Alert>Could not save</Alert>
        <Alert tone="done">Saved</Alert>
      </>,
    );
    const problem = screen.getByRole('alert');
    expect(problem.textContent).toBe('Could not save');
    expect(problem.className).toContain('text-heat-text');
    expect(screen.getByText('Saved').getAttribute('role')).toBeNull();
  });

  it('the error-text colour meets WCAG AA (>= 4.5:1) on white in light mode', () => {
    const css = readFileSync(path.join(__dirname, '..', 'src', 'app', 'globals.css'), 'utf8');
    const hex = css.match(/--heat-text:\s*(#[0-9a-f]{6})/i)![1];
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    expect(1.05 / (L + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('S07 shared session-ended / no-access helper', () => {
  it('builds the sign-in-again address for admin pages only', () => {
    expect(signInAgainHref('/admin/enquiries?tab=sent')).toBe('/admin/login?expired=1&next=%2Fadmin%2Fenquiries%3Ftab%3Dsent');
    expect(signInAgainHref('https://evil.example')).toBe('/admin/login?expired=1&next=%2Fadmin');
    expect(signInAgainHref('//evil.example/admin')).toBe('/admin/login?expired=1&next=%2Fadmin');
  });

  it('sends an ended session to sign in, missing access to the no-access page, else nothing', () => {
    const router = { replace: vi.fn() };
    expect(handleAdminAccess(router, { authError: true }, '/admin/products')).toBe('signIn');
    expect(router.replace).toHaveBeenLastCalledWith('/admin/login?expired=1&next=%2Fadmin%2Fproducts');
    expect(handleAdminAccess(router, { forbidden: true })).toBe('noAccess');
    expect(router.replace).toHaveBeenLastCalledWith(NO_ACCESS_HREF);
    expect(handleAdminAccess(router, {})).toBeNull();
    expect(router.replace).toHaveBeenCalledTimes(2);
  });

  it('no admin screen builds these addresses itself any more', () => {
    const dir = path.join(__dirname, '..', 'src', 'components', 'admin');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
    for (const f of walk(dir)) {
      const s = readFileSync(f, 'utf8');
      expect(s.includes("router.replace('/admin/no-access')"), f).toBe(false);
      expect(/router\.replace\(`\/admin\/login\?/.test(s), f).toBe(false);
    }
  });
});
