import Link from 'next/link';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';

/** The three steps of the /book flow (a real sequence, so the steps are numbered). */
export function BookSteps({ warrantyDays }: { warrantyDays: number }) {
  const steps = [
    { title: 'Choose what you need', text: 'A service, an AMC plan or a new AC. You see the price first.' },
    { title: 'Tell us where and when', text: 'Your address and a preferred day and time.' },
    {
      title: 'We confirm your visit',
      text: `Our team confirms the time. Any extra repair is quoted before we start.${warrantyDays > 0 ? ` ${warrantyDays}-day warranty on our work.` : ''}`,
    },
  ];
  return (
    <section aria-labelledby="steps-heading" className="reveal py-8 sm:py-12">
      <Container>
        <div className="glass rounded-[30px] p-6 text-ink sm:p-10">
          <h2 id="steps-heading" className="text-[clamp(28px,3.2vw,42px)]">
            Book in three steps
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span aria-hidden="true" className="tabular flex size-12 shrink-0 items-center justify-center rounded-full bg-taxi text-xl font-extrabold text-taxi-ink">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg [font-stretch:105%]">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/book" className={buttonStyles({ size: 'lg' })}>
              Book now
            </Link>
            <Link href="/track" className={buttonStyles({ variant: 'quiet' })}>
              Track your request
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
