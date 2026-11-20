import 'server-only';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { isPhotoFile } from '@/lib/product-photo';

/** public/images/products: the product photos stored with this site (added by a code change). */
export const PRODUCT_PHOTO_FOLDER = path.join(process.cwd(), 'public', 'images', 'products');

/**
 * The photo files in the folder, sorted. Only plain files with names the shop can show; folders,
 * links and anything with an odd name are left out. A missing folder gives an empty list.
 */
export async function listProductPhotos(folder: string = PRODUCT_PHOTO_FOLDER): Promise<string[]> {
  let entries;
  try {
    // Not traced from here (that would pull in the whole project); next.config.ts traces exactly
    // public/images/products into /api/admin/photos instead.
    entries = await readdir(/*turbopackIgnore: true*/ folder, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && isPhotoFile(e.name))
    .map((e) => e.name)
    .sort();
}
