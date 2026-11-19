import Link from 'next/link';
import { getImageProps } from 'next/image';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Container } from './container';

type Theme = 'day' | 'night';

/** A strip of the home page's room photo (wide on computers, tall crop on phones). Decorative. */
function BannerPicture({ theme }: { theme: Theme }) {
  const common = { alt: '', sizes: '100vw', quality: 70 as const };
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: `/hero/${theme}.png`, width: 1672, height: 941 });
  const {
    props: { srcSet: tall, ...rest },
  } = getImageProps({ ...common, src: `/hero/${theme}-phone.png`, width: 941, height: 1672 });
  return (
    <picture className={cn('absolute inset-0', theme === 'day' ? 'photo-day' : 'photo-night')}>
      <source media="(min-width: 761px)" srcSet={wide} />
      <img {...rest} srcSet={tall} alt="" className="banner-photo size-full object-cover" />
    </picture>
  );
}

export interface Crumb {
  href: string;
  label: string;
}

/**
 * Top of every inner page: a slim strip of the Mumbai room photo behind the glass menu, and a
 * glass title panel overlapping its bottom edge. The panel rising in is the page's one motion.
 */
export function PageBanner({
  title,
  intro,
  crumbs = [],
  children,
}: {
  title: string;
  intro?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="page-banner relative overflow-hidden" aria-hidden="true">
        <BannerPicture theme="day" />
        <BannerPicture theme="night" />
        <div className="banner-air absolute inset-0" />
        <div className="banner-fade absolute inset-x-0 bottom-0 h-1/2" />
      </div>
      <Container className="relative -mt-12">
        <div className="glass-strong banner-rise rounded-[30px] px-5 py-5 text-ink sm:px-8 sm:py-7">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="rounded-full hover:text-cool hover:underline">
                  Home
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-1">
                  <ChevronRight aria-hidden="true" size={14} />
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="text-ink">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="hover:text-cool hover:underline">
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="mt-2 text-[clamp(30px,5vw,52px)]">{title}</h1>
          {intro && <p className="mt-2 max-w-[62ch] text-base text-muted sm:text-lg">{intro}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </Container>
    </div>
  );
}
