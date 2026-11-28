import path from 'node:path';
import type { NextConfig } from 'next';
import { LEGACY_REDIRECTS } from './src/lib/legacy-redirects';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Next logs each server action call with its arguments in development; admin actions carry
  // emails and customer details, which are never logged.
  logging: { serverFunctions: false },
  turbopack: {
    // web/ has its own lockfile inside the ESS repo; build from here.
    root: path.join(__dirname),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    // Product photos are still hosted externally (to be replaced with ESS's own photos in Stage D).
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Photos uploaded from the admin (S10): only the product-photo bucket of a Supabase project.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/ess-product-photos/**' },
    ],
    // Hero photos are served at 70; product photos at the default 75.
    qualities: [70, 75],
  },
  // The admin photo picker lists public/images/products at request time; public/ is not part of a
  // server function by default, so the folder is traced into that one route.
  outputFileTracingIncludes: {
    '/api/admin/photos': ['./public/images/products/**/*'],
  },
  // Old site page addresses → new pages (permanent), so saved links keep working.
  async redirects() {
    return LEGACY_REDIRECTS;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Customer account pages hold one person's data: never stored by the browser or any shared cache, so Back
        // after signing out on a shared computer does not show the last page again.
        source: '/account',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
      {
        source: '/account/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
