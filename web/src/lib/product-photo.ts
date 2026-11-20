/**
 * Product photos stored with this site (public/images/products/), client-safe.
 *
 * The shop shows only these photos (ProductArt draws the AC for anything else), and reads them as
 * a site path: /images/products/<file>. PYS stores a product's photo in `imageUrl`, which its
 * validator requires to be a full web address (z.string().url()), so a site path alone would be
 * refused. The admin area therefore sends PYS the full address under PHOTO_ORIGIN, and the site
 * turns that back into the site path when it reads products (lib/data.ts, the admin screens).
 * This is the only place that knows about the two forms.
 */

/** The site's own address, fixed so a photo chosen on a preview deployment is still known in production. */
export const PHOTO_ORIGIN = 'https://extreme-sales-services.vercel.app';
export const PHOTO_DIR_PATH = '/images/products/';

/** Plain file names the shop can show (lower-case .jpg/.jpeg/.png/.webp/.avif); no folders, no "..". */
const PHOTO_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif)$/;

export function isPhotoFile(name: unknown): name is string {
  return typeof name === 'string' && PHOTO_FILE.test(name) && !name.includes('..');
}

/** "voltas-185v.jpg" → "/images/products/voltas-185v.jpg" (what the shop shows). */
export function sitePhotoPath(file: string): string {
  return `${PHOTO_DIR_PATH}${file}`;
}

/** The address PYS stores for a chosen photo; "" (the drawn AC) → null. */
export function photoUrlForPys(file: string): string | null {
  return isPhotoFile(file) ? `${PHOTO_ORIGIN}${sitePhotoPath(file)}` : null;
}

function fileFromPath(pathname: string): string | null {
  if (!pathname.startsWith(PHOTO_DIR_PATH)) return null;
  const file = pathname.slice(PHOTO_DIR_PATH.length);
  return isPhotoFile(file) ? file : null;
}

/**
 * The site photo file a stored address points to, or null (no photo, a stock photo, another
 * website, an odd path). Accepts the site path and full addresses on PHOTO_ORIGIN or `origins`.
 */
export function photoFileOf(imageUrl: string | null | undefined, origins: readonly string[] = []): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) return fileFromPath(imageUrl);
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  const known = [PHOTO_ORIGIN, ...origins].some((o) => {
    try {
      return new URL(o).origin === url.origin;
    } catch {
      return false;
    }
  });
  // A raw ".." would already be folded away by URL parsing; check the address as typed too.
  if (!known || url.search || url.hash || imageUrl.includes('..')) return null;
  return fileFromPath(url.pathname);
}

/** For the public pages: this site's photo as its site path; any other address is left as it is. */
export function photoPathFromPys(imageUrl: string | null, origins: readonly string[] = []): string | null {
  const file = photoFileOf(imageUrl, origins);
  return file ? sitePhotoPath(file) : imageUrl;
}
