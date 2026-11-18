// test/pys_signed_intake.test.js
// Signed PYS intake client, ESS -> PYS field mapping, fallback, and end-to-end booking flow.
// Never touches the network: every PYS call goes to a stubbed fetch.

process.env.JWT_SECRET = 'test_secret_for_signed_intake_suite_123456';
process.env.PYS_API_KEY = '';               // legacy path must not call the real PYS
process.env.PYS_INTEGRATION_KEY_ID = '';    // off until a test turns it on
process.env.PYS_INTEGRATION_SECRET = '';
process.env.PYS_API_URL = 'https://pys.example.test/api/v1';
process.env.FIREBASE_SERVICE_ACCOUNT = '';  // in-memory store only

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const client = require('../server/services/pysSignedClient');
const mapper = require('../server/services/pysIntakeMapper');
const forwarder = require('../server/services/pysIntakeForwarder');

const KEY_ID = 'ess-web-test-key';
const SECRET = 'unit-test-secret';
const TEST_ENV = { PYS_API_URL: 'https://pys.example.test/api/v1', PYS_INTEGRATION_KEY_ID: KEY_ID, PYS_INTEGRATION_SECRET: SECRET };

function verifySignature(headers, method, path, body) {
    const canonical = [headers['X-PYS-Timestamp'], headers['X-PYS-Nonce'], method, path,
        crypto.createHash('sha256').update(body).digest('hex')].join('\n');
    return crypto.createHmac('sha256', SECRET).update(canonical).digest('hex') === headers['X-PYS-Signature'];
}

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('pysSignedClient: signing', () => {
    test('canonical string is timestamp, nonce, METHOD, path, sha256(body) joined by newlines', () => {
        const canonical = client.buildCanonical({
            timestamp: 1700000000, nonce: '00112233445566778899aabbccddeeff', method: 'post',
            path: '/api/v1/ess/intakes', body: '{"kind":"CONTACT"}'
        });
        assert.equal(canonical,
            '1700000000\n00112233445566778899aabbccddeeff\nPOST\n/api/v1/ess/intakes\n' +
            '85f7c94b00e5f7913666ff857cd2d453f0e60846e50a23ae33f0fbf8d73b8a83');
    });

    test('known vector: POST intake signature', () => {
        const h = client.signRequest({
            keyId: KEY_ID, secret: SECRET, method: 'POST', path: '/api/v1/ess/intakes',
            body: '{"kind":"CONTACT"}', timestamp: 1700000000, nonce: '00112233445566778899aabbccddeeff'
        });
        assert.equal(h['X-PYS-Key-Id'], KEY_ID);
        assert.equal(h['X-PYS-Timestamp'], '1700000000');
        assert.equal(h['X-PYS-Nonce'], '00112233445566778899aabbccddeeff');
        assert.equal(h['X-PYS-Signature'], '0a22f437120622669c179112dcb8432b698ba973fcedb332094acd35bccdd6ea');
    });

    test('known vector: GET ping signs sha256 of the empty string', () => {
        const h = client.signRequest({
            keyId: KEY_ID, secret: SECRET, method: 'GET', path: '/api/v1/ess/ping',
            timestamp: 1700000000, nonce: '00112233445566778899aabbccddeeff'
        });
        assert.equal(h['X-PYS-Signature'], 'e66680e3a1807d2efc01b157b6cf830956a57e79f46a4439c3c5ac9b9e7b0b39');
    });

    test('fresh nonce is 32 hex chars and timestamp is unix seconds', () => {
        const h = client.signRequest({ keyId: KEY_ID, secret: SECRET, method: 'GET', path: '/x' });
        assert.match(h['X-PYS-Nonce'], /^[0-9a-f]{32}$/);
        assert.ok(Math.abs(Number(h['X-PYS-Timestamp']) - Date.now() / 1000) < 5);
    });

    test('base URL: trailing /api/v1 is stripped; PYS_API_BASE_URL is the fallback', () => {
        assert.equal(client.getConfig({ PYS_API_URL: 'https://a.test/api/v1/' }).baseUrl, 'https://a.test');
        assert.equal(client.getConfig({ PYS_API_BASE_URL: 'https://b.test/api/v1' }).baseUrl, 'https://b.test');
    });
});

