// Local stand-in for the signed PYS API (/api/v1/ess) so the site can be built and checked on a
// developer PC without the real ESS key. Data comes from dev/fixtures (copied from live PYS).
// It checks signatures with the dev key below, so the site's real signing code is exercised.
//
//   node dev/mock-pys.mjs            (listens on http://localhost:4010)
//   .env.local: PYS_API_URL=http://localhost:4010
//               PYS_INTEGRATION_KEY_ID=essweb_localdev
//               PYS_INTEGRATION_SECRET=local-dev-secret-not-for-production
// Admin area (/ess/admin/*): /admin/login "Sign in as test admin / staff" sends the token
// dev-admin-token (ESS Admin) or dev-staff-token (ESS Staff); sample requests, AC enquiries,
// products and website text are kept in memory and start again each time this runs (hiding a
// product in the admin area also takes it out of the shop here, and publishing website text
// changes what the public pages show).
import http from 'node:http';
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const KEY_ID = 'essweb_localdev';
const SECRET = 'local-dev-secret-not-for-production';
const PORT = Number(process.env.MOCK_PYS_PORT || 4010);
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const catalog = fixture('catalog');
const products = fixture('products');
const track = fixture('track');
const trackEnquiry = fixture('track-enquiry');

const content = {
  'business.identity': {
    version: 1,
    publishedAt: '2026-11-19T00:00:00Z',
    body: {
      legalName: 'Extreme Sales & Services',
      tradeName: 'Extreme Sales & Services',
      proprietorName: null,
      gstin: '27ANTPP9778J1ZO',
      address: 'Chembur, Mumbai, Maharashtra',
      phone: '+91 7977805245',
      whatsapp: '+91 7977805245',
      email: 'extremess0121@gmail.com',
      hours: 'Mon–Sat, 9:00 am – 6:30 pm',
      warrantyDays: 45,
      grievanceOfficer: { name: null, email: 'extremess0121@gmail.com', phone: '+91 7977805245' },
    },
  },
  'home.hero': {
    version: 1,
    publishedAt: '2026-11-19T00:00:00Z',
    body: {
      headline: 'What does your AC need?',
      subline: 'Servicing, repairs, AMC plans and new ACs across Mumbai, Thane and Navi Mumbai.',
    },
  },
  'home.offers': { version: 1, publishedAt: '2026-11-19T00:00:00Z', body: { items: [] } },
  faq: { version: 1, publishedAt: '2026-11-19T00:00:00Z', body: { items: [] } },
};

// ---------------------------------------------------------------- website text (one store, in memory)
// Kept like PYS's site_content_blocks (draft + published + version), seeded from the blocks above,
// so the admin "Website text" screen and the public pages read the same text: publishing in the
// admin area changes what GET /content (the public site) answers. legal.* is not seeded, like PYS:
// the site shows its built-in wording until a legal text is saved and published.
const clone = (v) => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));
const contentBlocks = new Map(
  Object.entries(content).map(([key, s]) => [
    key,
    { key, draft: clone(s.body), published: clone(s.body), publishedVersion: s.version, publishedAt: s.publishedAt, draftUpdatedAt: s.publishedAt, history: [{ version: s.version, publishedAt: s.publishedAt }] },
  ]),
);
/** The public read (essSite.service getContent): published text only. */
const publicContent = (keys) =>
  Object.fromEntries(
    keys
      .map((k) => [k, contentBlocks.get(k)])
      .filter(([, b]) => b && b.published !== null)
      .map(([k, b]) => [k, { version: b.publishedVersion, body: clone(b.published), publishedAt: b.publishedAt }]),
  );

const ok = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, data }));
};
const fail = (res, status, code, message, details) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: { code, message, details } }));
};

function verify(req, body) {
  const h = (n) => String(req.headers[n] ?? '');
  if (h('x-pys-key-id') !== KEY_ID) return false;
  const canonical = [h('x-pys-timestamp'), h('x-pys-nonce'), req.method, req.url, createHash('sha256').update(body).digest('hex')].join('\n');
  return createHmac('sha256', SECRET).update(canonical).digest('hex') === h('x-pys-signature');
}

// ---------------------------------------------------------------- ESS admin area (/ess/admin/*)
// In memory, same response shapes as PYS (server/src/services/essAdmin.service.ts and
// intake.service.ts). The site's dev sign-in sends one of these fixed tokens; anything else is 401.
const ACTORS = {
  'dev-admin-token': { profileId: 'dev-admin', email: 'test-admin@example.com', name: 'Test Admin', roles: ['ESS_ADMIN'], isPysAdmin: false },
  'dev-staff-token': { profileId: 'dev-staff', email: 'test-staff@example.com', name: 'Test Staff', roles: ['ESS_STAFF'], isPysAdmin: false },
};

