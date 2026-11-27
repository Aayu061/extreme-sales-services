// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/app/(site)/account/actions', () => ({ signOut: vi.fn() }));

import { AccountView, amcVisitsText } from '@/components/account/account-view';
import type { AccountOverview } from '@/lib/account';

afterEach(cleanup);

const contract = (extra: Partial<AccountOverview['amc'][number]>): AccountOverview['amc'][number] => ({
  contractNumber: 'AMC-0001',
  plan: 'Comprehensive',
  status: 'ACTIVE',
  startDate: '2026-04-01',
  endDate: '2027-03-31',
  totalVisits: 4,
  acCount: 2,
  ...extra,
});
const overview = (amc: AccountOverview['amc']): AccountOverview => ({
  customer: { name: 'Asha', companyName: null, email: 'asha@example.com', phone: null, city: 'Mumbai' },
  acs: [],
  amc,
  requests: [],
});

describe('amcVisitsText (G1)', () => {
  it('shows used, left and the total', () => {
    expect(amcVisitsText({ visitsUsed: 2, visitsLeft: 2, totalVisits: 4 })).toBe('Visits: 2 used, 2 left of 4');
  });
  it('leaves out "of" when there is no total', () => {
    expect(amcVisitsText({ visitsUsed: 1, visitsLeft: 3, totalVisits: null })).toBe('Visits: 1 used, 3 left');
  });
  it('shows only the visits used when nothing fixed is left', () => {
    expect(amcVisitsText({ visitsUsed: 5, visitsLeft: null, totalVisits: null })).toBe('Visits: 5 used');
  });
  it('is null for an older PYS answer without visitsUsed', () => {
    expect(amcVisitsText({ totalVisits: 4 })).toBeNull();
  });
});

describe('AccountView AMC card', () => {
  it('shows visits used and left', () => {
    render(<AccountView data={overview([contract({ visitsUsed: 2, visitsLeft: 2 })])} />);
    expect(screen.getByText('Visits: 2 used, 2 left of 4')).toBeTruthy();
    expect(screen.queryByText(/· 4 visits/)).toBeNull();
  });

  it('still renders an older PYS answer (total only)', () => {
    render(<AccountView data={overview([contract({})])} />);
    expect(screen.getByText(/· 4 visits/)).toBeTruthy();
    expect(screen.queryByText(/Visits:/)).toBeNull();
  });
});