describe('pysSignedClient: postIntake / ping over a stubbed fetch', () => {
    test('sends the exact signed body with all headers and returns the tracking code', async () => {
        const calls = [];
        const fetchImpl = async (url, init) => {
            calls.push({ url, init });
            return jsonResponse(201, { success: true, data: { intakeNumber: 'INT-1', trackingCode: 'TRK-ABC', status: 'NEW' } });
        };
        const body = { kind: 'CONTACT', externalReferenceId: 'enq-1', contact: { name: 'Asha', phone: '9876543210' }, consent: { privacy: true } };
        const r = await client.postIntake(body, 'ess-enquiry-enq-1', { env: TEST_ENV, fetchImpl });
        assert.equal(r.success, true);
        assert.equal(r.trackingCode, 'TRK-ABC');
        assert.equal(r.intakeNumber, 'INT-1');
        assert.equal(calls.length, 1);
        const { url, init } = calls[0];
        assert.equal(url, 'https://pys.example.test/api/v1/ess/intakes');
        assert.equal(init.method, 'POST');
        assert.equal(init.body, JSON.stringify(body));
        assert.equal(init.headers['Idempotency-Key'], 'ess-enquiry-enq-1');
        assert.equal(init.headers['Content-Type'], 'application/json');
        assert.equal(init.headers['X-PYS-Key-Id'], KEY_ID);
        assert.ok(verifySignature(init.headers, 'POST', '/api/v1/ess/intakes', init.body));
    });

    test('200 duplicate is a success', async () => {
        const fetchImpl = async () => jsonResponse(200, { success: true, data: { intakeNumber: 'INT-1', trackingCode: 'TRK-ABC', status: 'NEW' } });
        const r = await client.postIntake({ kind: 'CONTACT' }, 'ess-enquiry-enq-1', { env: TEST_ENV, fetchImpl });
        assert.equal(r.success, true);
        assert.equal(r.duplicate, true);
    });

    test('retries once on 503 / 409 / network error with a fresh nonce, same key and body', async () => {
        for (const first of [() => jsonResponse(503, {}), () => jsonResponse(409, {}), () => { throw new Error('ECONNRESET'); }]) {
            const calls = [];
            const fetchImpl = async (url, init) => {
                calls.push(init);
                if (calls.length === 1) return first();
                return jsonResponse(201, { success: true, data: { intakeNumber: 'INT-2', trackingCode: 'TRK-2', status: 'NEW' } });
            };
            const r = await client.postIntake({ kind: 'CONTACT' }, 'ess-enquiry-enq-2', { env: TEST_ENV, fetchImpl, retryDelayMs: 1 });
            assert.equal(r.success, true);
            assert.equal(r.attempts, 2);
            assert.notEqual(calls[0].headers['X-PYS-Nonce'], calls[1].headers['X-PYS-Nonce']);
            assert.equal(calls[1].headers['Idempotency-Key'], 'ess-enquiry-enq-2');
            assert.equal(calls[0].body, calls[1].body);
        }
    });

    test('does not retry 422 or 401', async () => {
        for (const status of [422, 401]) {
            let n = 0;
            const fetchImpl = async () => { n++; return jsonResponse(status, { success: false, error: { message: 'nope' } }); };
            const r = await client.postIntake({ kind: 'CONTACT' }, 'ess-enquiry-enq-3', { env: TEST_ENV, fetchImpl, retryDelayMs: 1 });
            assert.equal(r.success, false);
            assert.equal(r.status, status);
            assert.equal(r.error, 'nope');
            assert.equal(n, 1);
        }
    });

    test('times out a hung request', async () => {
        const fetchImpl = (url, init) => new Promise((_, reject) => {
            init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
        });
        const r = await client.postIntake({ kind: 'CONTACT' }, 'ess-enquiry-enq-4', { env: TEST_ENV, fetchImpl, timeoutMs: 20, retry: false });
        assert.equal(r.success, false);
        assert.match(r.error, /timed out/);
        assert.equal(r.retryable, true);
    });

    test('not configured: never calls fetch', async () => {
        let n = 0;
        const fetchImpl = async () => { n++; return jsonResponse(201, {}); };
        const r = await client.postIntake({ kind: 'CONTACT' }, 'ess-enquiry-enq-5', { env: { PYS_INTEGRATION_KEY_ID: 'only-id' }, fetchImpl });
        assert.equal(r.success, false);
        assert.equal(r.notConfigured, true);
        assert.equal(n, 0);
        assert.equal(client.isConfigured({ PYS_INTEGRATION_KEY_ID: 'only-id' }), false);
        assert.equal(client.isConfigured({ PYS_INTEGRATION_SECRET: 'only-secret' }), false);
        assert.equal(client.isConfigured(TEST_ENV), true);
    });

    test('rejects an invalid Idempotency-Key without calling PYS', async () => {
        const r = await client.postIntake({}, 'short', { env: TEST_ENV, fetchImpl: async () => { throw new Error('should not be called'); } });
        assert.equal(r.success, false);
    });

    test('ping is a signed GET with no body', async () => {
        let seen;
        const fetchImpl = async (url, init) => { seen = { url, init }; return jsonResponse(200, { success: true }); };
        const r = await client.ping({ env: TEST_ENV, fetchImpl });
        assert.equal(r.connected, true);
        assert.equal(seen.url, 'https://pys.example.test/api/v1/ess/ping');
        assert.equal(seen.init.method, 'GET');
        assert.equal(seen.init.body, undefined);
        assert.ok(verifySignature(seen.init.headers, 'GET', '/api/v1/ess/ping', ''));
    });
});

