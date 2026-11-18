import { Container } from '@/components/site/container';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container className="py-16">
      <h1 className="text-3xl">This page does not exist</h1>
      <p className="mt-3 max-w-prose text-slate">
        The link may be old or mistyped. You can book a service, compare AMC plans or track a request from the home page.
      </p>
      <ButtonLink href="/" className="mt-6">
        Go to the home page
      </ButtonLink>
    </Container>
  );
}
