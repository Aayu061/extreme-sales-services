import { describe, expect, it } from 'vitest';
import { hasRealPhoto } from '@/components/shop/product-art';

describe('hasRealPhoto', () => {
  it('uses the photos stored with the site', () => {
    expect(hasRealPhoto({ imageUrl: '/images/products/voltas-185v.jpg' })).toBe(true);
  });

  it('draws the AC instead for stock photos, other sites, odd paths or no photo', () => {
    expect(hasRealPhoto({ imageUrl: 'https://images.unsplash.com/photo-1' })).toBe(false);
    expect(hasRealPhoto({ imageUrl: 'https://example.com/ac.jpg' })).toBe(false);
    expect(hasRealPhoto({ imageUrl: '//evil.test/images/products/x.jpg' })).toBe(false);
    expect(hasRealPhoto({ imageUrl: '/images/products/../secret.jpg' })).toBe(false);
    expect(hasRealPhoto({ imageUrl: null })).toBe(false);
  });
});
