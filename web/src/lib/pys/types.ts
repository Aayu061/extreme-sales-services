/**
 * Shapes returned by the signed PYS API (/api/v1/ess). PYS is the source of truth; these mirror
 * server/src/services/catalog.service.ts, essSite.service.ts and intake.service.ts in the PYS repo.
 */

export interface PriceBreakup {
  base: number;
  gstRatePercent: number;
  gst: number;
  total: number;
}

export interface CatalogServicePrice extends PriceBreakup {
  acType: string;
  tonnageMin: number;
  tonnageMax: number;
}

export type PricingModel = 'FIXED' | 'FROM' | 'QUOTE_AFTER_DIAGNOSIS';

export interface CatalogService {
  code: string;
  name: string;
  shortDescription: string | null;
  includes: string[];
  excludes: string[];
  category: string;
  requestType: string;
  serviceType: string;
  pricingModel: PricingModel;
  price: PriceBreakup | null;
  priceMatrix: CatalogServicePrice[];
  sacCode: string | null;
  durationMinutes: number | null;
  warrantyDays: number | null;
  appliesToAcTypes: string[];
  isPublic: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface CatalogAmcPlan {
  code: string;
  planCode: string;
  name: string;
  category: string;
  description: string | null;
  coverageSummary: string | null;
  visitsPerYear: number;
  frequency: string;
  appliesToAcTypes: string[];
  maxEquipmentAgeYears: number | null;
  hasGasCharging: boolean;
  hasSpareParts: boolean;
  hasUnlimitedComplaints: boolean;
  pricingModel: string;
  rates: {
    splitSmall: PriceBreakup | null;
    splitLarge: PriceBreakup | null;
    windowSmall: PriceBreakup | null;
    windowLarge: PriceBreakup | null;
    flat: PriceBreakup | null;
  };
  sacCode: string | null;
}

export interface Catalog {
  version: number;
  generatedAt: string;
  currency: 'INR';
  services: CatalogService[];
  amcPlans: CatalogAmcPlan[];
}

export interface SellerDisclosure {
  code: string;
  name: string;
  legalName: string;
  gstin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  grievanceOfficer: { name: string | null; email: string | null; phone: string | null };
  returnPolicy: string | null;
  isFirstParty: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  modelNumber: string | null;
  tonnage: string | null;
  starRating: string | null;
  /** Selling price incl. GST; null = price on request. */
  price: number | null;
  mrp: number | null;
  inStock: boolean;
  isCustomQuote: boolean;
  description: string | null;
  specs: {
    coolingCapacity: string | null;
    powerConsumption: string | null;
    refrigerant: string | null;
    noiseLevel: string | null;
    dimensions: string | null;
  };
  warranty: string | null;
  keyFeatures: string[];
  imageUrl: string | null;
  spaceType: string | null;
  idealFor: string | null;
  countryOfOrigin: string | null;
  displayOrder: number;
  seller: SellerDisclosure;
}

export interface ContentBlock<T = unknown> {
  version: number;
  body: T;
  publishedAt: string | null;
}

export interface BusinessIdentity {
  legalName: string;
  tradeName: string;
  proprietorName: string | null;
  gstin: string | null;
  address: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  hours: string;
  warrantyDays: number;
  grievanceOfficer: { name: string | null; email: string | null; phone: string | null };
}

export interface HomeHero {
  headline: string;
  subline: string;
}

/** One item of the "home.offers" content block (edited in ESS admin). Empty list = no banner. */
export interface HomeOffer {
  title: string;
  text?: string | null;
  /** Where the banner leads, e.g. "/amc" or "/book?service=SVC-JET-WASH". Site paths only. */
  href?: string | null;
  linkLabel?: string | null;
  /** Last day of the offer (YYYY-MM-DD); the banner hides itself after this date. */
  endsOn?: string | null;
}

export interface ServiceArea {
  pincodePrefix: string;
  label: string;
}

export interface Serviceability {
  pincode: string;
  serviceable: boolean;
  area: string | null;
}

export type CustomerStatusCode =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'SCHEDULED'
  | 'TECHNICIAN_ASSIGNED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAYMENT_DUE'
  | 'AWAITING_PARTS'
  | 'FOLLOW_UP'
  | 'ON_HOLD'
  | 'NOT_ACCEPTED'
  | 'CANCELLED';

export interface CustomerStatus {
  code: CustomerStatusCode;
  label: string;
  step: 1 | 2 | 3 | 4 | 5 | 6;
  tone: 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger';
  sideState: boolean;
}

export interface TrackResult {
  trackingCode: string;
  intakeNumber: string;
  kind: string;
  receivedAt: string;
  requestNumber: string | null;
  status: CustomerStatus;
  steps: Array<{ step: number; label: string }>;
  preferred: { date: string | null; slot: string | null };
  visit: { date: string; startTime: string | null; endTime: string | null; technicianFirstName: string | null } | null;
  area: string | null;
  items: Array<{
    type: string;
    name: string;
    quantity: number;
    status: 'PENDING' | 'CONFIRMED' | 'SELLER_WILL_QUOTE' | 'DONE' | 'NOT_ACCEPTED' | 'CANCELLED';
    price: { total: number; label: string } | null;
  }>;
}

export interface IntakeCreated {
  intakeNumber: string;
  trackingCode: string;
  status: string;
}
