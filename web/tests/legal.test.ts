import { describe, expect, it } from 'vitest';
import { legalBody, privacyNoticeVersion, PRIVACY_NOTICE_VERSION } from '@/lib/legal';
import { FALLBACK_IDENTITY } from '@/lib/data';
import { NOTICE_VERSION } from '@/lib/request-schema';

describe('S12 / E1: the privacy notice shown is the version recorded with consent', () => {
  it('built-in text: the page date, the consent stamp and the notice version are one value', () => {
    expect(NOTICE_VERSION).toBe(PRIVACY_NOTICE_VERSION);
    expect(legalBody('privacy', null, FALLBACK_IDENTITY).updatedOn).toBe(PRIVACY_NOTICE_VERSION);
    expect(privacyNoticeVersion(null)).toBe(PRIVACY_NOTICE_VERSION);
  });

  it('published admin text: the page date and the recorded version are its "Last updated" date', () => {
    const block = { title: 'Privacy notice', updatedOn: '2027-02-01', sections: [{ heading: 'A', paragraphs: ['b'] }] };
    expect(privacyNoticeVersion(block)).toBe('2027-02-01');
    expect(legalBody('privacy', block, FALLBACK_IDENTITY).updatedOn).toBe(privacyNoticeVersion(block));
  });

  it('published text without a date (or incomplete text): both fall back to the built-in version', () => {
    for (const block of [{ title: 'P', sections: [{ heading: 'A', paragraphs: ['b'] }] }, { title: 'P', sections: [] }, 'nonsense']) {
      expect(legalBody('privacy', block, FALLBACK_IDENTITY).updatedOn).toBe(privacyNoticeVersion(block));
      expect(privacyNoticeVersion(block)).toBe(PRIVACY_NOTICE_VERSION);
    }
  });
});

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

  it('is the client-approved v3 (28 Nov 2026): accounts, choices and rights, and no backup section while backups are off', () => {
    const privacy = legalBody('privacy', null, FALLBACK_IDENTITY);
    const headings = privacy.sections.map((x) => x.heading);
    expect(headings).toContain('Your website account');
    expect(headings).toContain('Your choices and rights');
    expect(headings.some((h) => /backup/i.test(h))).toBe(false); // S04 is not running for live records
    expect(privacy.updatedOn).toBe('2026-11-28');
    const all = JSON.stringify(privacy);
    for (const fact of [
      '6-digit code', '10 minutes', 'stops working after 5 wrong tries', 'keyed one-way fingerprint', 'locked for 24 hours',
      'ess_account', 'sent only over secure connections', 'lasts at most 30 days', '7 days without use', '30 days at most',
      'visits used and left', 'first name of the technician', 'switch off your website account',
      // v3 additions checked against the code (S12-PRIVACY-NOTICE-v3-DRAFT.md, section C)
      'UPI QR code', 'last 4 characters', 'deleted within about 2 days', 'deleted after 30 days', 'Mumbai, India',
      'United States', 'currently 6 years', 'reply within 30 days', 'withdraw your consent', 'parent or guardian',
    ]) {
      expect(all).toContain(fact);
    }
    expect(all).not.toMatch(/\[\[|kept only briefly/); // no open blanks, no old inaccurate claim
    const terms = legalBody('terms', null, FALLBACK_IDENTITY);
    expect(terms.sections.map((x) => x.heading)).toContain('Your account');
    expect(JSON.stringify(terms)).toMatch(/Keep your sign-in codes private/);
  });
});

describe('S12 / E4: the business address the website falls back to', () => {
  it("is ESS's own address (New Panvel), never the old Govandi text", () => {
    expect(FALLBACK_IDENTITY.address).toBe('204 Kokan Residency, 2nd floor, Vikas Wadi, Nr J P Bar, Devad, New Panvel, Maharashtra 410206, India');
    expect(JSON.stringify(legalBody('privacy', null, FALLBACK_IDENTITY))).not.toMatch(/Govandi/i);
  });
});
