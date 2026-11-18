'use client';

import { Container } from '@/components/site/container';
import { Button } from '@/components/ui/button';

/** Shown when PYS cannot be reached; the free server can take up to a minute to wake. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-16">
      <h1 className="text-3xl">We could not load this page</h1>
      <p className="mt-3 max-w-prose text-slate">
        Our booking system did not answer in time. It may be starting up: please try again in a minute, or call us to book.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