// ---------------------------------------------------------------- products (one list, in memory)
// Kept in the admin shape (essAdminService mapAdminProduct), seeded from the public fixture, so the
// admin Products screen and the public shop read the same ACs: a product hidden in the admin area
// leaves GET /products (the shop), like PYS's is_published filter.
const toAdminProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  brand: p.brand ?? null,
  modelNumber: p.modelNumber ?? null,
  tonnage: p.tonnage ?? null,
  starRating: p.starRating ?? null,
  price: p.price ?? null,
  mrp: p.mrp ?? null,
  stock: p.inStock ? 10 : 0,
  inStock: Boolean(p.inStock),
  isCustomQuote: Boolean(p.isCustomQuote),
  description: p.description ?? null,
  coolingCapacity: p.specs?.coolingCapacity ?? null,
  powerConsumption: p.specs?.powerConsumption ?? null,
  refrigerant: p.specs?.refrigerant ?? null,
  noiseLevel: p.specs?.noiseLevel ?? null,
  dimensions: p.specs?.dimensions ?? null,
  warranty: p.warranty ?? null,
  keyFeatures: p.keyFeatures ?? [],
  imageUrl: p.imageUrl ?? null,
  spaceType: p.spaceType ?? null,
  idealFor: p.idealFor ?? null,
  countryOfOrigin: p.countryOfOrigin ?? null,
  isPublished: p.isPublished !== false,
  displayOrder: p.displayOrder ?? 100,
  seller: p.seller ?? null,
  updatedAt: '2026-11-19T00:00:00Z',
});
/** The shop's shape (essSite.service mapProduct). */
const toPublicProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  brand: p.brand,
  modelNumber: p.modelNumber,
  tonnage: p.tonnage,
  starRating: p.starRating,
  price: p.price,
  mrp: p.mrp,
  inStock: p.inStock,
  isCustomQuote: p.isCustomQuote,
  description: p.description,
  specs: { coolingCapacity: p.coolingCapacity, powerConsumption: p.powerConsumption, refrigerant: p.refrigerant, noiseLevel: p.noiseLevel, dimensions: p.dimensions },
  warranty: p.warranty,
  keyFeatures: p.keyFeatures,
  imageUrl: p.imageUrl,
  spaceType: p.spaceType,
  idealFor: p.idealFor,
  countryOfOrigin: p.countryOfOrigin,
  displayOrder: p.displayOrder,
  seller: p.seller,
});
const productList = (Array.isArray(products) ? products : products.products).map(toAdminProduct);
const productById = (id) => productList.find((p) => p.id === id);
const FIRST_PARTY_SELLER = productList.find((p) => p.seller?.isFirstParty)?.seller ?? null;
/** Like PYS listProducts: by display order, then name. */
const sortedProducts = () => [...productList].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
const shopProducts = () => sortedProducts().filter((p) => p.isPublished).map(toPublicProduct);
const ago = (hours) => new Date(Date.now() - hours * 3600_000).toISOString();

/** A website request as PYS lists it (IntakeDto). `quote` on a line is kept here only, like the DB column. */
function intake(n, { kind, status, contact, address = {}, message = null, items = [], hoursAgo }) {
  return {
    id: `intake-${n}`,
    intakeNumber: `WEB-2026-DEV${String(n).padStart(3, '0')}`,
    trackingCode: `ESS-DEV${n}-${'ABCDEFGH'[n % 8]}${'JKLMNPQR'[n % 8]}`,
    kind,
    status,
    sourceChannel: 'EXTREME_SALES_SERVICES',
    externalReferenceId: `web-dev-${n}`,
    contact,
    address: { line: null, area: null, landmark: null, city: 'Mumbai', pincode: null, ...address },
    ac: { type: null, brand: null, tonnage: null, inverter: null, ageYears: null, units: null },
    request: { serviceCode: null, serviceName: null, amcPlanCode: null, message, preferredDate: null, preferredSlot: null },
    consent: { privacy: true, marketing: false },
    spamScore: 0,
    matchedCustomer: null,
    review: { reviewedBy: status === 'PENDING_REVIEW' ? null : 'dev-admin', reviewedAt: status === 'PENDING_REVIEW' ? null : ago(hoursAgo - 1), rejectionReason: null },
    serviceRequest: null,
    items: items.map((it, i) => ({
      id: `line-${n}-${i + 1}`,
      lineNo: i + 1,
      type: it.type,
      serviceCode: it.serviceCode ?? null,
      amcPlanCode: null,
      productId: it.productId ?? null,
      name: it.name,
      quantity: it.quantity ?? 1,
      ac: { type: null, tonnage: null, brand: null },
      notes: it.notes ?? null,
      price: it.price ?? null,
      status: it.status,
      seller: it.type === 'PRODUCT' ? { code: 'ESS', name: 'Extreme Sales & Services' } : null,
      quote: it.quote ?? null,
    })),
    createdAt: ago(hoursAgo),
  };
}

const productLine = (id, extra) => {
  const p = productById(id);
  const price = p?.price > 0 ? { total: p.price, label: `${p.name} (listed price incl. GST)` } : null;
  return { type: 'PRODUCT', productId: id, name: p?.name ?? id, price, ...extra };
};

