import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Fakes: the admin session (cookie check) and Next's request-time marker ----

let session: { accessToken: string } | null = null;
vi.mock('@/lib/admin/session', () => ({ getAdminSession: async () => session }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}));

import { GET } from '@/app/api/admin/photos/route';
import { listProductPhotos } from '@/lib/admin/photos';

const call = () => GET();

beforeEach(() => {
  session = null;
});

describe('GET /api/admin/photos', () => {
  it('answers 401 without an admin session, lists nothing, and is never cached', async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.text();
    expect(body).not.toContain('.jpg');
  });

  it('lists the product photos stored with the site for a signed-in person, never cached', async () => {
    session = { accessToken: 'dev-staff-token' };
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const { photos } = (await res.json()) as { photos: string[] };
    expect(photos).toContain('voltas-185v.jpg');
    expect(photos).toContain('daikin-ftkm71u.jpg');
    expect(photos).toEqual([...photos].sort());
    for (const p of photos) expect(p).toMatch(/^[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$/i);
  });

  it('takes nothing from the request (no way to point it outside the photos folder)', async () => {
    // The handler does not even receive the request, so no query or path can choose the folder.
    expect(GET.length).toBe(0);
    session = { accessToken: 'dev-staff-token' };
    const { photos } = (await (await call()).json()) as { photos: string[] };
    for (const p of photos) expect(p).not.toMatch(/[\\/]|\.\./);
  });
});

describe('listProductPhotos', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ess-photos-'));
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps only image files with plain names the shop can show, sorted', async () => {
    // The shop shows .jpg/.jpeg/.png/.webp/.avif photos (lower case), so the picker offers only those.
    for (const f of ['b-ac.webp', 'a-ac.jpg', 'UPPER.JPG', 'notes.txt', 'evil..jpg', 'with space.jpg', 'c.png', '.hidden.jpg', 'x.svg']) {
      writeFileSync(path.join(dir, f), '');
    }
    mkdirSync(path.join(dir, 'folder.jpg'));
    expect(await listProductPhotos(dir)).toEqual(['a-ac.jpg', 'b-ac.webp', 'c.png']);
  });

  it('gives an empty list when the folder is missing', async () => {
    expect(await listProductPhotos(path.join(dir, 'missing'))).toEqual([]);
  });
});
