import { getImageProps } from 'next/image';
import { cn } from '@/lib/cn';

type Theme = 'day' | 'night';

/**
 * One art-directed photo: the wide picture on computers, the tall one on phones. Only the photo
 * for the current theme is displayed (CSS), and lazy loading means hidden ones are not fetched.
 */
function HeroPicture({ theme, closed = false }: { theme: Theme; closed?: boolean }) {
  const suffix = closed ? '-closed' : '';
  const common = { alt: '', sizes: '100vw', quality: 70, fetchPriority: closed ? ('auto' as const) : ('high' as const) };
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: `/hero/${theme}${suffix}.png`, width: 1672, height: 941 });
  const {
    props: { srcSet: tall, ...rest },
  } = getImageProps({ ...common, src: `/hero/${theme}-phone${suffix}.png`, width: 941, height: 1672 });

  return (
    <picture className={cn('hero-photo absolute inset-0', theme === 'day' ? 'photo-day' : 'photo-night')}>
      <source media="(min-width: 761px)" srcSet={wide} />
      <img {...rest} srcSet={tall} alt="" className="size-full object-cover object-top" />
    </picture>
  );
}

/** The room photos: flap open (final state), and the flap-closed layer shown only around the AC. */
export function HeroPhotos() {
  return (
    <>
      <div className="hero-layer absolute -inset-[2%]">
        <HeroPicture theme="day" />
        <HeroPicture theme="night" />
      </div>
      <div id="hero-closed" className="hero-layer hero-closed absolute -inset-[2%]">
        <HeroPicture theme="day" closed />
        <HeroPicture theme="night" closed />
      </div>
    </>
  );
}