const intakes = [
  intake(1, {
    kind: 'PRODUCT_ENQUIRY',
    status: 'APPROVED',
    contact: { name: 'Priya Shah', phone: '9876543210', email: 'priya.shah@example.com' },
    address: { area: 'Chembur', pincode: '400071' },
    message: 'Please call after 5 pm.',
    items: [productLine('TLRbwbHUxbXgBIJ9eCZM', { status: 'QUOTE_PENDING', notes: 'Installation needed' })],
    hoursAgo: 3,
  }),
  intake(2, {
    kind: 'PRODUCT_ENQUIRY',
    status: 'APPROVED',
    contact: { name: 'Rahul Mehta', phone: '9820012345', email: null },
    address: { area: 'Andheri East', pincode: '400069' },
    items: [
      productLine('prod-1794761315308', {
        status: 'QUOTED',
        quantity: 2,
        quote: { total: 48500, note: 'Includes standard installation.', at: ago(20) },
      }),
      productLine('oI1UpVLd2kug7WqY1ecF', { status: 'QUOTE_PENDING' }),
    ],
    hoursAgo: 30,
  }),
  intake(3, {
    kind: 'BASKET',
    status: 'PENDING_REVIEW',
    contact: { name: 'Sneha Iyer', phone: '9930011122', email: 'sneha.iyer@example.com' },
    address: { area: 'Thane West', city: 'Thane', pincode: '400601' },
    items: [{ type: 'SERVICE', serviceCode: 'SVC-DRY', name: 'Dry service', status: 'PENDING', price: { total: 590, label: 'Dry service' } }],
    hoursAgo: 2,
  }),
  intake(4, {
    kind: 'CONTACT',
    status: 'PENDING_REVIEW',
    contact: { name: 'Amit Kulkarni', phone: '9819900011', email: null },
    message: 'My AC is dripping water inside. Can someone check it this week?',
    hoursAgo: 5,
  }),
  intake(5, {
    kind: 'SELLER_INTEREST',
    status: 'PENDING_REVIEW',
    contact: { name: 'Coolwave Traders', phone: '9867012345', email: 'sales@coolwave.example.com' },
    message: 'We are an authorised dealer and would like to list our ACs.',
    hoursAgo: 50,
  }),
  intake(6, {
    kind: 'PRODUCT_ENQUIRY',
    status: 'PENDING_REVIEW',
    contact: { name: 'Neha Desai', phone: '9876501234', email: null },
    items: [productLine('TLRbwbHUxbXgBIJ9eCZM', { status: 'PENDING' })],
    hoursAgo: 1,
  }),
  // Older, already handled requests (3 to 26 days old), so the Requests screen has a second page.
  // None is waiting or recent, so the overview numbers above stay the same.
  ...Array.from({ length: 24 }, (_, i) => {
    const n = 7 + i;
    const kinds = ['SERVICE_BOOKING', 'AMC_REQUEST', 'CONTACT', 'BASKET'];
    const statuses = ['APPROVED', 'REJECTED', 'DUPLICATE', 'SPAM', 'WITHDRAWN', 'IMPORTED_ARCHIVE'];
    return intake(n, {
      kind: kinds[i % kinds.length],
      status: statuses[i % statuses.length],
      contact: { name: `Old customer ${n}`, phone: `98111${String(n).padStart(5, '0')}`, email: null },
      hoursAgo: 72 + i * 24,
    });
  }),
];

const leadDto = (it) => ({
  ...it,
  items: it.items.map((line) => {
    const copy = { ...line };
    delete copy.quote;
    return copy;
  }),
});

const LEAD_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DUPLICATE', 'SPAM'];
const LEAD_KINDS = ['SERVICE_BOOKING', 'AMC_REQUEST', 'PRODUCT_ENQUIRY', 'CONTACT', 'BASKET', 'SELLER_INTEREST'];

/** GET /leads, like intakeService.list + leadsQuerySchema (422 on a bad value). */
function listLeads(q) {
  const blank = (v) => (v === null || v.trim() === '' ? undefined : v.trim());
  const status = blank(q.get('status'));
  const kind = blank(q.get('kind'));
  const search = blank(q.get('search'));
  const page = blank(q.get('page')) === undefined ? 1 : Number(q.get('page'));
  const pageSize = blank(q.get('pageSize')) === undefined ? 25 : Number(q.get('pageSize'));
  const details = [];
  if (status && !LEAD_STATUSES.includes(status)) details.push({ field: 'status', message: 'Invalid option', code: 'invalid_value' });
  if (kind && !LEAD_KINDS.includes(kind)) details.push({ field: 'kind', message: 'Invalid option', code: 'invalid_value' });
  if (search && search.length > 100) details.push({ field: 'search', message: 'Too long', code: 'too_big' });
  if (!Number.isInteger(page) || page < 1 || page > 10_000) details.push({ field: 'page', message: 'Invalid page', code: 'invalid_type' });
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) details.push({ field: 'pageSize', message: 'Invalid page size', code: 'invalid_type' });
  if (details.length) return { details };

  const term = search?.toLowerCase();
  const digits = search?.replace(/\D/g, '') ?? '';
  const rows = intakes
    .filter((it) => !status || it.status === status)
    .filter((it) => !kind || it.kind === kind)
    .filter(
      (it) =>
        !term ||
        [it.contact.name, it.contact.email ?? '', it.intakeNumber, it.trackingCode].some((v) => v.toLowerCase().includes(term)) ||
        (digits.length >= 4 && it.contact.phone.includes(digits.slice(-10))),
    )
    // PYS: oldest first while waiting for approval, otherwise newest first.
    .sort((a, b) => (status === 'PENDING_REVIEW' ? 1 : -1) * a.createdAt.localeCompare(b.createdAt));
  const from = (page - 1) * pageSize;
  return { data: { items: rows.slice(from, from + pageSize).map(leadDto), total: rows.length, page, pageSize } };
}

