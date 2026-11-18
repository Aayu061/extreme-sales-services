import Image from 'next/image';
import Link from 'next/link';

/**
 * ESS logo + wordmark. The dark-background variant (white "ess", light-silver tools) swaps in
 * automatically through <picture> media queries.
 */
export function Logo({ size = 44 }: { size?: number }) {
  const width = Math.round((size * 498) / 512);
  return (
    <Link href="/" className="inline-flex items-center gap-3 rounded-md" aria-label="Extreme Sales & Services, home">
      <picture>
        <source srcSet="/brand/ess-logo-dark-512.webp" media="(prefers-color-scheme: dark)" type="image/webp" />
        <Image src="/brand/ess-logo-512.webp" alt="" width={width} height={size} priority />
      </picture>
      <span className="display text-lg leading-tight text-navy">
        Extreme Sales
        <br />
        &amp; Services
      </span>
    </Link>
  );
}
