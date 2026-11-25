import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: the admin session, Next's request-time marker and the PYS admin client ----
let session: { accessToken: string } | null = null;
vi.mock('@/lib/admin/session', () => ({ getAdminSession: async () => session }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}));
const adminRequest = vi.fn();
vi.mock('@/lib/admin/pys-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/pys-admin')>()),
  adminRequest: (...args: unknown[]) => adminRequest(...args),
}));

import { POST } from '@/app/api/admin/photos/upload-link/route';
import { GET } from '@/app/api/admin/photos/route';
import { isPhotoChoice, isUploadedPhoto, photoChoiceOf, photoSrc, photoUrlForPys } from '@/lib/product-photo';
import { hasRealPhoto } from '@/components/shop/product-art';

const HOST = 'https://eqhnaarawjbnjikajfpzxx.supabase.co'.replace('xx', ''); // 20-letter project ref
const GOOD = `${HOST}/storage/v1/object/public/ess-product-photos/2026-11-25/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0.webp`;
const post = (body: unknown) => POST(new Request('http://x/api/admin/photos/upload-link', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  session = null;
  adminRequest.mockReset();
});

describe('uploaded product photos: which addresses count', () => {
  it('accepts only the product-photo bucket, dated folder and random name made by PYS', () => {
    expect(isUploadedPhoto(GOOD)).toBe(true);
    expect(isUploadedPhoto(GOOD.replace('ess-product-photos', 'service-report-media'))).toBe(false);
    expect(isUploadedPhoto(GOOD.replace('.supabase.co', '.evil.com'))).toBe(false);
    expect(isUploadedPhoto(GOOD.replace('https:', 'http:'))).toBe(false);
    expect(isUploadedPhoto(GOOD.replace('.webp', '.svg'))).toBe(false);
    expect(isUploadedPhoto(`${GOOD}?x=1`)).toBe(false);
    expect(isUploadedPhoto(GOOD.replace('2026-11-25', '../secret'))).toBe(false);
    expect(isUploadedPhoto(null)).toBe(false);
  });

  it('form and shop: an uploaded photo is stored as it is, shown as it is, and counts as a real photo', () => {
    expect(isPhotoChoice(GOOD)).toBe(true);
    expect(isPhotoChoice('voltas-185v.jpg')).toBe(true);
    expect(photoUrlForPys(GOOD)).toBe(GOOD);
    expect(photoSrc(GOOD)).toBe(GOOD);
    expect(photoSrc('voltas-185v.jpg')).toBe('/images/products/voltas-185v.jpg');
    expect(photoChoiceOf(GOOD)).toBe(GOOD);
    expect(photoChoiceOf('https://images.unsplash.com/photo-1')).toBeNull();
    expect(hasRealPhoto({ imageUrl: GOOD })).toBe(true);
    expect(hasRealPhoto({ imageUrl: GOOD.replace('ess-product-photos', 'other') })).toBe(false);
  });
});

describe('POST /api/admin/photos/upload-link', () => {
  it('401 without an admin session (PYS is not asked)', async () => {
    const res = await post({ contentType: 'image/jpeg', sizeBytes: 1000 });
    expect(res.status).toBe(401);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('refuses other types and photos over 5 MB before asking PYS', async () => {
    session = { accessToken: 't' };
    expect((await post({ contentType: 'image/gif', sizeBytes: 1000 })).status).toBe(400);
    expect((await post({ contentType: 'image/png', sizeBytes: 5 * 1024 * 1024 + 1 })).status).toBe(400);
    expect((await post({ contentType: 'image/png', sizeBytes: 0 })).status).toBe(400);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it('returns the one-time link and the photo address from PYS, never cached', async () => {
    session = { accessToken: 't' };
    adminRequest.mockResolvedValue({ signedUrl: `${HOST}/storage/v1/object/upload/sign/ess-product-photos/x?token=abc`, publicUrl: GOOD, token: 'abc', path: 'x' });
    const res = await post({ contentType: 'image/webp', sizeBytes: 120_000 });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(adminRequest).toHaveBeenCalledWith('POST', '/product-photos/upload-link', { contentType: 'image/webp', sizeBytes: 120_000 });
    expect(await res.json()).toEqual({ signedUrl: `${HOST}/storage/v1/object/upload/sign/ess-product-photos/x?token=abc`, publicUrl: GOOD });
  });

  it('refuses an answer that does not point at the photo bucket', async () => {
    session = { accessToken: 't' };
    adminRequest.mockResolvedValue({ signedUrl: 'https://evil.example/upload', publicUrl: GOOD });
    expect((await post({ contentType: 'image/webp', sizeBytes: 10 })).status).toBe(502);
  });
});

describe('GET /api/admin/photos also lists uploaded photos', () => {
  it('adds valid uploaded addresses from PYS and drops anything else', async () => {
    session = { accessToken: 't' };
    adminRequest.mockResolvedValue({ photos: [{ publicUrl: GOOD }, { publicUrl: 'https://evil.example/a.jpg' }, {}] });
    const body = (await (await GET()).json()) as { photos: string[]; uploaded: string[] };
    expect(body.uploaded).toEqual([GOOD]);
    expect(body.photos).toContain('voltas-185v.jpg');
  });

  it('still lists the site photos when PYS cannot be reached', async () => {
    session = { accessToken: 't' };
    adminRequest.mockRejectedValue(new Error('down'));
    const body = (await (await GET()).json()) as { photos: string[]; uploaded: string[] };
    expect(body.uploaded).toEqual([]);
    expect(body.photos.length).toBeGreaterThan(0);
  });
});
