import Image from 'next/image';
import Link from 'next/link';

/**
 * ESS logo + wordmark. The dark-background variant (white "ess", light-silver tools) shows when
 * the day/night switch is on night (globals.css switches .logo-light / .logo-dark).
 */
export function Logo({ size = 40 }: { size?: number }) {
  const width = Math.round((size * 498) / 512);
  return (
    <Link href="/" className="inline-flex items-center gap-3 rounded-md" aria-label="Extreme Sales & Services, home">
      <Image src="/brand/ess-logo-512.webp" alt="" width={width} height={size} preload className="logo-light" />
      <Image src="/brand/ess-logo-dark-512.webp" alt="" width={width} height={size} className="logo-dark" />
      <span className="text-[15px] leading-[1.1] font-bold [font-stretch:118%] text-ink max-[760px]:hidden">
        Extreme Sales
        <br />
        &amp; Services
      </span>
    </Link>
  );
}
