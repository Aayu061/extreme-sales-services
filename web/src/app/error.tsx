'use client';

import Link from 'next/link';
import { Container } from '@/components/site/container';
import { Button, buttonStyles } from '@/components/ui/button';

/**
 * Shown when a page fails, usually because PYS did not answer (the free server can take up to a
 * minute to wake). Kept free of server-only parts so it can always render.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-12">
      <div className="glass-strong banner-rise rounded-[30px] px-5 py-6 text-ink sm:px-8">
        <h1 className="text-[clamp(30px,5vw,48px)]">Something went wrong</h1>
        <p className="mt-3 max-w-prose text-muted">
          Our booking system did not answer in time. It may be starting up: please try again in a minute, or contact us to book.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="md" onClick={reset}>
            Try again
          </Button>
          <Link href="/contact" className={buttonStyles({ variant: 'quiet', size: 'md' })}>
            Contact us
          </Link>
        </div>
      </div>
    </Container>
  );
}
