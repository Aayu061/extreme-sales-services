// Local stand-in for the signed PYS API (/api/v1/ess) so the site can be built and checked on a
// developer PC without the real ESS key. Data comes from dev/fixtures (copied from live PYS).
// It checks signatures with the dev key below, so the site's real signing code is exercised.
//
//   node dev/mock-pys.mjs            (listens on http://localhost:4010)
//   .env.local: PYS_API_URL=http://localhost:4010
//               PYS_INTEGRATION_KEY_ID=essweb_localdev
//               PYS_INTEGRATION_SECRET=local-dev-secret-not-for-production
// Admin area (/ess/admin/*): /admin/login "Sign in as test admin / staff" sends the token
// dev-admin-token (ESS Admin) or dev-staff-token (ESS Staff); sample requests and AC enquiries
// are kept in memory and start again each time this runs.
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

const productList = Array.isArray(products) ? products : products.products;
const productById = (id) => productList.find((p) => p.id === id);
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
    content: { blocksWithUnpublishedChanges: 0 },
  };
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
      if (req.method === 'GET' && path === '/products') return ok(res, { products });
      if (req.method === 'GET' && path.startsWith('/products/')) {
        const p = products.find((x) => x.id === decodeURIComponent(path.slice(10)));
        return p ? ok(res, p) : fail(res, 404, 'NOT_FOUND', 'Product not found');
      }
      if (req.method === 'GET' && path === '/content') {
        const keys = (url.searchParams.get('keys') || '').split(',');
        return ok(res, { blocks: Object.fromEntries(keys.filter((k) => content[k]).map((k) => [k, content[k]])) });
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
        const list = Array.isArray(products) ? products : products.products;
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