/** GET /enquiries: AC lines of approved requests, newest first, with the customer to call (EnquiryLine). */
function listEnquiries() {
  return intakes
    .filter((it) => it.status === 'APPROVED')
    .flatMap((it) =>
      it.items
        .filter((line) => line.type === 'PRODUCT' && ['QUOTE_PENDING', 'QUOTED', 'FULFILLED', 'CANCELLED'].includes(line.status))
        .map((line) => ({
          lineId: line.id,
          intakeNumber: it.intakeNumber,
          trackingCode: it.trackingCode,
          receivedAt: it.createdAt,
          productId: line.productId,
          productName: line.name,
          quantity: line.quantity,
          notes: line.notes,
          status: line.status,
          listedPrice: line.price?.total ?? null,
          quote: line.quote,
          customer: {
            name: it.contact.name,
            phone: it.contact.phone,
            email: it.contact.email,
            area: it.address.area,
            city: it.address.city,
            pincode: it.address.pincode,
            message: it.request.message,
          },
        })),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/**
 * POST /enquiries/:lineId/quote and /close, like essAdminService.quoteEnquiry / closeEnquiry with
 * enquiryLineParamSchema, enquiryQuoteSchema and enquiryCloseSchema (422 details as PYS's validate
 * middleware sends them). A line can be priced or closed while waiting or priced; once sold or not
 * taken it is 409. Sold → FULFILLED, not taken → CANCELLED.
 */
function enquiryWrite(path, method, rawBody) {
  const m = /^\/enquiries\/([^/]+)\/(quote|close)$/.exec(path);
  if (!m || method !== 'POST') return null;
  const lineId = decodeURIComponent(m[1]).trim();
  const action = m[2];
  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return { status: 400, code: 'BAD_REQUEST', message: 'Invalid JSON body' };
  }
  const details = [];
  const isObj = body && typeof body === 'object' && !Array.isArray(body);
  if (!isObj) details.push({ field: '', message: 'Invalid input: expected object', code: 'invalid_type' });
  const allowed = action === 'quote' ? ['total', 'note'] : ['result'];
  const extra = isObj ? Object.keys(body).filter((k) => !allowed.includes(k)) : [];
  if (extra.length) details.push({ field: '', message: `Unrecognized key(s) in object: ${extra.map((k) => `'${k}'`).join(', ')}`, code: 'unrecognized_keys' });
  let note = null;
  if (action === 'quote' && isObj) {
    const t = body.total;
    if (typeof t !== 'number' || !Number.isFinite(t)) details.push({ field: 'total', message: 'Invalid input: expected number', code: 'invalid_type' });
    else if (t < 0) details.push({ field: 'total', message: 'Too small: expected number to be >=0', code: 'too_small' });
    else if (t > 10_000_000) details.push({ field: 'total', message: 'Too big: expected number to be <=10000000', code: 'too_big' });
    else if (!(t > 0)) details.push({ field: 'total', message: 'Enter the price', code: 'custom' });
    const n = typeof body.note === 'string' && body.note.trim() === '' ? null : body.note;
    if (n !== undefined && n !== null && typeof n !== 'string') details.push({ field: 'note', message: 'Invalid input: expected string', code: 'invalid_type' });
    else if (typeof n === 'string' && n.trim().length > 1000) details.push({ field: 'note', message: 'Too big: expected string to have <=1000 characters', code: 'too_big' });
    else note = typeof n === 'string' ? n.trim() : null;
  }
  if (action === 'close' && isObj && !['SOLD', 'NOT_TAKEN'].includes(body.result)) {
    details.push({ field: 'result', message: 'Invalid option: expected one of "SOLD"|"NOT_TAKEN"', code: 'invalid_value' });
  }
  if (lineId.length < 1 || lineId.length > 100) details.unshift({ field: 'lineId', message: 'Invalid lineId', code: 'too_big' });
  if (details.length) return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details };

  const line = intakes.flatMap((it) => it.items).find((l) => l.id === lineId && l.type === 'PRODUCT' && l.seller?.code === 'ESS');
  if (!line) return { status: 404, code: 'NOT_FOUND', message: 'Enquiry not found' };
  if (line.status !== 'QUOTE_PENDING' && line.status !== 'QUOTED') {
    return { status: 409, code: 'CONFLICT', message: 'This enquiry is not approved yet or is already closed.' };
  }
  if (action === 'quote') {
    line.status = 'QUOTED';
    line.quote = { total: body.total, note, at: new Date().toISOString() };
    return { data: { lineId: line.id, status: 'QUOTED' } };
  }
  line.status = body.result === 'SOLD' ? 'FULFILLED' : 'CANCELLED';
  return { data: { lineId: line.id, status: line.status } };
}

/**
 * POST /products and PATCH /products/:id, like essAdminService.createProduct / updateProduct with
 * productInputSchema / productPatchSchema (strict; 422 details as PYS's validate middleware sends
 * them). The id is made from the name when left out (slug + 6 hex); a used id is 409, an unknown
 * one 404; a patch with nothing in it is 400. Price above MRP is 422 on "price" (for a patch,
 * against the product's current price or MRP too).
 */
