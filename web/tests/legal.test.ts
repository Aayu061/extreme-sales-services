import { describe, expect, it } from 'vitest';
import { legalBody } from '@/lib/legal';
import { FALLBACK_IDENTITY } from '@/lib/data';

describe('legalBody', () => {
  it('uses the built-in text with the business details filled in when nothing is published', () => {
    for (const doc of ['privacy', 'terms'] as const) {
      for (const block of [undefined, null, {}, { title: 'X' }, { title: 'X', sections: [] }, 'nonsense']) {
        const body = legalBody(doc, block, FALLBACK_IDENTITY);
        const all = JSON.stringify(body);
        expect(body.sections.length).toBeGreaterThan(2);
        expect(all).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(all).toContain('extremess0121@gmail.com');
      }
    }
  });

  it('says "our grievance officer" when no name is set, and the name when it is', () => {
    expect(JSON.stringify(legalBody('privacy', null, FALLBACK_IDENTITY))).toContain('our grievance officer');
    const named = { ...FALLBACK_IDENTITY, grievanceOfficer: { ...FALLBACK_IDENTITY.grievanceOfficer, name: 'Priya Shah' } };
    expect(JSON.stringify(legalBody('privacy', null, named))).toContain('Priya Shah');
  });

  it('puts the warranty from the business details into the terms', () => {
    expect(JSON.stringify(legalBody('terms', null, FALLBACK_IDENTITY))).toContain('45-day warranty on our work');
  });

  it('uses text published from the admin area when it is complete', () => {
    const block = { title: 'Privacy notice', updatedOn: '2027-01-01', sections: [{ heading: 'Hello', paragraphs: ['Contact {email}.'] }] };
    const body = legalBody('privacy', block, FALLBACK_IDENTITY);
    expect(body.updatedOn).toBe('2027-01-01');
    expect(body.sections[0].paragraphs[0]).toBe('Contact extremess0121@gmail.com.');
  });

  it('describes customer website accounts (S11) and keeps the backup section', () => {
    const privacy = legalBody('privacy', null, FALLBACK_IDENTITY);
    const headings = privacy.sections.map((x) => x.heading);
    expect(headings).toContain('Your website account');
    expect(headings).toContain('Backup copies (ESS-PYS Backups)');
    expect(privacy.updatedOn).toBe('2026-11-27');
    const all = JSON.stringify(privacy);
    for (const fact of ['6-digit code', '10 minutes', 'keyed one-way fingerprint', 'locked for 24 hours', 'ess_account', '7 days without use', '30 days at most', 'visits used and left', 'first name of the technician', 'switch off your website account']) {
      expect(all).toContain(fact);
    }
    const terms = legalBody('terms', null, FALLBACK_IDENTITY);
    expect(terms.sections.map((x) => x.heading)).toContain('Your account');
    expect(JSON.stringify(terms)).toMatch(/Keep your sign-in codes private/);
  });
});
