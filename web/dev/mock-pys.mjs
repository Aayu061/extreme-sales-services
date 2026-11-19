// Local stand-in for the signed PYS API (/api/v1/ess) so the site can be built and checked on a
// developer PC without the real ESS key. Data comes from dev/fixtures (copied from live PYS).
// It checks signatures with the dev key below, so the site's real signing code is exercised.
//
//   node dev/mock-pys.mjs            (listens on http://localhost:4010)
//   .env.local: PYS_API_URL=http://localhost:4010
//               PYS_INTEGRATION_KEY_ID=essweb_localdev
//               PYS_INTEGRATION_SECRET=local-dev-secret-not-for-production
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
      hours: 'Mon–Sat, 9:00 am – 7:00 pm',
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

let seq = 0;
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (!req.url.startsWith('/api/v1/ess/')) return fail(res, 404, 'NOT_FOUND', 'Not found');
      if (!verify(req, body)) return fail(res, 401, 'UNAUTHORIZED', 'Bad signature');
      const url = new URL(req.url, 'http://x');
      const path = url.pathname.replace('/api/v1/ess', '');

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
