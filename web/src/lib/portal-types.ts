import type { BillStatus, Coverage } from '@/lib/portal-format';

/** S11b customer portal v2: the JSON PYS returns (docs/S11b-API-CONTRACT.md). Codes are raw; ESS turns them into words. */

export interface PortalCustomerStatus {
  code: string;
  label: string;
  step: number;
  tone: 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger';
}
export interface AcRef {
  id: string;
  label: string;
}
export interface BusinessIdentity {
  legalName: string;
  gstin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}
export interface Site {
  name: string;
  address: string;
}

export type AlertKind = 'AMC_ENDING' | 'AMC_EXPIRED' | 'WARRANTY_ENDING' | 'RECOMMENDATION' | 'BILL_DUE';
export interface PortalOverview {
  customer: { name: string; companyName: string | null; email: string | null; phone: string | null; city: string | null };
  nextVisit: { date: string; startTime: string | null; technicianFirstName: string | null; requestNumber: string | null; ac: AcRef | null } | null;
  amc: { id: string; contractNumber: string; plan: string | null; endDate: string; totalVisits: number | null; visitsUsed: number; visitsLeft: number | null } | null;
  billing: { amountDue: number; unpaidBills: number };
  openRequests: number;
  alerts: Array<{ kind: AlertKind; text: string; link: { kind: 'amc' | 'ac' | 'bill' | 'report'; id: string } | null }>;
}

export interface PortalAcs {
  acs: Array<{
    id: string;
    label: string;
    brand: string | null;
    model: string | null;
    type: string | null;
    tons: number | null;
    room: string | null;
    floor: string | null;
    coverage: Coverage;
    serialLast4: string | null;
    lastServiceDate: string | null;
    openRecommendations: number;
  }>;
}

export interface PortalAcDetail {
  ac: {
    id: string;
    label: string;
    brand: string | null;
    model: string | null;
    type: string | null;
    tons: number | null;
    technology: string | null;
    starRating: string | null;
    room: string | null;
    floor: string | null;
    installedOn: string | null;
    purchasedOn: string | null;
    serials: { indoor: string | null; outdoor: string | null; unit: string | null };
    condition: string | null;
    site: Site | null;
    warranty: { status: Coverage; start: string | null; end: string | null; visitsTotal: number | null; visitsUsed: number | null };
  };
  amc: Array<{ id: string; contractNumber: string; plan: string | null; status: string; endDate: string }>;
  history: Array<{
    reportNumber: string;
    date: string;
    serviceType: string | null;
    visitKind: 'AMC' | 'REQUEST' | 'OTHER';
    faultReported: string | null;
    findings: string | null;
    workDone: string | null;
    outcome: string | null;
    conditionAfter: string | null;
    refrigerantKg: number | null;
    parts: Array<{ name: string; quantity: number }>;
    technicianFirstName: string | null;
    photoCount: number;
  }>;
  recommendations: Array<{ text: string; date: string; reportNumber: string }>;
}

export interface PortalAmcList {
  contracts: Array<{
    id: string;
    contractNumber: string;
    plan: string | null;
    status: string;
    startDate: string;
    endDate: string;
    totalVisits: number | null;
    visitsUsed: number;
    visitsLeft: number | null;
    acCount: number;
  }>;
}

export type AmcServiceType = 'DRY_SERVICE' | 'JET_SERVICE' | 'PUMPDOWN_SERVICE';
export interface PortalAmcDetail {
  contract: {
    id: string;
    contractNumber: string;
    plan: string | null;
    planCode: string | null;
    status: string;
    startDate: string;
    endDate: string;
    frequency: string;
    amount: number;
    includes: { gasCharging: boolean; spareParts: boolean; unlimitedComplaints: boolean };
    coverageSummary: string | null;
    acs: AcRef[];
    visits: { total: number | null; used: number; left: number | null; byType: Array<{ type: AmcServiceType; total: number; used: number }> };
    timeline: Array<{
      visitNumber: number;
      date: string | null;
      month: string | null;
      state: 'DONE' | 'UPCOMING' | 'PLANNED' | 'MISSED';
      startTime: string | null;
      technicianFirstName: string | null;
      serviceType: string | null;
      reportNumber: string | null;
    }>;
    canRenew: boolean;
    renewalRequestedAt: string | null;
  };
}

