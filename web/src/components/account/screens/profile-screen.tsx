import { AccountTabs, InfoList, Panel, PortalFallback } from '@/components/account/portal-ui';
import { ChangeRequestForm, SignOutAllForm } from '@/components/account/profile-forms';
import { buttonStyles } from '@/components/ui/button';
import { signOut } from '@/app/(site)/account/actions';
import { portalGet } from '@/lib/account';
import type { PortalOverview } from '@/lib/portal-types';

/** /account/profile: the customer's details (read only), "Request a change", and sign-out options. */
export async function ProfileScreen() {
  const r = await portalGet<PortalOverview>('/portal/overview');
  if (r.kind !== 'ok') return <PortalFallback result={r} />;
  const c = r.data.customer;
  return (
    <>
      <AccountTabs current="profile" />
      <div className="flex flex-col gap-6">
        <Panel id="profile-details" title="Your details">
          <InfoList
            items={[
              ['Name', c.name],
              ['Company', c.companyName],
              ['Email', c.email],
              ['Phone', c.phone && <span className="tabular">{c.phone}</span>],
              ['City', c.city],
            ]}
          />
          <p className="mt-4 text-sm text-muted">
            You sign in with the email on record. Service addresses for each AC show on its page under My ACs.
          </p>
        </Panel>
        <Panel id="profile-change" title="Request a change">
          <p className="mb-4 text-muted">To keep your account safe, our staff make changes to your details. Tell us what to change.</p>
          <ChangeRequestForm />
        </Panel>
        <Panel id="profile-signout" title="Sign out">
          <div className="flex flex-col gap-5">
            <form action={signOut}>
              <button type="submit" className={buttonStyles({ size: 'md' })}>
                Sign out
              </button>
            </form>
            <div>
              <p className="mb-3 text-muted">Lost a phone, or signed in on someone else&apos;s computer? This signs you out everywhere, including here.</p>
              <SignOutAllForm />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
