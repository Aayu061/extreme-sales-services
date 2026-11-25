'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import { ProductArt } from '@/components/shop/product-art';
import { isPhotoFile, isUploadedPhoto, photoSrc } from '@/lib/product-photo';

/**
 * The photos stored with the site (public/images/products), from GET /api/admin/photos. `photos`
 * stays null while loading; `failed` is set when the list could not be loaded.
 */
export function usePhotoList(): { photos: string[] | null; uploaded: string[]; failed: boolean; addUploaded: (url: string) => void } {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/admin/photos', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ photos?: unknown; uploaded?: unknown }>) : Promise.reject(new Error(String(res.status)))))
      .then((body) => {
        if (!live) return;
        setPhotos(Array.isArray(body.photos) ? body.photos.filter(isPhotoFile) : []);
        setUploaded(Array.isArray(body.uploaded) ? body.uploaded.filter(isUploadedPhoto) : []);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const addUploaded = (url: string) => setUploaded((list) => (list.includes(url) ? list : [url, ...list]));
  return { photos, uploaded, failed, addUploaded };
}

const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** Ask this site for a one-time link, then send the file straight to storage. Returns the photo's address. */
async function uploadPhoto(file: File): Promise<string> {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Use a JPEG, PNG or WebP photo.');
  if (file.size > UPLOAD_MAX_BYTES) throw new Error('The photo must be smaller than 5 MB.');
  const res = await fetch('/api/admin/photos/upload-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
    cache: 'no-store',
  });
  const link = (await res.json().catch(() => ({}))) as { signedUrl?: string; publicUrl?: string; error?: string };
  if (!res.ok || !link.signedUrl || !isUploadedPhoto(link.publicUrl)) throw new Error(link.error ?? 'The upload could not be prepared. Please try again.');
  const put = await fetch(link.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
  if (!put.ok) throw new Error('The photo could not be uploaded. Please try again.');
  return link.publicUrl;
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
  uploaded = [],
  onUploaded,
  failed = false,
  value,
  onChange,
  error,
}: {
  photos: readonly string[] | null;
  /** Photos uploaded from the admin (addresses), newest first. */
  uploaded?: readonly string[];
  /** Given: the picker offers "Upload a photo"; called with the new photo's address. */
  onUploaded?: (url: string) => void;
  failed?: boolean;
  value: string;
  onChange: (file: string) => void;
  error?: string;
}) {
  const id = useId();
  const [uploadState, setUploadState] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const files = [...uploaded, ...(photos ?? [])];
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
        {onUploaded ? 'Photos stored with the website and photos you uploaded. Upload a JPEG, PNG or WebP photo up to 5 MB.' : 'Photos stored with the website. New photos are added to the website by a code change.'}
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
              <Image src={photoSrc(file)} alt="" fill sizes="160px" className="object-contain p-1" />
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
              <span className="break-all">{isUploadedPhoto(file) ? `Uploaded photo (${file.split('/').slice(-2, -1)[0]})` : file}</span>
            </span>
          </label>
        ))}
      </div>
      {onUploaded && (
        <div className="flex flex-col gap-1">
          <label className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cool">
            {uploadState.busy ? 'Uploading…' : 'Upload a photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadState.busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploadState({ busy: true, message: null });
                try {
                  const url = await uploadPhoto(file);
                  onUploaded(url);
                  onChange(url);
                  setUploadState({ busy: false, message: 'Photo uploaded and chosen. Save the product to use it.' });
                } catch (err) {
                  setUploadState({ busy: false, message: err instanceof Error ? err.message : 'The photo could not be uploaded.' });
                }
              }}
            />
          </label>
          {uploadState.message && (
            <p role="status" className="text-sm text-ink">
              {uploadState.message}
            </p>
          )}
        </div>
      )}
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
        <p id={errorId} className="text-sm font-semibold text-heat-text">
          {error}
        </p>
      )}
    </div>
  );
}