describe('pysIntakeMapper: ESS -> PYS field mapping', () => {
    test('every booking-form option maps to a catalog code', () => {
        const { BOOKING_FORM_SERVICE_CODES } = require('../server/middleware/security');
        const expected = {
            pm_dry: 'SVC-DRY', pm_jet: 'SVC-JET-WASH', pm_chemical: 'SVC-FOAM', diagnostic_cooling: 'SVC-DIAG',
            water_leakage: 'SVC-DIAG', gas_refill: 'SVC-GAS', pcb_repair: 'SVC-PCB', compressor_issue: 'SVC-COMP',
            fan_noise: 'SVC-FAN', electrical_trip: 'SVC-ELEC', installation: 'SVC-INSTALL', uninstallation: 'SVC-UNINSTALL'
        };
        for (const code of BOOKING_FORM_SERVICE_CODES) {
            assert.equal(mapper.mapServiceCode(code), expected[code], code);
        }
        assert.equal(mapper.mapServiceCode('pm_jet [✅ AMC Covered]'), 'SVC-JET-WASH');
        assert.equal(mapper.mapServiceCode('Gas Refill'), 'SVC-GAS');
        assert.equal(mapper.mapServiceCode('something else'), undefined);
    });

    test('AMC plan codes from ESS codes, ids and names', () => {
        assert.equal(mapper.mapAmcPlanCode('SAMC 1'), 'SAMC-1');
        assert.equal(mapper.mapAmcPlanCode('SAMC 2 - Comprehensive Split with Gas Charging'), 'SAMC-2');
        assert.equal(mapper.mapAmcPlanCode('amc-samc-3'), 'SAMC-3');
        assert.equal(mapper.mapAmcPlanCode('', 'Ordinary 4 Services & Unlimited Complaints'), 'ORD-4');
        assert.equal(mapper.mapAmcPlanCode('amc-ord-6'), 'ORD-6');
        assert.equal(mapper.mapAmcPlanCode('ORD 3'), 'ORD-3');
        assert.equal(mapper.mapAmcPlanCode('2 Jacket Service & Unlimited Complaints'), 'JKT-2');
        assert.equal(mapper.mapAmcPlanCode('amc-jacket-3'), 'JKT-3');
        assert.equal(mapper.mapAmcPlanCode('Pump Down Service'), undefined);
        assert.equal(mapper.mapAmcPlanToServiceCode('amc-pump-down'), 'SVC-PUMPDOWN');
        assert.equal(mapper.mapAmcPlanToServiceCode('Jet Wash Deep Service'), 'SVC-JET-WASH');
    });

    test('phone, AC type, tonnage, brand, slot, date and address parsing', () => {
        assert.equal(mapper.normalizeIndianMobile('+91 98765-43210'), '9876543210');
        assert.equal(mapper.normalizeIndianMobile('09876543210'), '9876543210');
        assert.equal(mapper.normalizeIndianMobile('12345'), '');
        assert.equal(mapper.normalizeIndianMobile('5876543210'), '');
        assert.equal(mapper.parseAcType('split'), 'SPLIT');
        assert.equal(mapper.parseAcType('Commercial Ductable / VRV'), 'VRF');
        assert.equal(mapper.parseAcType('both'), undefined);
        assert.equal(mapper.parseTonnage('1.5'), 1.5);
        assert.equal(mapper.parseTonnage('3.0+'), 3);
        assert.equal(mapper.parseTonnage('0.8_1.0'), 1);
        assert.equal(mapper.parseTonnage('abc'), undefined);
        assert.equal(mapper.parseBrand('Other'), undefined);
        assert.equal(mapper.parseBrand('Blue Star'), 'Blue Star');
        assert.equal(mapper.parseSlot('Morning (9 AM - 12 PM)'), 'MORNING');
        assert.equal(mapper.parseSlot('Evening (4 PM - 8 PM)'), 'EVENING');
        assert.equal(mapper.parsePreferredDate('2026-11-20'), '2026-11-20');
        assert.equal(mapper.parsePreferredDate('2026-02-30'), undefined);
        assert.deepEqual(mapper.parseAddress('Flat 4, Sion East, Mumbai 400022'), { line: 'Flat 4, Sion East, Mumbai 400022', city: 'Mumbai', pincode: '400022' });
        assert.equal(mapper.parseAddress('Sector 17, Vashi, Navi Mumbai').city, 'Navi Mumbai');
    });

    test('service booking (as stored by POST /api/services) -> SERVICE_BOOKING intake', () => {
        const r = mapper.buildServiceBookingIntake({
            request_id: 'AC-20261118-ABC234', name: ' Ravi Kumar ', phone: '9876543210', email: 'Ravi@Example.com',
            address: 'B-12, Chembur, Mumbai 400071', service_type: 'gas_refill',
            issue_description: '[Slot: Afternoon (12 PM - 4 PM)] [Brand: Voltas] [1.5T] Not cooling',
            ac_brand: 'Voltas', ac_tonnage: '1.5', time_slot: 'Afternoon (12 PM - 4 PM)'
        });
        assert.equal(r.ok, true);
        assert.deepEqual(r.body, {
            kind: 'SERVICE_BOOKING',
            externalReferenceId: 'AC-20261118-ABC234',
            contact: { name: 'Ravi Kumar', phone: '9876543210', email: 'ravi@example.com' },
            address: { line: 'B-12, Chembur, Mumbai 400071', city: 'Mumbai', pincode: '400071' },
            ac: { brand: 'Voltas', tonnage: 1.5 },
            request: {
                serviceCode: 'SVC-GAS',
                message: '[Slot: Afternoon (12 PM - 4 PM)] [Brand: Voltas] [1.5T] Not cooling',
                preferredSlot: 'AFTERNOON'
            },
            consent: { privacy: true }
        });
        assert.equal(mapper.idempotencyKeyFor('SERVICE_BOOKING', 'AC-20261118-ABC234'), 'ess-booking-AC-20261118-ABC234');
    });

    test('booking hints are read from the message when structured fields are missing; no nulls anywhere', () => {
        const r = mapper.buildServiceBookingIntake({
            request_id: 'AC-1', name: 'Ravi', phone: '9876543210', email: '', address: 'Chembur',
            service_type: 'pm_jet [✅ AMC Covered]', issue_description: '[Slot: Morning (9 AM - 12 PM)] [Brand: Other] [3.0T] noisy'
        });
        assert.equal(r.ok, true);
        assert.equal(r.body.contact.email, undefined);
        assert.equal(r.body.ac.tonnage, 3);
        assert.equal(r.body.ac.brand, undefined);
        assert.equal(r.body.request.preferredSlot, 'MORNING');
        assert.equal(r.body.request.serviceCode, 'SVC-JET-WASH');
        assert.equal(JSON.stringify(r.body).includes('null'), false);
    });

    test('AMC purchase -> AMC_REQUEST intake', () => {
        const r = mapper.buildAmcRequestIntake({
            id: 'sub-1-abc', customer_name: 'Meera', phone: '9123456780', email: '', address: 'Ghatkopar',
            plan_id: 'amc-samc-1', plan_name: 'SAMC 1 - Comprehensive Split (Non-Inverter)', ac_type: 'split',
            tonnage: '1.5', price: 4500, remaining_services: 3
        });
        assert.equal(r.ok, true);
        assert.equal(r.body.kind, 'AMC_REQUEST');
        assert.equal(r.body.request.amcPlanCode, 'SAMC-1');
        assert.equal(r.body.request.serviceCode, undefined);
        assert.deepEqual(r.body.ac, { type: 'SPLIT', tonnage: 1.5 });
        assert.equal(r.body.address.city, 'Mumbai');
    });

    test('enquiries: product page -> PRODUCT_ENQUIRY, contact page -> CONTACT; email-only is rejected', () => {
        const p = mapper.buildEnquiryIntake({ id: 'enq-1', product_id: 'p-9', product_name: 'Daikin 1.5T Inverter', name: 'Sam', phone: '9876543210', message: 'Price?' });
        assert.equal(p.body.kind, 'PRODUCT_ENQUIRY');
        assert.equal(p.body.request.message, 'Product: Daikin 1.5T Inverter | Price?');
        const c = mapper.buildEnquiryIntake({ id: 'enq-2', product_id: 'general', name: 'Sam', phone: '9876543210', subject: 'Hello', message: 'Call me', serviceType: 'installation' });
        assert.equal(c.body.kind, 'CONTACT');
        assert.equal(c.body.request.serviceCode, 'SVC-INSTALL');
        const e = mapper.buildEnquiryIntake({ id: 'enq-3', name: 'Sam', email: 'sam@example.com', message: 'hi' });
        assert.equal(e.ok, false);
    });
});