const PRODUCT_TEXT = {
  brand: 60, modelNumber: 80, tonnage: 20, starRating: 20, description: 4000, coolingCapacity: 60, powerConsumption: 60,
  refrigerant: 40, noiseLevel: 40, dimensions: 120, warranty: 200, spaceType: 60, idealFor: 120, countryOfOrigin: 80,
};
const PRODUCT_KEYS = ['id', 'name', 'category', ...Object.keys(PRODUCT_TEXT), 'price', 'mrp', 'stock', 'isCustomQuote', 'keyFeatures', 'imageUrl', 'isPublished', 'displayOrder'];
const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'ac';

function checkProduct(body, { patch }) {
  const details = [];
  const issue = (field, message, code) => details.push({ field, message, code });
  const out = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    issue('', 'Invalid input: expected object', 'invalid_type');
    return { details };
  }
  const allowed = patch ? PRODUCT_KEYS.filter((k) => k !== 'id') : PRODUCT_KEYS;
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) issue('', `Unrecognized key(s) in object: ${extra.map((k) => `'${k}'`).join(', ')}`, 'unrecognized_keys');
  const blank = (v) => typeof v === 'string' && v.trim() === '';
  const has = (k) => body[k] !== undefined;

  if (!patch && has('id') && !blank(body.id)) {
    if (typeof body.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(body.id.trim())) issue('id', 'Use lowercase letters, digits and -', 'invalid_format');
    else out.id = body.id.trim();
  }
  if (has('name') || !patch) {
    const n = body.name;
    if (typeof n !== 'string') issue('name', 'Invalid input: expected string, received undefined', 'invalid_type');
    else if (n.trim().length < 2) issue('name', 'Too small: expected string to have >=2 characters', 'too_small');
    else if (n.trim().length > 200) issue('name', 'Too big: expected string to have <=200 characters', 'too_big');
    else out.name = n.trim();
  }
  if (has('category')) {
    if (typeof body.category !== 'string' || !/^[a-z_]{2,40}$/.test(body.category.trim())) issue('category', 'Invalid string: must match pattern /^[a-z_]{2,40}$/', 'invalid_format');
    else out.category = body.category.trim();
  } else if (!patch) out.category = 'new_ac';
  for (const [k, max] of Object.entries(PRODUCT_TEXT)) {
    if (!has(k)) continue;
    const v = blank(body[k]) ? null : body[k];
    if (v !== null && typeof v !== 'string') issue(k, 'Invalid input: expected string', 'invalid_type');
    else if (v !== null && v.trim().length > max) issue(k, `Too big: expected string to have <=${max} characters`, 'too_big');
    else out[k] = v === null ? null : v.trim();
  }
  for (const k of ['price', 'mrp']) {
    if (!has(k)) continue;
    const v = body[k];
    if (v === null) out[k] = null;
    else if (typeof v !== 'number' || !Number.isFinite(v)) issue(k, 'Invalid input: expected number', 'invalid_type');
    else if (v < 0) issue(k, 'Too small: expected number to be >=0', 'too_small');
    else if (v > 10_000_000) issue(k, 'Too big: expected number to be <=10000000', 'too_big');
    else out[k] = v;
  }
  for (const k of ['stock', 'displayOrder']) {
    if (!has(k)) continue;
    const v = body[k];
    if (!Number.isInteger(v) || v < 0 || v > 100_000) issue(k, 'Invalid input: expected int between 0 and 100000', 'invalid_type');
    else out[k] = v;
  }
  for (const k of ['isCustomQuote', 'isPublished']) {
    if (!has(k)) continue;
    if (typeof body[k] !== 'boolean') issue(k, 'Invalid input: expected boolean', 'invalid_type');
    else out[k] = body[k];
  }
  if (has('keyFeatures')) {
    const f = body.keyFeatures;
    if (!Array.isArray(f)) issue('keyFeatures', 'Invalid input: expected array', 'invalid_type');
    else if (f.length > 20) issue('keyFeatures', 'Too big: expected array to have <=20 items', 'too_big');
    else {
      f.forEach((x, i) => {
        if (typeof x !== 'string' || x.trim().length < 1 || x.trim().length > 200) issue(`keyFeatures.${i}`, 'Invalid feature', 'invalid_type');
      });
      out.keyFeatures = f.map((x) => String(x).trim());
    }
  }
  if (has('imageUrl') && !blank(body.imageUrl)) {
    const v = body.imageUrl;
    // zod's url(): anything new URL() can read (so a site path like /images/... is refused).
    if (v !== null && (typeof v !== 'string' || !URL.canParse(v.trim()) || v.trim().length > 1000)) issue('imageUrl', 'Invalid URL', 'invalid_format');
    else out.imageUrl = v === null ? null : v.trim();
  }
  if (out.price != null && out.mrp != null && out.price > out.mrp) issue('price', 'Selling price cannot be above the MRP', 'custom');
  return details.length ? { details } : { input: out };
}

