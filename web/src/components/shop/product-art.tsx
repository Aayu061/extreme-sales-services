import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { Product } from '@/lib/pys/types';
import { kindOf, type AcKind } from '@/lib/ac-kind';
import { isUploadedPhoto } from '@/lib/product-photo';

/**
 * Only the product photos stored with this site (public/images/products/) are shown. Stock photos
 * (Unsplash) and other websites' images get a drawn AC of the right kind instead.
 */
const SITE_PHOTO = /^\/images\/products\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$/;

export function hasRealPhoto(p: Pick<Product, 'imageUrl'>): boolean {
  const uploaded: boolean = isUploadedPhoto(p.imageUrl); // uploaded from the admin (PYS storage, exact shape checked)
  if (uploaded) return true;
  return Boolean(p.imageUrl && SITE_PHOTO.test(p.imageUrl) && !p.imageUrl.includes('..'));
}

function Drawing({ kind }: { kind: AcKind }) {
  const body = { fill: '#ffffff', stroke: '#c7d7e5', strokeWidth: 2 };
  switch (kind) {
    case 'window':
      return (
        <g>
          <rect x="70" y="40" width="160" height="120" rx="10" {...body} />
          {[60, 72, 84, 96, 108, 120].map((y) => (
            <line key={y} x1="88" x2="180" y1={y} y2={y} stroke="#d6e3ee" strokeWidth="5" strokeLinecap="round" />
          ))}
          <rect x="192" y="56" width="24" height="34" rx="5" fill="#0f2340" />
          <circle cx="204" cy="128" r="8" fill="#e3f3fc" stroke="#9cc6e3" strokeWidth="2" />
        </g>
      );
    case 'tower':
      return (
        <g>
          <rect x="120" y="14" width="60" height="172" rx="14" {...body} />
          {[44, 56, 68, 80, 92, 104, 116, 128].map((y) => (
            <line key={y} x1="134" x2="166" y1={y} y2={y} stroke="#d6e3ee" strokeWidth="4" strokeLinecap="round" />
          ))}
          <rect x="138" y="24" width="24" height="12" rx="3" fill="#0f2340" />
        </g>
      );
    case 'cassette':
      return (
        <g>
          <rect x="60" y="60" width="180" height="80" rx="12" {...body} />
          <rect x="100" y="80" width="100" height="40" rx="6" fill="#eef4f9" stroke="#d6e3ee" strokeWidth="2" />
          {[88, 96, 104, 112].map((y) => (
            <line key={y} x1="108" x2="192" y1={y} y2={y} stroke="#d6e3ee" strokeWidth="3" />
          ))}
          <path d="M60 72 H240 M60 128 H240" stroke="#c7d7e5" strokeWidth="2" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="40" y="62" width="220" height="70" rx="18" {...body} />
          <line x1="58" x2="180" y1="80" y2="80" stroke="#d6e3ee" strokeWidth="3" strokeLinecap="round" />
          <line x1="58" x2="180" y1="88" y2="88" stroke="#d6e3ee" strokeWidth="3" strokeLinecap="round" />
          <rect x="200" y="76" width="44" height="26" rx="6" fill="#0f2340" />
          <path d="M52 118 H248" stroke="#c7d7e5" strokeWidth="6" strokeLinecap="round" />
          <g fill="none" stroke="#7cc8f0" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 8">
            <path d="M90 142 c -6 14, 6 24, 0 38" />
            <path d="M150 142 c -6 14, 6 24, 0 38" />
            <path d="M210 142 c -6 14, 6 24, 0 38" />
          </g>
        </g>
      );
  }
}

/** Product picture: the seller's own photo when there is one, otherwise a drawing of the AC type. */
export function ProductArt({
  product,
  sizes,
  className,
  imageClassName,
}: {
  product: Pick<Product, 'name' | 'imageUrl'>;
  sizes: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden', hasRealPhoto(product) ? 'bg-white' : 'bg-[linear-gradient(160deg,#eaf6fd,#d8ecf8)]', className)}>
      {hasRealPhoto(product) ? (
        <Image src={product.imageUrl!} alt={product.name} fill sizes={sizes} className={cn('object-contain p-3', imageClassName)} />
      ) : (
        <svg viewBox="0 0 300 200" role="img" aria-label={product.name} className={cn('absolute inset-0 size-full', imageClassName)}>
          <Drawing kind={kindOf(product.name)} />
        </svg>
      )}
    </div>
  );
}