describe('pysIntakeForwarder: saved sync status', () => {
    test('success stores intake number, tracking code and the stable key', async () => {
        const record = { request_id: 'AC-9', name: 'Ravi', phone: '9876543210', address: 'Chembur', service_type: 'pm_dry' };
        let saved = null;
        const fetchImpl = async () => jsonResponse(201, { success: true, data: { intakeNumber: 'INT-9', trackingCode: 'TRK-9', status: 'NEW' } });
        const out = await forwarder.syncRecord('SERVICE_BOOKING', record, (u) => { saved = u; }, { env: TEST_ENV, fetchImpl });
        assert.equal(out.success, true);
        assert.equal(saved.pys_sync_status, 'SYNCED');
        assert.equal(saved.pys_tracking_code, 'TRK-9');
        assert.equal(saved.pys_intake_number, 'INT-9');
        assert.equal(saved.pys_idempotency_key, 'ess-booking-AC-9');
    });

    test('PYS down -> PENDING_SYNC; 422 -> SYNC_FAILED', async () => {
        const record = { request_id: 'AC-10', name: 'Ravi', phone: '9876543210', address: 'Chembur', service_type: 'pm_dry' };
        let saved = null;
        await forwarder.syncRecord('SERVICE_BOOKING', record, (u) => { saved = u; },
            { env: TEST_ENV, fetchImpl: async () => { throw new Error('ECONNREFUSED'); }, retryDelayMs: 1 });
        assert.equal(saved.pys_sync_status, 'PENDING_SYNC');
        assert.equal(saved.pys_sync_attempts, 1);
        await forwarder.syncRecord('SERVICE_BOOKING', record, (u) => { saved = u; },
            { env: TEST_ENV, fetchImpl: async () => jsonResponse(422, { success: false, message: 'bad' }) });
        assert.equal(saved.pys_sync_status, 'SYNC_FAILED');
    });
});

