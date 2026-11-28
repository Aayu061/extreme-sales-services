import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountFrame, AccountSkeleton } from '@/components/account/portal-ui';
import { ProfileScreen } from '@/components/account/screens/profile-screen';

export const metadata: Metadata = { title: 'Your profile', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AccountFrame title="Your profile" crumbs={[{ href: '/account/profile', label: 'Profile' }]}>
      <Suspense fallback={<AccountSkeleton />}>
        <ProfileScreen />
      </Suspense>
    </AccountFrame>
  );
}
