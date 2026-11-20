import type { Metadata } from 'next';
import { AuthCard, NewPasswordForm } from '@/components/admin/auth-forms';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/admin/actions/auth';

export const metadata: Metadata = { title: 'Choose a new password' };

/** Signed-in only (the proxy sends others to sign in). A first sign-in is kept here until done. */
export default function AdminChangePasswordPage() {
  return (
    <AuthCard title="Choose a new password" intro="You will use it to sign in from now on.">
      <NewPasswordForm />
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="quiet" className="min-h-11 px-0">
          Sign out
        </Button>
      </form>
    </AuthCard>
  );
}