function productWrite(path, method, rawBody) {
  const isList = path === '/products';
  const m = /^\/products\/([^/]+)$/.exec(path);
  if (!((isList && method === 'POST') || (m && method === 'PATCH'))) return null;
  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return { status: 400, code: 'BAD_REQUEST', message: 'Invalid JSON body' };
  }
  const checked = checkProduct(body, { patch: !isList });
  if (checked.details) return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: checked.details };
  const input = checked.input;
  const now = new Date().toISOString();

  if (isList) {
    const id = input.id ?? `${slugify(input.name)}-${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`;
    if (productById(id)) return { status: 409, code: 'CONFLICT', message: 'Could not add the product: it already exists' };
    const p = toAdminProduct({ id, name: input.name, category: input.category, keyFeatures: [], seller: FIRST_PARTY_SELLER, displayOrder: 100 });
    Object.assign(p, input, { id, stock: input.stock ?? 0, inStock: (input.stock ?? 0) > 0, updatedAt: now });
    productList.push(p);
    return { status: 201, data: p };
  }

  const id = decodeURIComponent(m[1]).trim();
  if (id.length < 1 || id.length > 100) return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'id', message: 'Invalid id', code: 'too_big' }] };
  const p = productById(id);
  if (!p) return { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
  const price = input.price !== undefined ? input.price : p.price;
  const mrp = input.mrp !== undefined ? input.mrp : p.mrp;
  if (price != null && mrp != null && price > mrp) {
    return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'price', message: 'Selling price cannot be above the MRP', code: 'custom' }] };
  }
  if (Object.keys(input).length === 0) return { status: 400, code: 'BAD_REQUEST', message: 'Nothing to change' };
  Object.assign(p, input, { updatedAt: now });
  if (input.stock !== undefined) p.inStock = input.stock > 0;
  return { status: 200, data: p };
}

function overview() {
  const pending = intakes.filter((it) => it.status === 'PENDING_REVIEW');
  const since = ago(24);
  return {
    requests: {
      pendingReview: pending.length,
      last24Hours: intakes.filter((it) => it.createdAt >= since && it.status !== 'SPAM').length,
      sellerInterestPending: pending.filter((it) => it.kind === 'SELLER_INTEREST').length,
    },
    products: { total: productList.length, published: productList.filter((p) => p.isPublished !== false).length },
    content: { blocksWithUnpublishedChanges: [...contentBlocks.values()].filter((b) => JSON.stringify(b.draft) !== JSON.stringify(b.published)).length },
  };
}

/**
 * Website text, like essAdminService listContent / getContent / saveDraft / publish and the routes'
 * validate({ params: contentKeyParamSchema, body: contentDraftSchema }) (422 details as PYS sends
 * them). PUT stores a draft (creating the block if needed); business.* / legal.* drafts are ESS Admin
 * only (403); a body over 64 KB is 400; business.identity is checked like businessIdentitySchema.
 * POST …/publish is ESS Admin only (403, the route's requireEssRole) and copies the draft to the
 * published text with the next version; an unknown key is 404.
 */
const CONTENT_KEY_RE = /^[a-z0-9]+(\.[a-z0-9-]+)*$/;
const ADMIN_ONLY_CONTENT = /^(business\.|legal\.)/;
const contentSummary = (b) => ({
  key: b.key,
  publishedVersion: b.publishedVersion,
  publishedAt: b.publishedAt,
  draftUpdatedAt: b.draftUpdatedAt,
  hasUnpublishedChanges: JSON.stringify(b.draft) !== JSON.stringify(b.published),
  adminOnly: ADMIN_ONLY_CONTENT.test(b.key),
});
const contentDetail = (b) => ({
  key: b.key,
  draft: clone(b.draft),
  published: clone(b.published),
  publishedVersion: b.publishedVersion,
  publishedAt: b.publishedAt,
  draftUpdatedAt: b.draftUpdatedAt,
  adminOnly: ADMIN_ONLY_CONTENT.test(b.key),
  history: [...b.history].sort((x, y) => y.version - x.version).slice(0, 20),
});

