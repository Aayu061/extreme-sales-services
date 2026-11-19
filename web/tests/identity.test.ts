import { describe, expect, it } from 'vitest';
import { FALLBACK_IDENTITY } from '@/lib/data';

describe('business details used when PYS cannot be reached', () => {
  it('shows the office hours Mon–Sat 9:00 am – 6:30 pm', () => {
    expect(FALLBACK_IDENTITY.hours).toBe('Mon–Sat, 9:00 am – 6:30 pm');
  });
});
