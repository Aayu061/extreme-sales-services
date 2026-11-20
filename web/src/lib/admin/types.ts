/**
 * Shapes of the PYS ESS admin API (/api/v1/ess/admin), mirrored from PYS
 * (server/src/middleware/essActor.ts, server/src/services/essAdmin.service.ts).
 */

import type { SellerDisclosure } from '@/lib/pys/types';

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

/**
 * One website text block in GET /content ({ blocks: [...] }, by key), as PYS essAdminService
 * listContent. `publishedVersion` 0 and `publishedAt` null = never published. `adminOnly`: business
 * and legal blocks, which only an ESS Admin can change.
 */
export interface AdminContentSummary {
  key: string;
  publishedVersion: number;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  hasUnpublishedChanges: boolean;
  adminOnly: boolean;
}

/**
 * GET /content/:key, and the answer of PUT /content/:key (save draft) and POST
 * /content/:key/publish, as PYS essAdminService getContent. Publishing copies `draft` to
 * `published` and adds one to the version. A key PYS has never stored is 404.
 */
export interface AdminContentBlock {
  key: string;
  draft: unknown;
  published: unknown | null;
  publishedVersion: number;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  adminOnly: boolean;
  history: Array<{ version: number; publishedAt: string }>;
}

/**
 * One product in GET /products ({ products: [...] }, in shop order) and the answer of
 * POST /products and PATCH /products/:id, as PYS essAdminService mapAdminProduct. Prices are rupees,
 * GST included (null = price on request). `isPublished` false = hidden from the website.
 * `imageUrl` is a full address (see lib/product-photo.ts).
 */
export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  modelNumber: string | null;
  tonnage: string | null;
  starRating: string | null;
  price: number | null;
  mrp: number | null;
  stock: number;
  inStock: boolean;
  isCustomQuote: boolean;
  description: string | null;
  coolingCapacity: string | null;
  powerConsumption: string | null;
  refrigerant: string | null;
  noiseLevel: string | null;
  dimensions: string | null;
  warranty: string | null;
  keyFeatures: string[];
  imageUrl: string | null;
  spaceType: string | null;
  idealFor: string | null;
  countryOfOrigin: string | null;
  isPublished: boolean;
  displayOrder: number;
  seller: SellerDisclosure | null;
  updatedAt: string | null;
}

/**
 * GET /catalog-display, and the answer of PATCH /catalog-display, as PYS essAdminService
 * getCatalogDisplay: every service and AMC plan (also those switched off in PYS), each list in
 * display order. `isPublic` false = hidden from the website; `isActive` false = switched off in PYS
 * (never on the website). AMC `code` is the public code (the plan code when there is none).
 */
export interface AdminDisplayService {
  code: string;
  name: string;
  category: string;
  isPublic: boolean;
  isActive: boolean;
  displayOrder: number;
}
export interface AdminDisplayPlan extends AdminDisplayService {
  planCode: string;
}
export interface AdminCatalogDisplay {
  services: AdminDisplayService[];
  amcPlans: AdminDisplayPlan[];
}

/** One change in PATCH /catalog-display { items } (PYS catalogDisplayPatchSchema, strict). */
export interface DisplayPatchItem {
  type: 'SERVICE' | 'AMC';
  code: string;
  isPublic?: boolean;
  displayOrder?: number;
}

/**
 * One pincode prefix in GET /service-areas ({ areas: [...] }, by prefix), and in the answers of
 * PUT /service-areas and DELETE /service-areas/:prefix, as PYS essAdminService listAreas. The
 * public pincode check uses the longest matching prefix; `isActive` false there = not covered.
 */
export interface AdminServiceArea {
  pincodePrefix: string;
  label: string;
  isActive: boolean;
  notes: string | null;
  updatedAt: string | null;
}

/** PUT /service-areas body (PYS serviceAreaSchema, strict). */
export interface ServiceAreaInput {
  pincodePrefix: string;
  label: string;
  isActive: boolean;
  notes: string | null;
}
