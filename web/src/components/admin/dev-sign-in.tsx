import { Button } from '@/components/ui/button';
import { devSignIn } from '@/app/admin/actions/auth';

/**
 * "Sign in as test admin / staff" (PC with the mock PYS only). A server component, rendered by the
 * login page only when devLoginEnabled(), so none of it is part of the browser code of a live
 * build. devSignIn checks devLoginEnabled() again itself.
 */
export function DevSignInForm({ next }: { next: string | null }) {
  return (
    <form action={devSignIn} className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
      <p className="text-sm text-muted">Only on this computer, with the test PYS:</p>
      {next && <input type="hidden" name="next" value={next} />}
      <Button type="submit" variant="glass" name="role" value="admin">
        Sign in as test admin
      </Button>
      <Button type="submit" variant="glass" name="role" value="staff">
        Sign in as test staff
      </Button>
    </form>
  );
}
