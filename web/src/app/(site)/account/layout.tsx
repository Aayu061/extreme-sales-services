import type { Metadata } from 'next';

/** Customer account pages are private: never indexed, never followed (S11b). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
