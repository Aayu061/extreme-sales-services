import type { MetadataRoute } from 'next';
import { serverEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const site = serverEnv().SITE_URL;
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/book', '/account', '/admin'] },
    sitemap: `${site}/sitemap.xml`,
  };
}
