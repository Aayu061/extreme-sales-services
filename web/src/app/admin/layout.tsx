import type { Metadata } from 'next';

/** Everything under /admin stays out of search engines. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