export type RequestFilter = 'open' | 'completed' | 'all';
export interface PortalRequests {
  requests: Array<{
    number: string;
    type: string | null;
    createdAt: string;
    status: PortalCustomerStatus;
    ac: AcRef | null;
    visit: { date: string; startTime: string | null; technicianFirstName: string | null } | null;
    hasReport: boolean;
    billNumber: string | null;
  }>;
}

export interface PortalRequestDetail {
  request: {
    number: string;
    type: string | null;
    description: string | null;
    createdAt: string;
    status: PortalCustomerStatus;
    ac: AcRef | null;
    timeline: Array<{ label: string; at: string }>;
    visits: Array<{ date: string; startTime: string | null; state: string; technicianFirstName: string | null }>;
    reports: Array<{ reportNumber: string; date: string }>;
    bill: { number: string; total: number; balance: number; status: BillStatus } | null;
  };
}

export interface PortalReport {
  report: {
    number: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    serviceType: string | null;
    visitKind: 'AMC' | 'REQUEST' | 'OTHER';
    requestNumber: string | null;
    contractNumber: string | null;
    technicianFirstName: string | null;
    outcome: string | null;
    workDescription: string | null;
    observations: string | null;
    actionTaken: string | null;
    recommendation: string | null;
    acs: Array<{
      ac: AcRef | null;
      label: string;
      faultReported: string | null;
      findings: string | null;
      workDone: string | null;
      outcome: string | null;
      conditionAfter: string | null;
      refrigerantKg: number | null;
    }>;
    parts: Array<{ name: string; quantity: number }>;
    photos: Array<{ kind: 'BEFORE' | 'AFTER'; url: string; expiresAt: string }>;
    site: Site | null;
  };
  business: BusinessIdentity;
}

export interface PortalBilling {
  totals: { due: number; paidThisYear: number };
  bills: Array<{ number: string; date: string | null; forLabel: string; total: number; paid: number; balance: number; status: BillStatus }>;
}

/**
 * NONE: no GST, show no tax lines. INTRA: CGST + SGST at half the rate each. INTER: IGST.
 * legacy: a bill made before GST was stored; PYS shows it as 18% included, within the state.
 */
export interface BillTax {
  treatment: 'INCLUSIVE' | 'EXCLUSIVE' | 'NONE';
  ratePercent: number;
  supplyType: 'INTRA' | 'INTER' | null;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  legacy: boolean;
}

/** The invoice's tax rows (label, amount), in order. Empty for a bill without GST. */
export function billTaxRows(tax: BillTax): Array<{ label: string; amount: number }> {
  if (tax.treatment === 'NONE') return [];
  if (tax.supplyType === 'INTER') return [{ label: `IGST (${tax.ratePercent}%)`, amount: tax.igst }];
  const half = tax.ratePercent / 2;
  return [
    { label: `CGST (${half}%)`, amount: tax.cgst },
    { label: `SGST (${half}%)`, amount: tax.sgst },
  ];
}

export interface PortalBill {
  bill: {
    number: string;
    date: string | null;
    forLabel: string;
    requestNumber: string | null;
    contractNumber: string | null;
    customer: { name: string; code: string | null; phone: string | null; address: string | null };
    total: number;
    /** S11c: the GST stored on the bill when it was made; never changes (see the contract). */
    tax: BillTax;
    paid: number;
    balance: number;
    status: BillStatus;
    payments: Array<{ date: string | null; method: string; amount: number; referenceLast4: string | null; kind: 'PAYMENT' | 'REVERSAL' }>;
    upiLink: string | null;
  };
  business: BusinessIdentity;
}
