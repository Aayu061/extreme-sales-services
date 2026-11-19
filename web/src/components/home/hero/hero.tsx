import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import type { PickerService } from '@/lib/answer';
import type { BusinessIdentity, HomeHero } from '@/lib/pys/types';
import type { HeroCard } from '@/lib/season';
import { HeroPhotos } from './hero-photos';
import { HeroScene } from './hero-scene';
import { OfferCard } from './offer-card';
import { ProblemDock } from './problem-dock';

/**
 * Home top section (design doc §5): a Mumbai room photo where the ESS AC switches on and cools
 * the room, with the headline, Book button, facts, "What's wrong?" dock and offer card in glass.
 */
export function Hero({
  hero,
  identity,
  services,
  card,
}: {
  hero: HomeHero;
  identity: BusinessIdentity;
  services: PickerService[];
  card: HeroCard;
}) {
  const facts = [
    identity.warrantyDays > 0 ? `${identity.warrantyDays}-day warranty on our work*` : null,
    'Prices include GST',
    identity.hours,
  ].filter((f): f is string => Boolean(f));

  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative isolate h-[100svh] min-h-[640px] overflow-hidden">
      <HeroPhotos />
      <div className="hero-shade pointer-events-none absolute inset-0" />
      <HeroScene />

      <div className="absolute top-24 bottom-28 left-[clamp(16px,5vw,80px)] z-10 flex items-center max-[760px]:top-auto max-[760px]:right-4 max-[760px]:bottom-[150px]">
        <div id="hero-copy" className="glass w-[min(540px,44vw)] rounded-[30px] px-[34px] py-[30px] text-ink max-[760px]:w-auto max-[760px]:rounded-3xl max-[760px]:p-[22px]">
          <h1 id="hero-heading" className="text-[clamp(30px,4.2vw,62px)]">
            {hero.headline.split(' ').map((word, i) => (
              <span key={`${word}-${i}`} className="hero-word inline-block">
                {word}&nbsp;
              </span>
            ))}
          </h1>
          <p className="mt-4 mb-6 max-w-[42ch] text-[clamp(15px,1.25vw,19px)] text-muted max-[760px]:mt-2.5 max-[760px]:mb-4">{hero.subline}</p>
          <div className="flex flex-wrap gap-3">
            <Link id="hero-book" href="/book" className={buttonStyles({ size: 'lg' })}>
              Book a service
            </Link>
            <Link href="/shop" className={buttonStyles({ variant: 'glass', size: 'lg' })}>
              Buy an AC
            </Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2 max-[760px]:hidden">
            {facts.map((f) => (
              <li key={f} className="rounded-full border border-[var(--glass-line)] bg-white/10 px-3 py-2 text-[13.5px] dark:bg-white/10">
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProblemDock
        services={services}
        className="hero-dock absolute bottom-7 left-[clamp(16px,5vw,80px)] z-10 max-w-[calc(100%-clamp(16px,5vw,80px)-460px)] max-[1100px]:max-w-[calc(100%-2*clamp(16px,5vw,80px))] max-[760px]:right-4 max-[760px]:bottom-3.5"
      />
      <OfferCard card={card} className="hero-offer absolute right-[96px] bottom-7 z-10 max-[1100px]:hidden" />
    </section>
  );
}
