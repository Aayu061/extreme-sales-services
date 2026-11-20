import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

/** "Not found" inside the admin area (R6): the admin menu stays, no public header or footer. */
export default function AdminNotFound() {
  return (
    <div className="glass-strong mx-auto max-w-xl rounded-[30px] p-6 text-ink sm:p-8 lg:mx-0">
      <h1 className="text-2xl font-bold">This admin page does not exist</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped. Use the menu, or go back to the overview.</p>
      <div className="mt-6">
        <Link href="/admin" className={buttonStyles({ size: 'md' })}>
          Go to the overview
        </Link>
      </div>
    </div>
  );
}
