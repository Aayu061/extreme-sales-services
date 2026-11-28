'use client';

import Link from 'next/link';
import { Container } from '@/components/site/container';
import { Button, buttonStyles } from '@/components/ui/button';

/**
 * An account page that failed outright (screens normally show their own error box; this catches the rest).
 * Kept free of server-only parts so it can always render, and says nothing about the customer's data.
 */
export default function AccountErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-12">
      <div role="alert" className="glass-strong rounded-[30px] px-5 py-6 text-ink sm:px-8">
        <h1 className="text-[clamp(30px,5vw,48px)]">We could not load your account</h1>
        <p className="mt-3 max-w-prose text-muted">
          Our system did not answer in time. It may be starting up: please try again in a minute. You can still track a request with
          its code, or call us.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="md" onClick={reset}>
            Try again
          </Button>
          <Link href="/track" className={buttonStyles({ variant: 'quiet', size: 'md' })}>
            Track a request
          </Link>
          <Link href="/contact" className={buttonStyles({ variant: 'quiet', size: 'md' })}>
            Contact us
          </Link>
        </div>
      </div>
    </Container>
  );
}