describe('server.js: booking flow end to end (in-memory store, stubbed PYS)', () => {
    let server;
    let baseUrl;
    const realFetch = globalThis.fetch;
    let pysMode = 'up';
    const pysCalls = [];

    function request(method, path, body, token) {
        return new Promise((resolve, reject) => {
            const data = body ? JSON.stringify(body) : '';
            const req = http.request(`${baseUrl}${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            }, (res) => {
                let chunks = '';
                res.on('data', (c) => { chunks += c; });
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(chunks || '{}') }));
            });
            req.on('error', reject);
            req.end(data);
        });
    }

    const booking = {
        name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543210', serviceType: 'pm_jet',
        brand: 'Voltas', tons: '1.5', address: 'B-12, Chembur, Mumbai 400071',
        timeSlot: 'Morning (9 AM - 12 PM)', message: '[Slot: Morning (9 AM - 12 PM)] [Brand: Voltas] [1.5T] Water dripping'
    };

    before(async () => {
        globalThis.fetch = async (url, init) => {
            if (String(url).startsWith('https://pys.example.test')) {
                pysCalls.push({ url, init });
                if (pysMode === 'down') throw new Error('ECONNREFUSED');
                const body = JSON.parse(init.body);
                return jsonResponse(201, { success: true, data: { intakeNumber: `INT-${body.externalReferenceId}`, trackingCode: 'TRK-7Q2M', status: 'NEW' } });
            }
            return realFetch(url, init);
        };
        const app = require('../server');
        await new Promise((resolve) => { server = app.listen(0, resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(() => {
        globalThis.fetch = realFetch;
        if (server) server.close();
        process.env.PYS_INTEGRATION_KEY_ID = '';
        process.env.PYS_INTEGRATION_SECRET = '';
    });

    test('without the integration keys the legacy path is used (no signed call, no syncStatus)', async () => {
        process.env.PYS_INTEGRATION_KEY_ID = '';
        process.env.PYS_INTEGRATION_SECRET = '';
        const res = await request('POST', '/api/services', booking);
        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.match(res.body.requestId, /^AC-/);
        assert.equal(res.body.syncStatus, undefined);
        assert.equal(res.body.trackingCode, undefined);
        assert.equal(pysCalls.length, 0);
    });

    test('with keys: booking returns the PYS tracking code and sends a signed SERVICE_BOOKING', async () => {
        process.env.PYS_INTEGRATION_KEY_ID = KEY_ID;
        process.env.PYS_INTEGRATION_SECRET = SECRET;
        pysMode = 'up';
        const res = await request('POST', '/api/services', booking);
        assert.equal(res.status, 201);
        assert.equal(res.body.trackingCode, 'TRK-7Q2M');
        assert.equal(res.body.syncStatus, 'SYNCED');
        assert.equal(res.body.intakeNumber, `INT-${res.body.requestId}`);
        const call = pysCalls[pysCalls.length - 1];
        const sent = JSON.parse(call.init.body);
        assert.equal(sent.kind, 'SERVICE_BOOKING');
        assert.equal(sent.request.serviceCode, 'SVC-JET-WASH');
        assert.equal(sent.request.preferredSlot, 'MORNING');
        assert.deepEqual(sent.ac, { brand: 'Voltas', tonnage: 1.5 });
        assert.equal(call.init.headers['Idempotency-Key'], `ess-booking-${res.body.requestId}`);
        assert.ok(verifySignature(call.init.headers, 'POST', '/api/v1/ess/intakes', call.init.body));

        // The tracking code works on the ESS status page lookup.
        const track = await request('GET', '/api/track?id=TRK-7Q2M');
        assert.equal(track.body.requestId, res.body.requestId);
    });

    test('PYS unreachable: booking is kept as PENDING_SYNC, then the retry sweep syncs it with the same key', async () => {
        process.env.PYS_INTEGRATION_KEY_ID = KEY_ID;
        process.env.PYS_INTEGRATION_SECRET = SECRET;
        pysMode = 'down';
        const before = pysCalls.length;
        const res = await request('POST', '/api/services', booking);
        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.syncStatus, 'PENDING_SYNC');
        assert.equal(res.body.trackingCode, undefined);
        assert.match(res.body.message, /We received your request/);
        assert.equal(pysCalls.length - before, 2, 'one retry after the first failure');

        pysMode = 'up';
        const token = jwt.sign({ id: 'admin-1', role: 'admin', name: 'Admin' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
        const retry = await request('POST', '/api/integrations/pys/retry-pending', null, token);
        assert.equal(retry.status, 200);
        assert.ok(retry.body.summary.synced >= 1);
        const last = pysCalls[pysCalls.length - 1];
        assert.equal(last.init.headers['Idempotency-Key'], `ess-booking-${res.body.requestId}`);

        const list = await request('GET', `/api/admin/requests?search=${res.body.requestId}`, null, token);
        const rec = list.body.requests.find((r) => r.request_id === res.body.requestId);
        assert.equal(rec.pys_sync_status, 'SYNCED');
        assert.equal(rec.pys_tracking_code, 'TRK-7Q2M');
    });

    test('with keys: contact enquiry returns the tracking code, never a made-up number', async () => {
        process.env.PYS_INTEGRATION_KEY_ID = KEY_ID;
        process.env.PYS_INTEGRATION_SECRET = SECRET;
        pysMode = 'up';
        const ok = await request('POST', '/api/enquiries', { name: 'Sam', phone: '9876543210', message: 'Need AMC quote' });
        assert.equal(ok.status, 201);
        assert.equal(ok.body.enquiryNumber, 'TRK-7Q2M');
        assert.equal(JSON.parse(pysCalls[pysCalls.length - 1].init.body).kind, 'CONTACT');

        pysMode = 'down';
        const pending = await request('POST', '/api/enquiries', { name: 'Sam', phone: '9876543210', message: 'Need AMC quote' });
        assert.equal(pending.status, 201);
        assert.equal(pending.body.enquiryNumber, null);
        assert.equal(pending.body.syncStatus, 'PENDING_SYNC');
    });

    test('with keys: AMC purchase is sent as AMC_REQUEST', async () => {
        process.env.PYS_INTEGRATION_KEY_ID = KEY_ID;
        process.env.PYS_INTEGRATION_SECRET = SECRET;
        pysMode = 'up';
        const res = await request('POST', '/api/amc/purchase', {
            name: 'Meera', phone: '9123456780', plan_id: 'amc-ord-4', plan_name: 'Ordinary 4 Services & Unlimited Complaints',
            ac_type: 'split', tonnage: '1.5', price: 3000, address: 'Ghatkopar, Mumbai'
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.trackingCode, 'TRK-7Q2M');
        const sent = JSON.parse(pysCalls[pysCalls.length - 1].init.body);
        assert.equal(sent.kind, 'AMC_REQUEST');
        assert.equal(sent.request.amcPlanCode, 'ORD-4');
        assert.equal(pysCalls[pysCalls.length - 1].init.headers['Idempotency-Key'], `ess-amc-${res.body.subscription.id}`);
    });
});
