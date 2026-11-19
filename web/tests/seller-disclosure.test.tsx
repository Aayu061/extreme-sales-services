// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SellerDisclosure } from '@/components/shop/seller-disclosure';
import type { SellerDisclosure as Seller } from '@/lib/pys/types';

afterEach(cleanup);

const full: Seller = {
  code: 'ESS',
  name: 'Extreme Sales & Services',
  legalName: 'Extreme Sales & Services (Proprietor)',
  gstin: '27ANTPP9778J1ZO',
  address: 'Chembur, Mumbai',
  phone: '+91 7977805245',
  email: 'extremess0121@gmail.com',
  grievanceOfficer: { name: 'A. Officer', email: 'grievance@example.in', phone: '+91 9000000000' },
  returnPolicy: 'Returns within 7 days if unopened.',
  isFirstParty: true,
};

describe('SellerDisclosure', () => {
  it('shows every detail the e-commerce rules ask for', () => {
    render(<SellerDisclosure seller={full} />);
    for (const text of ['Extreme Sales & Services', 'Extreme Sales & Services (Proprietor)', 'Chembur, Mumbai', '27ANTPP9778J1ZO', '+91 7977805245', 'extremess0121@gmail.com', 'A. Officer', 'grievance@example.in', 'Returns within 7 days if unopened.']) {
      expect(screen.getAllByText(text, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('heading', { name: 'Sold by' })).toBeTruthy();
  });

  it('leaves out missing details and never prints "null"', () => {
    const { container } = render(
      <SellerDisclosure
        seller={{ ...full, legalName: full.name, gstin: null, address: null, phone: null, grievanceOfficer: { name: null, email: 'g@example.in', phone: null }, returnPolicy: null }}
      />,
    );
    expect(container.textContent).not.toContain('null');
    expect(container.textContent).not.toContain('GSTIN');
    expect(screen.getByText(/Grievance officer/)).toBeTruthy();
    expect(screen.getByText("Returns: ask us before you buy; we will explain the brand's policy.")).toBeTruthy();
    expect(screen.getAllByText('Extreme Sales & Services')).toHaveLength(1);
  });
});
