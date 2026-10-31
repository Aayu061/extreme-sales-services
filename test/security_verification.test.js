/**
 * Extreme Sales & Services (ESS) — Master Security & Verification Test Suite
 * Conforms to Node.js native test runner (node:test, node:assert/strict).
 * Tests all P0/P1/P2 security hardening, data integrity, and truthfulness features.
 */

// Establish test environment secret before requiring server modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_security_suite_12345678';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

// Backend Modules Under Test
const { getJwtSecret, requireRole, requireAuth } = require('../server/middleware/authMiddleware');
const {
    validatePhone,
    cleanPhone,
    validateEmail,
    validateName,
    validateAddress,
    validateServiceType,
    validateProductInput,
    isValidStatusTransition,
    generateSecureRequestId,
    VALID_STATUS_TRANSITIONS,
    escapeHtml
} = require('../server/middleware/security');
const dispatchEngine = require('../server/services/dispatchEngine');
const diagnosticsEngine = require('../server/services/diagnosticsEngine');
const emailService = require('../server/services/emailService');
const fastCache = require('../server/services/cacheService');
const app = require('../server');

describe('PHASE 2 & 10: Authentication, Authorization & Secret Security', () => {
    test('getJwtSecret() fails closed in production when JWT_SECRET is unset', () => {
        const originalEnv = process.env.NODE_ENV;
        const originalSecret = process.env.JWT_SECRET;

        try {
            process.env.NODE_ENV = 'production';
            delete process.env.JWT_SECRET;

            const result = getJwtSecret();
            assert.equal(result, null, 'Must return null and fail closed when JWT_SECRET is unset in production');
        } finally {
            process.env.NODE_ENV = originalEnv;
            process.env.JWT_SECRET = originalSecret || 'test_secret_for_security_suite_12345678';
        }
    });

    test('Old fallback secret ("fallback_secret_key") is rejected', () => {
        const secret = getJwtSecret();
        // Generate a token signed with the old insecure secret
        const rogueToken = jwt.sign(
            { id: 'hacker-1', email: 'hacker@test.com', role: 'admin' },
            'fallback_secret_key',
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        // Verifying with the authoritative secret must throw JsonWebTokenError
        assert.throws(() => {
            jwt.verify(rogueToken, secret, { algorithms: ['HS256'] });
        }, jwt.JsonWebTokenError);
    });

    test('Valid JWT token with authoritative secret verifies successfully', () => {
        const secret = getJwtSecret();
        const payload = { id: 'admin-1', email: 'admin@test.com', role: 'admin' };
        const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });

        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        assert.equal(decoded.id, 'admin-1');
        assert.equal(decoded.role, 'admin');
        assert.equal(decoded.email, 'admin@test.com');
    });

    test('requireRole middleware blocks unauthorized roles with 403', () => {
        const middleware = requireRole('admin');
        let statusCode = null;
        let responseJson = null;

        const techToken = jwt.sign(
            { id: 'tech-1', role: 'technician', email: 'tech@test.com' },
            getJwtSecret(),
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const req = { headers: { authorization: `Bearer ${techToken}` } };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        middleware(req, res, next);
        assert.equal(nextCalled, false);
        assert.equal(statusCode, 403);
        assert.equal(responseJson.success, false);
        assert.match(responseJson.message, /Forbidden/);
    });

    test('requireRole middleware permits authorized role', () => {
        const middleware = requireRole('admin');
        const adminToken = jwt.sign(
            { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
            getJwtSecret(),
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const req = { headers: { authorization: `Bearer ${adminToken}` } };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        middleware(req, {}, next);
        assert.equal(nextCalled, true);
        assert.equal(req.user.role, 'admin');
    });
});

describe('PHASE 4 & 4.1: Input Validation & Sanitization', () => {
    test('Indian phone validation and cleaning rejects invalid formats and accepts valid 10-digit formats', () => {
        // Valid
        assert.equal(validatePhone('9876543210'), true);
        assert.equal(validatePhone('+919876543210'), true);
        assert.equal(validatePhone('09876543210'), true);
        assert.equal(validatePhone('98765-43210'), true);
        assert.equal(validatePhone('8123456789'), true);
        assert.equal(validatePhone('7000000000'), true);
        assert.equal(validatePhone('6999999999'), true);

        assert.equal(cleanPhone('+919876543210'), '9876543210');
        assert.equal(cleanPhone('09876543210'), '9876543210');

        // Invalid
        assert.equal(validatePhone('1234567890'), false); // starts with 1
        assert.equal(validatePhone('5555555555'), false); // starts with 5
        assert.equal(validatePhone('98765'), false);      // too short
        assert.equal(validatePhone('abcdefghij'), false);  // non-numeric
        assert.equal(validatePhone(''), false);
        assert.equal(validatePhone(null), false);
    });

    test('Email validation adheres to standard RFC structure', () => {
        assert.equal(validateEmail('customer@example.com'), true);
        assert.equal(validateEmail('tech.support+12@ess.co.in'), true);

        assert.equal(validateEmail('invalid-email'), false);
        assert.equal(validateEmail('user@.com'), false);
        assert.equal(validateEmail('@domain.com'), false);
        assert.equal(validateEmail(''), false);
    });

    test('Name validation enforces character length and non-empty values', () => {
        assert.equal(validateName('John Doe'), true);
        assert.equal(validateName('   Aarav Sharma   '), true);

        assert.equal(validateName(''), false);
        assert.equal(validateName('   '), false);
        assert.equal(validateName('A'.repeat(101)), false); // exceeds 100 chars
    });

    test('Address validation enforces safe bounds', () => {
        assert.equal(validateAddress('Flat 402, Sea View Apts, Bandra West, Mumbai'), true);
        assert.equal(validateAddress(''), false);
        assert.equal(validateAddress('X'.repeat(501)), false); // exceeds 300/500 chars
    });

    test('Product numeric input validation rejects negative numbers, NaN, and Infinity', () => {
        // Valid
        const valid = validateProductInput({
            name: 'Daikin 1.5 Ton Split AC',
            category: 'new_ac',
            price: 42999,
            stock: 12,
            rating: 4.8,
            warranty_years: 5
        });
        assert.equal(valid.isValid, true);
        assert.equal(valid.sanitizedPrice, 42999);
        assert.equal(valid.sanitizedStock, 12);

        // Invalid: Negative price
        const negPrice = validateProductInput({ name: 'AC', price: -500 });
        assert.equal(negPrice.isValid, false);
        assert.match(negPrice.errors[0], /positive/);

        // Invalid: NaN price
        const nanPrice = validateProductInput({ name: 'AC', price: NaN });
        assert.equal(nanPrice.isValid, false);

        // Invalid: Infinite stock
        const infStock = validateProductInput({ name: 'AC', price: 1000, stock: Infinity });
        assert.equal(infStock.isValid, false);

        // Invalid: Negative stock
        const negStock = validateProductInput({ name: 'AC', price: 1000, stock: -3 });
        assert.equal(negStock.isValid, false);
    });

    test('XSS escaping helper protects against script injection and image onerror', () => {
        const scriptVector = '<script>alert("xss")</script>';
        const imgVector = '<img src=x onerror=alert(1)>';
        const quoteVector = 'Hello " onclick="evil()"';

        assert.equal(escapeHtml(scriptVector), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        assert.equal(escapeHtml(imgVector), '&lt;img src=x onerror=alert(1)&gt;');
        assert.equal(escapeHtml(quoteVector), 'Hello &quot; onclick=&quot;evil()&quot;');
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
    });
});

describe('PHASE 5: AMC Integrity, Collision-Resistant IDs & State Machine', () => {
    test('generateSecureRequestId() produces collision-resistant IDs with format AC-YYYYMMDD-XXXX', () => {
        const id = generateSecureRequestId();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const regex = new RegExp(`^AC-${dateStr}-[A-Z0-9]{6}$`);
        assert.match(id, regex);

        // Test collision resistance across 1,000 generated IDs
        const ids = new Set();
        for (let i = 0; i < 1000; i++) {
            ids.add(generateSecureRequestId());
        }
        assert.equal(ids.size, 1000, 'All 1,000 generated request IDs must be strictly unique');
    });

    test('Status transitions state machine allows only legal progressions', () => {
        // Legal transitions
        assert.equal(isValidStatusTransition('Pending', 'Assigned'), true);
        assert.equal(isValidStatusTransition('Pending', 'Cancelled'), true);
        assert.equal(isValidStatusTransition('Assigned', 'In Progress'), true);
        assert.equal(isValidStatusTransition('Assigned', 'Pending'), true); // Re-dispatch
        assert.equal(isValidStatusTransition('Assigned', 'Cancelled'), true);
        assert.equal(isValidStatusTransition('In Progress', 'Completed'), true);
        assert.equal(isValidStatusTransition('In Progress', 'Assigned'), true); // Parts hold

        // Illegal transitions
        assert.equal(isValidStatusTransition('Completed', 'Pending'), false);
        assert.equal(isValidStatusTransition('Completed', 'In Progress'), false);
        assert.equal(isValidStatusTransition('Completed', 'Assigned'), false);
        assert.equal(isValidStatusTransition('Pending', 'Completed'), false); // Cannot jump directly
        assert.equal(isValidStatusTransition('Cancelled', 'In Progress'), false);
        assert.equal(isValidStatusTransition('InvalidState', 'Completed'), false);
    });
});

describe('PHASE 7: Truthful Dispatch & Diagnostics Performance Measurement', () => {
    test('Rule-Based HVAC Diagnostics predicts issue and measures real latency via performance.now()', () => {
        const result = diagnosticsEngine.predictDiagnosis({
            description: 'AC not cooling and water leaking from indoor unit',
            serviceType: 'AC Repair'
        });
        assert.equal(result.status, 'success');
        assert.ok(result.detectedDiagnosis);
        assert.ok(result.detectedDiagnosis.rootCause);
        assert.ok(typeof result.latencyMs === 'number');
        assert.ok(result.latencyMs >= 0, 'Measured latency must be a non-negative number');
        assert.equal(result.algorithm, 'Rule-Based HVAC Diagnostics (Fault Tree Heuristic)');
    });

    test('Heuristic Dispatch Engine calculates multi-objective score and measures real latency', () => {
        const dummyTechnicians = [
            { id: 'tech-1', name: 'Ramesh', zone: 'WESTERN_SUBURBS', current_load: 1, max_capacity: 4, skills: ['AC Repair', 'Servicing'], rating: 4.9, active: true },
            { id: 'tech-2', name: 'Suresh', zone: 'CENTRAL_MUMBAI', current_load: 3, max_capacity: 4, skills: ['Installation'], rating: 4.2, active: true }
        ];

        const match = dispatchEngine.findOptimalTechnician(
            { service_type: 'AC Repair', customer_address: 'Lokhandwala, Andheri West' },
            dummyTechnicians
        );

        assert.ok(match);
        assert.ok(match.optimalTechnician);
        assert.ok(match.optimalTechnician.compositeScore > 0);
        assert.ok(typeof match.executionLatencyMs === 'number');
        assert.ok(match.executionLatencyMs >= 0);
        assert.equal(match.algorithm, 'Heuristic Dispatch Engine (Multi-Objective Weighted Greedy Model)');
    });
});

describe('PHASE 8: SendGrid Email Integration Resilience', () => {
    test('Email methods handle missing API key gracefully without throwing unhandled exceptions', async () => {
        const bookingResult = await emailService.sendBookingEmail('test@example.com', {
            customer_name: 'Test Customer',
            request_id: 'AC-20261002-TEST',
            service_type: 'AC Repair',
            phone: '9876543210'
        });
        assert.ok(typeof bookingResult === 'object');

        const statusResult = await emailService.sendStatusUpdateEmail('test@example.com', {
            customer_name: 'Test Customer',
            request_id: 'AC-20261002-TEST',
            status: 'In Progress'
        });
        assert.ok(typeof statusResult === 'object');
    });
});

describe('PHASE 9: High-Performance In-Memory Cache & Tag Invalidation', () => {
    test('Sets and gets values within TTL, and tracks hit/miss telemetry', () => {
        fastCache.set('test_product_1', { name: 'Split AC' }, 5000, ['products']);
        const cached = fastCache.get('test_product_1');
        assert.deepEqual(cached, { name: 'Split AC' });

        const stats = fastCache.getStats();
        assert.ok(typeof stats.hits === 'number');
        assert.ok(stats.hits > 0);
    });

    test('Tag-based invalidation purges all associated keys atomically', () => {
        fastCache.set('prod_a', { id: 'a' }, 5000, ['products']);
        fastCache.set('prod_b', { id: 'b' }, 5000, ['products']);
        assert.ok(fastCache.get('prod_a'));
        assert.ok(fastCache.get('prod_b'));

        fastCache.invalidateTag('products');
        assert.equal(fastCache.get('prod_a'), null);
        assert.equal(fastCache.get('prod_b'), null);
    });
});

describe('PHASE 2, 3, 6, 10.2: HTTP API Endpoints & Security Integration', () => {
    let server;
    let baseUrl;
    let testSecret;

    before(async () => {
        testSecret = getJwtSecret();
        await new Promise((resolve) => {
            server = http.createServer(app);
            server.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        await new Promise((resolve) => {
            if (server) server.close(resolve);
            else resolve();
        });
    });

    test('GET /healthz returns 200 OK and system uptime', async () => {
        const res = await fetch(`${baseUrl}/healthz`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'ok');
        assert.ok(data.uptime >= 0);
    });

    test('GET /api/products returns public catalog with 200 OK', async () => {
        const res = await fetch(`${baseUrl}/api/products`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(Array.isArray(data.products));
    });

    test('GET /api/admin/analytics rejects unauthenticated requests with 401 Unauthorized', async () => {
        const res = await fetch(`${baseUrl}/api/admin/analytics`);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('GET /api/admin/cache-stats rejects unauthenticated requests with 401 Unauthorized', async () => {
        const res = await fetch(`${baseUrl}/api/admin/cache-stats`);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('GET /api/admin/analytics rejects technician role with 403 Forbidden', async () => {
        const techToken = jwt.sign(
            { id: 'tech-1', role: 'technician', email: 'tech@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/admin/analytics`, {
            headers: { Authorization: `Bearer ${techToken}` }
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /Forbidden/);
    });

    test('GET /api/admin/analytics permits admin role with 200 OK and real aggregated structure', async () => {
        const adminToken = jwt.sign(
            { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/admin/analytics`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.statusCounts);
        assert.ok(data.trend && Array.isArray(data.trend.labels));
        assert.ok(data.technicianWorkload);
        assert.ok(data.financials);
    });

    test('P0 IDOR FIX: /api/technician/jobs requires auth and derives identity strictly from JWT', async () => {
        // 1. Unauthenticated request must return 401
        const unauthRes = await fetch(`${baseUrl}/api/technician/jobs`);
        assert.equal(unauthRes.status, 401);

        // 2. Technician tech-1 requests jobs while trying to supply x-technician-id: tech-2
        const tech1Token = jwt.sign(
            { id: 'tech-1', role: 'technician', email: 'tech1@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/technician/jobs`, {
            headers: {
                Authorization: `Bearer ${tech1Token}`,
                'x-technician-id': 'tech-2' // Rogue client header attempting to fetch tech-2 jobs
            }
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(Array.isArray(data.requests));

        // Verify that every returned job is assigned strictly to tech-1, never tech-2
        for (const job of data.requests) {
            assert.equal(job.technician_id, 'tech-1');
        }
    });

    test('POST /api/services validates required fields and rejects invalid phone', async () => {
        const res = await fetch(`${baseUrl}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'John Doe',
                phone: '12345', // invalid phone
                service_type: 'AC Repair',
                address: 'Bandra West, Mumbai'
            })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /mobile|phone/i);
    });

    test('POST /api/auth/login rejects invalid credentials without leaking user existence', async () => {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'nonexistent_user_12345@test.com',
                password: 'WrongPassword123'
            })
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.message, 'Invalid email or password.');
    });

    test('POST /api/auth/login blocks role mismatch when account role does not match selected portal tab', async () => {
        // Super Admin account attempting to log in on 'staff' portal tab
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ess0121@gmail.com',
                password: '@22062006@',
                role: 'staff' // Mismatch!
            })
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /Access Denied.*registered as 'Admin'/i);
    });

    test('POST /api/auth/login succeeds when role matches selected portal tab', async () => {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ess0121@gmail.com',
                password: '@22062006@',
                role: 'admin' // Match!
            })
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.role, 'admin');
    });

    test('PATCH /api/admin/update-status blocks illegal state transitions for non-admin roles', async () => {
        // 1. Create a fresh service request to test against
        const bookRes = await fetch(`${baseUrl}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Customer State',
                phone: '9876543210',
                service_type: 'AC Repair',
                address: 'Bandra West, Mumbai',
                issue: 'Checking state machine'
            })
        });
        const bookData = await bookRes.json();
        assert.equal(bookData.success, true);
        const targetRequestId = bookData.requestId;

        // 2. Staff role attempts an illegal transition directly from 'Pending' -> 'Completed'
        const staffToken = jwt.sign(
            { id: 'staff-1', role: 'staff', email: 'staff@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/admin/update-status`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requestId: targetRequestId,
                status: 'Completed'
            })
        });

        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /Invalid state transition/i);

        // Clean up created test document so database remains 100% clean
        try {
            const admin = require('firebase-admin');
            if (admin.apps.length > 0) {
                const db = admin.firestore();
                const snap = await db.collection('service_requests').where('request_id', '==', targetRequestId).get();
                const batch = db.batch();
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        } catch(_) {}
    });

    test('GET /api/admin/analytics rejects staff role with 403 Forbidden', async () => {
        const staffToken = jwt.sign(
            { id: 'staff-1', role: 'staff', email: 'staff@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/admin/analytics`, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('PUT /api/admin/products/:id returns 404 for non-existent product', async () => {
        const adminToken = jwt.sign(
            { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        const res = await fetch(`${baseUrl}/api/admin/products/non-existent-product-id-99999`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price: 4999 })
        });
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /not found/i);
    });

    test('PATCH /api/admin/assign-technician rejects assigning non-technician and terminal tickets', async () => {
        const adminToken = jwt.sign(
            { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        // 1. Create a service request
        const bookRes = await fetch(`${baseUrl}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Assignee Customer',
                phone: '9876543211',
                service_type: 'AC Repair',
                address: 'Andheri West, Mumbai'
            })
        });
        const bookData = await bookRes.json();
        assert.equal(bookData.success, true);
        const targetRequestId = bookData.requestId;

        try {
            // 2. Attempt to assign usr-staff (who is NOT a technician)
            const invalidTechRes = await fetch(`${baseUrl}/api/admin/assign-technician`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: targetRequestId,
                    technicianId: 'usr-staff' // staff, not technician
                })
            });
            assert.equal(invalidTechRes.status, 400);
            const invalidTechData = await invalidTechRes.json();
            assert.equal(invalidTechData.success, false);
            assert.match(invalidTechData.message, /Target user is not an active technician/i);

            // 3. Update status to 'Cancelled'
            await fetch(`${baseUrl}/api/admin/update-status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: targetRequestId,
                    status: 'Cancelled'
                })
            });

            // 4. Attempt to assign technician to the cancelled ticket
            const assignCancelledRes = await fetch(`${baseUrl}/api/admin/assign-technician`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: targetRequestId,
                    technicianId: 'usr-tech-1'
                })
            });
            assert.equal(assignCancelledRes.status, 400);
            const cancelData = await assignCancelledRes.json();
            assert.equal(cancelData.success, false);
            assert.match(cancelData.message, /Cannot assign technician to a cancelled request/i);

            // 5. Attempt auto-dispatch on the cancelled ticket
            const autoDispatchRes = await fetch(`${baseUrl}/api/admin/auto-dispatch`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: targetRequestId
                })
            });
            assert.equal(autoDispatchRes.status, 400);
            const autoData = await autoDispatchRes.json();
            assert.equal(autoData.success, false);
            assert.match(autoData.message, /Only pending requests can be auto-dispatched/i);
        } finally {
            // Firestore cleanup
            try {
                const admin = require('firebase-admin');
                if (admin.apps.length > 0) {
                    const db = admin.firestore();
                    const snap = await db.collection('service_requests').where('request_id', '==', targetRequestId).get();
                    const batch = db.batch();
                    snap.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            } catch (_) {}
        }
    });

    test('AMC Integrity: Quota refunded on cancellation and expired contracts rejected', async () => {
        const testPhone = '9999900001';
        const adminToken = jwt.sign(
            { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
            testSecret,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        let createdAmcDocId = null;
        let createdRequestId = null;

        try {
            const admin = require('firebase-admin');
            const hasFirestore = admin.apps.length > 0;

            if (hasFirestore) {
                const db = admin.firestore();
                // Create an active AMC contract with 2 remaining visits
                const amcRef = await db.collection('customer_amc').add({
                    customer_name: 'Test AMC Customer',
                    phone: testPhone,
                    plan_name: 'Comfort Standard Plan',
                    status: 'Active',
                    remaining_services: 2,
                    end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
                    created_at: new Date().toISOString()
                });
                createdAmcDocId = amcRef.id;
            }

            // 1. Verify AMC check returns active
            const checkRes = await fetch(`${baseUrl}/api/amc/check?phone=${testPhone}`);
            const checkData = await checkRes.json();
            if (hasFirestore) {
                assert.equal(checkData.active, true);
                assert.equal(checkData.remainingServices, 2);
            }

            // 2. Book a service which consumes 1 AMC visit
            const bookRes = await fetch(`${baseUrl}/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test AMC Customer',
                    phone: testPhone,
                    service_type: 'AC General Service',
                    address: 'Juhu Tara Road, Mumbai'
                })
            });
            const bookData = await bookRes.json();
            assert.equal(bookData.success, true);
            createdRequestId = bookData.requestId;

            if (hasFirestore) {
                const db = admin.firestore();
                const afterBookSnap = await db.collection('customer_amc').doc(createdAmcDocId).get();
                assert.equal(afterBookSnap.data().remaining_services, 1);
            }

            // 3. Cancel the service request -> verify remaining_services increments back to 2!
            const cancelRes = await fetch(`${baseUrl}/api/admin/update-status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: createdRequestId,
                    status: 'Cancelled'
                })
            });
            const cancelData = await cancelRes.json();
            assert.equal(cancelData.success, true);

            if (hasFirestore) {
                const db = admin.firestore();
                const afterCancelSnap = await db.collection('customer_amc').doc(createdAmcDocId).get();
                assert.equal(afterCancelSnap.data().remaining_services, 2, 'AMC visit must be refunded upon cancellation');

                // 4. Update end_date to the past to test contract expiration
                await db.collection('customer_amc').doc(createdAmcDocId).update({
                    end_date: new Date(Date.now() - 86400000).toISOString() // Expired yesterday
                });

                const expiredCheckRes = await fetch(`${baseUrl}/api/amc/check?phone=${testPhone}`);
                const expiredCheckData = await expiredCheckRes.json();
                assert.equal(expiredCheckData.active, false);
                assert.equal(expiredCheckData.expired, true);
            }
        } finally {
            // Clean up test Firestore documents completely
            try {
                const admin = require('firebase-admin');
                if (admin.apps.length > 0) {
                    const db = admin.firestore();
                    if (createdAmcDocId) await db.collection('customer_amc').doc(createdAmcDocId).delete();
                    if (createdRequestId) {
                        const snap = await db.collection('service_requests').where('request_id', '==', createdRequestId).get();
                        const batch = db.batch();
                        snap.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                }
            } catch (_) {}
        }
    });
});
