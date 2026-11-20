/**
 * Shapes of the PYS ESS admin API (/api/v1/ess/admin), mirrored from PYS
 * (server/src/middleware/essActor.ts, server/src/services/essAdmin.service.ts).
 */

export type EssRole = 'ESS_ADMIN' | 'ESS_STAFF';

/** The signed-in person (GET /me). A PYS Admin always has ESS_ADMIN in `roles`. */
export interface AdminMe {
  roles: EssRole[];
  isPysAdmin: boolean;
  name: string | null;
  email: string | null;
}

/** GET /overview (essAdminService.overview). */
export interface AdminOverview {
  requests: { pendingReview: number; last24Hours: number; sellerInterestPending: number };
  products: { total: number; published: number };
  content: { blocksWithUnpublishedChanges: number };
}

/**
 * One website request in GET /leads (PYS IntakeDto). Only the fields the site reads are listed;
 * PYS sends more (address, AC details, lines …).
 */
export interface AdminLead {
  id: string;
  intakeNumber: string;
  trackingCode: string;
  kind: string;
  status: string;
  contact: { name: string; phone: string; email: string | null };
  createdAt: string;
}

/** GET /leads: one page, newest first (oldest first when filtered to "waiting for approval"). */
export interface AdminLeadsPage {
  items: AdminLead[];
  total: number;
  page: number;
  pageSize: number;
}

export type EnquiryLineStatus = 'QUOTE_PENDING' | 'QUOTED' | 'FULFILLED' | 'CANCELLED';

/**
 * One AC line in GET /enquiries ({ enquiries: [...] }, newest first), as PYS EnquiryLine.
 * Prices are rupees per AC, GST included. `customer` is shown only on the AC enquiries screen.
 */
export interface AdminEnquiryLine {
  lineId: string;
  intakeNumber: string;
  trackingCode: string;
  receivedAt: string;
  productId: string | null;
  productName: string;
  quantity: number;
  notes: string | null;
  status: EnquiryLineStatus;
  listedPrice: number | null;
  quote: { total: number; note: string | null; at: string | null } | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    area: string | null;
    city: string | null;
    pincode: string | null;
    message: string | null;
  };
}