/** businessIdentitySchema (strict): the zod messages PYS would send, as "body.<field>". */
function checkIdentity(body) {
  const details = [];
  const issue = (field, message, code) => details.push({ field: `body.${field}`, message, code });
  const allowed = ['legalName', 'tradeName', 'proprietorName', 'gstin', 'address', 'phone', 'whatsapp', 'email', 'hours', 'warrantyDays', 'grievanceOfficer'];
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) details.push({ field: 'body', message: `Unrecognized key(s) in object: ${extra.map((k) => `'${k}'`).join(', ')}`, code: 'unrecognized_keys' });
  const out = {};
  const text = (obj, k, field, { min = 0, max, nullable = false, email = false, re }) => {
    const v = obj[k];
    if (v === null && nullable) return (out[field] = null);
    if (typeof v !== 'string') return issue(field, `Invalid input: expected string, received ${v === null ? 'null' : typeof v}`, 'invalid_type');
    const t = v.trim();
    if (t.length < min) return issue(field, `Too small: expected string to have >=${min} characters`, 'too_small');
    if (t.length > max) return issue(field, `Too big: expected string to have <=${max} characters`, 'too_big');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return issue(field, 'Invalid email address', 'invalid_format');
    if (re && !re.test(t)) return issue(field, 'GSTIN is 15 characters', 'invalid_format');
    out[field] = t;
  };
  text(body, 'legalName', 'legalName', { min: 2, max: 200 });
  text(body, 'tradeName', 'tradeName', { min: 2, max: 200 });
  text(body, 'proprietorName', 'proprietorName', { max: 120, nullable: true });
  text(body, 'gstin', 'gstin', { nullable: true, max: Infinity, re: /^[0-9]{2}[A-Z0-9]{13}$/ });
  text(body, 'address', 'address', { min: 5, max: 500 });
  text(body, 'phone', 'phone', { min: 6, max: 20 });
  text(body, 'whatsapp', 'whatsapp', { max: 20, nullable: true });
  text(body, 'email', 'email', { max: 254, email: true });
  text(body, 'hours', 'hours', { min: 2, max: 120 });
  const d = body.warrantyDays;
  if (!Number.isInteger(d) || d < 0 || d > 3650) issue('warrantyDays', 'Invalid input: expected int between 0 and 3650', 'invalid_type');
  else out.warrantyDays = d;
  const g = body.grievanceOfficer;
  if (!g || typeof g !== 'object' || Array.isArray(g)) issue('grievanceOfficer', 'Invalid input: expected object', 'invalid_type');
  else {
    const gExtra = Object.keys(g).filter((k) => !['name', 'email', 'phone'].includes(k));
    if (gExtra.length) issue('grievanceOfficer', `Unrecognized key(s) in object: ${gExtra.map((k) => `'${k}'`).join(', ')}`, 'unrecognized_keys');
    const before = { ...out };
    text(g, 'name', 'grievanceOfficer.name', { max: 120, nullable: true });
    text(g, 'email', 'grievanceOfficer.email', { max: 254, nullable: true, email: true });
    text(g, 'phone', 'grievanceOfficer.phone', { max: 20, nullable: true });
    const grievanceOfficer = { name: out['grievanceOfficer.name'], email: out['grievanceOfficer.email'], phone: out['grievanceOfficer.phone'] };
    for (const k of Object.keys(out)) if (!(k in before)) delete out[k];
    out.grievanceOfficer = grievanceOfficer;
  }
  return details.length ? { details } : { body: out };
}

function contentRoute(path, method, rawBody, actor) {
  if (method === 'GET' && path === '/content') {
    return { data: { blocks: [...contentBlocks.values()].sort((a, b) => a.key.localeCompare(b.key)).map(contentSummary) } };
  }
  const m = /^\/content\/([^/]+)(\/publish)?$/.exec(path);
  if (!m) return null;
  const isPublish = Boolean(m[2]);
  if (!((isPublish && method === 'POST') || (!isPublish && (method === 'GET' || method === 'PUT')))) return null;
  const isAdmin = actor.roles.includes('ESS_ADMIN');
  if (isPublish && !isAdmin) return { status: 403, code: 'FORBIDDEN', message: 'Only an ESS Admin can do this.' };
  const key = decodeURIComponent(m[1]).trim();
  if (key.length > 80 || !CONTENT_KEY_RE.test(key)) {
    return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'key', message: 'Invalid content key', code: 'invalid_format' }] };
  }
  const now = new Date().toISOString();

  if (method === 'GET') {
    const b = contentBlocks.get(key);
    return b ? { data: contentDetail(b) } : { status: 404, code: 'NOT_FOUND', message: 'Content block not found' };
  }

  if (isPublish) {
    const b = contentBlocks.get(key);
    if (!b) return { status: 404, code: 'NOT_FOUND', message: 'Content block not found' };
    b.published = clone(b.draft);
    b.publishedVersion += 1;
    b.publishedAt = now;
    b.history.push({ version: b.publishedVersion, publishedAt: now });
    return { data: contentDetail(b) };
  }

  // PUT: save the draft.
  let input;
  try {
    input = JSON.parse(rawBody || '{}');
  } catch {
    return { status: 400, code: 'BAD_REQUEST', message: 'Invalid JSON body' };
  }
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const details = [];
  if (!isObj(input)) details.push({ field: '', message: 'Invalid input: expected object', code: 'invalid_type' });
  else {
    const extra = Object.keys(input).filter((k) => k !== 'body');
    if (extra.length) details.push({ field: '', message: `Unrecognized key(s) in object: ${extra.map((k) => `'${k}'`).join(', ')}`, code: 'unrecognized_keys' });
    if (!isObj(input.body)) details.push({ field: 'body', message: 'Invalid input: expected record', code: 'invalid_type' });
  }
  if (details.length) return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details };
  if (ADMIN_ONLY_CONTENT.test(key) && !isAdmin) return { status: 403, code: 'FORBIDDEN', message: 'Only an ESS Admin can edit business and legal details.' };
  if (Buffer.byteLength(JSON.stringify(input.body), 'utf8') > 64 * 1024) return { status: 400, code: 'BAD_REQUEST', message: 'This content is too long (64 KB limit).' };
  let body = input.body;
  if (key === 'business.identity') {
    const checked = checkIdentity(body);
    if (checked.details) return { status: 422, code: 'VALIDATION_ERROR', message: 'Request validation failed', details: checked.details };
    body = checked.body;
  }
  const b = contentBlocks.get(key) ?? { key, draft: {}, published: null, publishedVersion: 0, publishedAt: null, draftUpdatedAt: now, history: [] };
  b.draft = clone(body);
  b.draftUpdatedAt = now;
  contentBlocks.set(key, b);
  return { data: contentDetail(b) };
}

