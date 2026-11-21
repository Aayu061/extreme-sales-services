'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SignOutForm } from '@/components/admin/sign-out-form';
import { Button } from '@/components/ui/button';
import { roleLabel, visibleNav } from '@/lib/admin/nav';
import type { AdminMe } from '@/lib/admin/types';
import { cn } from '@/lib/cn';

const MENU_ID = 'admin-menu';

/**
 * The admin menu: a glass sidebar on computers; on phones a bar with the person's name and a
 * menu button that opens the same list. Only the screens this person can use are listed.
 */
export function AdminNav({ me }: { me: AdminMe }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = visibleNav(me.roles);
  const active = (href: string) => (href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <aside className="p-3 lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:shrink-0 lg:p-4">
      <div className="glass-strong flex flex-col gap-3 rounded-[24px] p-3 text-ink lg:h-full lg:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 px-2">
            <p className="text-sm text-muted">ESS admin area</p>
            <p className="truncate font-bold">{me.name ?? me.email ?? 'Signed in'}</p>
            <p className="text-sm text-muted">{roleLabel(me.roles)}</p>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="neu-raised inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink lg:hidden"
          >
            {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>

        <nav id={MENU_ID} aria-label="Admin" className={cn('flex-1 flex-col gap-3 lg:flex', open ? 'flex' : 'hidden')}>
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-2xl px-4 font-semibold transition-colors hover:bg-cool/10',
                    active(item.href) && 'bg-cool/10 text-cool',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <SignOutForm className="mt-auto border-t border-line pt-3">
            <Button type="submit" variant="glass" size="sm" className="w-full">
              Sign out
            </Button>
          </SignOutForm>
        </nav>
      </div>
    </aside>
  );
}
