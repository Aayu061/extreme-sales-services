import type { BusinessIdentity, CatalogService, Product } from '@/lib/pys/types';
import { serviceSlug } from '@/lib/services';

/**
 * Structured data (schema.org JSON-LD) so search engines understand the business, its services
 * and its ACs. Only confirmed facts: no ratings or reviews until real Google reviews are linked.
 */

const BUSINESS_NAME = 'Extreme Sales & Services';
const AREAS = ['Mumbai', 'Thane', 'Navi Mumbai'];

export function localBusinessLd(identity: BusinessIdentity, siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HVACBusiness',
    name: identity.tradeName || identity.legalName,
    legalName: identity.legalName,
    url: siteUrl,
    logo: `${siteUrl}/brand/ess-logo-512.png`,
    image: `${siteUrl}/brand/ess-og-image-1200x630.png`,
    telephone: identity.phone,
    email: identity.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: identity.address,
      addressLocality: 'Mumbai',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    areaServed: AREAS.map((name) => ({ '@type': 'City', name })),
    ...(identity.gstin ? { taxID: identity.gstin } : {}),
  };
}

export function serviceLd(s: CatalogService, siteUrl: string): Record<string, unknown> {
  const url = `${siteUrl}/services/${serviceSlug(s.code)}`;
  const priced = s.price && s.pricingModel !== 'QUOTE_AFTER_DIAGNOSIS';
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    ...(s.shortDescription ? { description: s.shortDescription } : {}),
    serviceType: 'AC service',
    url,
    provider: { '@type': 'HVACBusiness', name: BUSINESS_NAME, url: siteUrl },
    areaServed: AREAS.map((name) => ({ '@type': 'City', name })),
    ...(priced ? { offers: { '@type': 'Offer', price: s.price!.total, priceCurrency: 'INR', url } } : {}),
  };
}

export function productLd(p: Product, siteUrl: string): Record<string, unknown> {
  const url = `${siteUrl}/shop/${encodeURIComponent(p.id)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    ...(p.modelNumber ? { sku: p.modelNumber, mpn: p.modelNumber } : {}),
    ...(p.description ? { description: p.description } : {}),
    url,
    ...(p.price !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'INR',
            availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: p.seller.name },
            url,
          },
        }
      : {}),
  };
}