/** Like PYS requireEssRole: the person's token decides who is acting. */
function adminRoute(req, res, path, url, body) {
  res.setHeader('Cache-Control', 'no-store');
  const token = String(req.headers['x-pys-actor-token'] ?? '').trim();
  if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Please sign in to the ESS admin area.');
  const actor = ACTORS[token];
  if (!actor) return fail(res, 401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');

  if (req.method === 'GET' && path === '/me') return ok(res, actor);
  if (req.method === 'GET' && path === '/overview') return ok(res, overview());
  if (req.method === 'GET' && path === '/leads') {
    const r = listLeads(url.searchParams);
    return r.details ? fail(res, 422, 'VALIDATION_ERROR', 'Request validation failed', r.details) : ok(res, r.data);
  }
  if (req.method === 'GET' && path === '/enquiries') return ok(res, { enquiries: listEnquiries() });
  if (req.method === 'GET' && path === '/products') return ok(res, { products: sortedProducts() });
  const productChange = productWrite(path, req.method, body);
  if (productChange) {
    return productChange.data
      ? ok(res, productChange.data, productChange.status)
      : fail(res, productChange.status, productChange.code, productChange.message, productChange.details);
  }
  const contentChange = contentRoute(path, req.method, body, actor);
  if (contentChange) {
    return contentChange.data
      ? ok(res, contentChange.data, contentChange.status)
      : fail(res, contentChange.status, contentChange.code, contentChange.message, contentChange.details);
  }
  const write = enquiryWrite(path, req.method, body);
  if (write) return write.data ? ok(res, write.data) : fail(res, write.status, write.code, write.message, write.details);
  return fail(res, 404, 'NOT_FOUND', 'Not found');
}

let seq = 0;
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (!req.url.startsWith('/api/v1/ess/')) return fail(res, 404, 'NOT_FOUND', 'Not found');
      // Like PYS integrationAuth: a refused signature is this server's setup, not someone's session.
      if (!verify(req, body)) return fail(res, 401, 'INVALID_SIGNATURE', 'Request signature is missing or invalid');
      const url = new URL(req.url, 'http://x');
      const path = url.pathname.replace('/api/v1/ess', '');
      if (path.startsWith('/admin/')) return adminRoute(req, res, path.slice('/admin'.length), url, body);

      if (req.method === 'GET' && path === '/catalog') return ok(res, catalog);
      // The shop: shown products only (PYS is_published filter), in shop order.
      if (req.method === 'GET' && path === '/products') return ok(res, { products: shopProducts() });
      if (req.method === 'GET' && path.startsWith('/products/')) {
        const p = shopProducts().find((x) => x.id === decodeURIComponent(path.slice(10)));
        return p ? ok(res, p) : fail(res, 404, 'NOT_FOUND', 'Product not found');
      }
      if (req.method === 'GET' && path === '/content') {
        const keys = (url.searchParams.get('keys') || '').split(',');
        return ok(res, { blocks: publicContent(keys) });
      }
      if (req.method === 'GET' && path === '/areas') return ok(res, { areas: [{ pincodePrefix: '400', label: 'Mumbai, Thane & Navi Mumbai' }] });
      if (req.method === 'GET' && path.startsWith('/serviceability/')) {
        const pincode = path.slice(16);
        const yes = pincode.startsWith('400');
        return ok(res, { pincode, serviceable: yes, area: yes ? 'Mumbai, Thane & Navi Mumbai' : null });
      }
      if (req.method === 'POST' && path === '/intakes') {
        // Like PYS: every basket line must still be on offer, else 422 naming the line.
        const input = JSON.parse(body || '{}');
        const list = shopProducts();
        const details = (input.items ?? []).flatMap((it, i) => {
          if (it.type === 'SERVICE' && !catalog.services.some((s) => s.code === it.serviceCode)) return [{ field: `items.${i}.serviceCode`, message: 'Unknown service code' }];
          if (it.type === 'AMC' && !catalog.amcPlans.some((p) => p.code === it.amcPlanCode || p.planCode === it.amcPlanCode)) return [{ field: `items.${i}.amcPlanCode`, message: 'Unknown AMC plan' }];
          if (it.type === 'PRODUCT' && !list.some((p) => p.id === it.productId)) return [{ field: `items.${i}.productId`, message: 'This AC is no longer available' }];
          return [];
        });
        if (details.length) return fail(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        seq += 1;
        const trackingCode = input.kind === 'PRODUCT_ENQUIRY' ? 'ESS-ENQR-DEV3' : 'ESS-LOCL-DEV2';
        return ok(res, { intakeNumber: `WEB-2026-LOCAL${seq}`, trackingCode, status: 'PENDING_REVIEW' }, 201);
      }
      if (req.method === 'POST' && path === '/track') {
        // Test values: ESS-LOCL-DEV2 + 9876543210 finds the sample; 9999999999 is locked out.
        const { code, phone } = JSON.parse(body || '{}');
        if (phone === '9999999999') return fail(res, 429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Please try again in 30 minutes.');
        if (code === 'ESS-LOCL-DEV2' && phone === '9876543210') return ok(res, track);
        if (code === 'ESS-ENQR-DEV3' && phone === '9876543210') return ok(res, trackEnquiry);
        return fail(res, 404, 'NOT_FOUND', 'No request matches this tracking code and mobile number.');
      }
      return fail(res, 404, 'NOT_FOUND', 'Not found');
    });
  })
  .listen(PORT, () => console.log(`mock PYS on http://localhost:${PORT}`));
