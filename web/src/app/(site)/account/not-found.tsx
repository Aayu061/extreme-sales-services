import Link from 'next/link';
import { AccountFrame, linkClass } from '@/components/account/portal-ui';
import { buttonStyles } from '@/components/ui/button';

/** An account address that is not one of this customer's (or does not exist): the same answer either way. */
export default function AccountNotFound() {
  return (
    <AccountFrame title="Not found">
      <div className="glass max-w-xl rounded-3xl p-6 text-ink sm:p-8">
        <h2 className="text-2xl">We could not find that page in your account</h2>
        <p className="mt-3 text-muted">
          The link may be old or mistyped. Everything on your account is under the tabs on{' '}
          <Link href="/account" className={linkClass}>
            your account page
          </Link>
          .
        </p>
        <Link href="/account" className={`${buttonStyles({ size: 'md' })} mt-5`}>
          Go to your account
        </Link>
      </div>
    </AccountFrame>
  );
}
