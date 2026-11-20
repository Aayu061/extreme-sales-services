'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import { ProductArt } from '@/components/shop/product-art';
import { isPhotoFile, sitePhotoPath } from '@/lib/product-photo';

/**
 * The photos stored with the site (public/images/products), from GET /api/admin/photos. `photos`
 * stays null while loading; `failed` is set when the list could not be loaded.
 */
export function usePhotoList(): { photos: string[] | null; failed: boolean } {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/admin/photos', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ photos?: unknown }>) : Promise.reject(new Error(String(res.status)))))
      .then((body) => {
        if (live) setPhotos(Array.isArray(body.photos) ? body.photos.filter(isPhotoFile) : []);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);
  return { photos, failed };
}

const optionStyles =
  'flex cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-surface/85 p-2 text-sm text-ink has-[:checked]:border-cool has-[:checked]:ring-2 has-[:checked]:ring-cool/40';

/**
 * Choose the product's photo: one of the site's photos, or "Drawn AC (no photo)" (the shop then
 * draws an AC of the right kind). The value is the file name, or "" for the drawn AC; the radios
 * are named "photo" so the form sends the choice. Uploading new photos is not done here.
 */
export function PhotoPicker({
  photos,
  failed = false,
  value,
  onChange,
  error,
}: {
  photos: readonly string[] | null;
  failed?: boolean;
  value: string;
  onChange: (file: string) => void;
  error?: string;
}) {
  const id = useId();
  const files = [...(photos ?? [])];
  // A photo chosen earlier that is not in the folder now stays a choice, so it is not dropped unseen.
  const missing = value && !files.includes(value) ? value : null;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-base font-semibold text-ink">
        Photo
      </p>
      <p id={hintId} className="text-sm text-muted">
        Photos stored with the website. New photos are added to the website by a code change.
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      >
        <label className={optionStyles}>
          <span aria-hidden="true" className="block overflow-hidden rounded-xl">
            <ProductArt product={{ name: 'split', imageUrl: null }} sizes="160px" className="aspect-[3/2]" />
          </span>
          <span className="flex min-h-11 items-center gap-2">
            <input type="radio" name="photo" value="" checked={value === ''} onChange={() => onChange('')} className="size-5 shrink-0 accent-[var(--cool)]" />
            <span className="font-semibold">Drawn AC (no photo)</span>
          </span>
        </label>
        {missing && (
          <label className={optionStyles}>
            <span className="flex min-h-11 items-center gap-2">
              <input type="radio" name="photo" value={missing} checked onChange={() => onChange(missing)} className="size-5 shrink-0 accent-[var(--cool)]" />
              <span className="break-all">{missing} (not in the photos folder)</span>
            </span>
          </label>
        )}
        {files.map((file) => (
          <label key={file} className={optionStyles}>
            <span className="relative block aspect-[3/2] overflow-hidden rounded-xl bg-white">
              <Image src={sitePhotoPath(file)} alt="" fill sizes="160px" className="object-contain p-1" />
            </span>
            <span className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="photo"
                value={file}
                checked={value === file}
                onChange={() => onChange(file)}
                className="size-5 shrink-0 accent-[var(--cool)]"
              />
              <span className="break-all">{file}</span>
            </span>
          </label>
        ))}
      </div>
      {photos === null && !failed && (
        <p role="status" className="text-sm text-muted">
          Loading the photos…
        </p>
      )}
      {failed && (
        <p role="status" className="text-sm text-muted">
          We couldn&apos;t load the photos. You can still choose the drawn AC, or reload the page to try again.
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-heat">
          {error}
        </p>
      )}
    </div>
  );
}
