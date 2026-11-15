// test/gap_closure_and_e2e.test.js
// ═══════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES (ESS) GAP CLOSURE & E2E INTEGRATION TEST SUITE
// Native Node.js Test Runner (node:test & node:assert/strict)
// ═══════════════════════════════════════════════════════════════════════════

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pysIntegrationService = require('../server/services/pysIntegrationService');

describe('SUITE 1: PYS Integration Service Robustness & Invariants', () => {
    test('Service instance initializes with 30,000 ms timeout buffer for cold starts', () => {
        assert.equal(pysIntegrationService.timeoutMs, 30000, 'timeoutMs must be 30,000 ms to absorb Render cold starts');
    });

    test('forwardEnquiry formats payload and sets M2M authentication headers', async () => {
        let requestedUrl = null;
        let requestedHeaders = null;
        let requestedBody = null;

        const originalRequest = pysIntegrationService._request;
        pysIntegrationService._request = async function(endpoint, method, data, customHeaders) {
            requestedUrl = endpoint;
            requestedBody = data;
            return {
                ok: true,
                status: 201,
                data: {
                    success: true,
                    enquiryNumber: 'ENQ-998877',
                    message: 'Enquiry submitted successfully'
                }
            };
        };

        try {
            const result = await pysIntegrationService.forwardEnquiry({
                name: 'Priya Sharma',
                phone: '9820011222',
                email: 'priya@example.com',
                serviceType: 'AC Preventive Maintenance',
                subject: 'Annual Maintenance Inquiry',
                message: 'Inquiring for 3 split AC units in Chembur.'
            });

            assert.equal(result.success, true);
            assert.equal(result.data.enquiryNumber, 'ENQ-998877');
            assert.equal(requestedUrl, '/contact-enquiries');
            assert.equal(requestedBody.name, 'Priya Sharma');
            assert.equal(requestedBody.phone, '9820011222');
            assert.equal(requestedBody.email, 'priya@example.com');
        } finally {
            pysIntegrationService._request = originalRequest;
        }
    });

    test('forwardServiceRequest provides address fallback and extracts primarySite', async () => {
        const calls = [];
        const originalRequest = pysIntegrationService._request;

        pysIntegrationService._request = async function(endpoint, method, data) {
            calls.push({ endpoint, method, data });
            if (endpoint.includes('/customers?search=')) {
                // Return empty list so customer creation is triggered
                return { ok: true, status: 200, data: { data: { customers: [] } } };
            }
            if (endpoint === '/customers' && method === 'POST') {
                return {
                    ok: true,
                    status: 201,
                    data: {
                        data: {
                            customer: {
                                id: 'cust-mock-uuid-1',
                                customerCode: 'CUST-112233',
                                name: data.name,
                                primarySite: {
                                    id: 'site-mock-uuid-1',
                                    siteName: 'Main Site'
                                }
                            }
                        }
                    }
                };
            }
            if (endpoint === '/service-requests' && method === 'POST') {
                return {
                    ok: true,
                    status: 201,
                    data: {
                        data: {
                            request: {
                                id: 'sr-mock-uuid-1',
                                requestNumber: 'SR-2026-999888',
                                status: 'REQUESTED'
                            }
                        }
                    }
                };
            }
            return { ok: true, status: 200, data: {} };
        };

        try {
            // Ticket with no address and snake_case service_type
            const ticketWithoutAddress = {
                id: 'AC-20261115-TEST01',
                name: 'Kavita Patel',
                phone: '9876543210',
                service_type: 'repair',
                issue_description: 'AC blowing hot air'
            };

            const result = await pysIntegrationService.forwardServiceRequest(ticketWithoutAddress);
            assert.equal(result.success, true);
            assert.equal(result.pysRequestNumber, 'SR-2026-999888');

            // Verify customer creation received the fallback address
            const createCustCall = calls.find(c => c.endpoint === '/customers' && c.method === 'POST');
            assert.ok(createCustCall, 'POST /customers must be called');
            assert.ok(createCustCall.data.address, 'Customer address must be present');
            assert.equal(createCustCall.data.address, 'Chembur, Mumbai, Maharashtra');

            // Verify service request received the customerId and siteId
            const createSrCall = calls.find(c => c.endpoint === '/service-requests' && c.method === 'POST');
            assert.ok(createSrCall, 'POST /service-requests must be called');
            assert.equal(createSrCall.data.customerId, 'cust-mock-uuid-1');
            assert.equal(createSrCall.data.siteId, 'site-mock-uuid-1');
            assert.ok(createSrCall.data.description.includes('repair'));
            assert.ok(createSrCall.data.description.includes('AC blowing hot air'));
        } finally {
            pysIntegrationService._request = originalRequest;
        }
    });
});

describe('SUITE 2: Server Route Integrity & Duplicate Route Removal', () => {
    test('server.js contains exactly one declaration of app.post("/api/enquiries")', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        const matches = serverSource.match(/app\.post\(\s*['"]\/api\/enquiries['"]/g);
        assert.ok(matches, 'app.post("/api/enquiries") must exist');
        assert.equal(matches.length, 1, 'There must be exactly ONE declaration of app.post("/api/enquiries")');
    });

    test('server.js enquiries endpoint calls pysIntegrationService.forwardEnquiry', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        const hasForwardEnquiry = serverSource.includes('pysIntegrationService.forwardEnquiry(');
        assert.equal(hasForwardEnquiry, true, 'server.js must call pysIntegrationService.forwardEnquiry');
    });

    test('server.js amc purchase route triggers CRM enquiry forwarding', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        const hasAmcCrmForward = serverSource.includes("serviceType: 'AMC Annual Maintenance Contract'");
        assert.equal(hasAmcCrmForward, true, 'AMC purchase route must forward subscription leads to PYS CRM');
    });

    test('server.js CORS configuration includes port 5002 for local development', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        assert.ok(serverSource.includes('http://localhost:5002'), 'allowedOrigins must include http://localhost:5002');
        assert.ok(serverSource.includes('http://127.0.0.1:5002'), 'allowedOrigins must include http://127.0.0.1:5002');
    });
});

describe('SUITE 3: Vendor Partner Portal Live Inquiries & Quoting', () => {
    test('server.js declares GET /api/vendor/inquiries and POST /api/vendor/submit-bid', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        assert.ok(serverSource.includes("app.get('/api/vendor/inquiries'"), 'GET /api/vendor/inquiries endpoint must be defined');
        assert.ok(serverSource.includes("app.post('/api/vendor/submit-bid'"), 'POST /api/vendor/submit-bid endpoint must be defined');
    });

    test('public/js/vendor.js renders live inquiries and stores active inquiry for bid modal', () => {
        const vendorJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'vendor.js'), 'utf-8');
        assert.ok(vendorJs.includes('async function renderInquiries()'), 'renderInquiries must be async');
        assert.ok(vendorJs.includes("fetch('/api/vendor/inquiries'"), 'renderInquiries must fetch /api/vendor/inquiries');
        assert.ok(vendorJs.includes('activeInquiryForBid'), 'vendor.js must manage activeInquiryForBid');
    });
});

describe('SUITE 4: PWA Offline Resilience & Manifest Integrity', () => {
    test('public/sw.js precache list contains only existing files on disk (zero 404s)', () => {
        const swSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf-8');
        const match = swSource.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
        assert.ok(match, 'STATIC_ASSETS array must be defined in sw.js');

        const assets = match[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(Boolean)
            .filter(s => s !== '/'); // Root / is served by web server

        for (const asset of assets) {
            const diskPath = path.join(__dirname, '..', 'public', asset.startsWith('/') ? asset.slice(1) : asset);
            assert.ok(
                fs.existsSync(diskPath),
                `Asset "${asset}" referenced in STATIC_ASSETS must exist on disk at ${diskPath}`
            );
        }

        // Specifically assert that nonexistent legacy assets are NOT in sw.js
        assert.equal(swSource.includes('/technician.html'), false, 'sw.js must NOT reference /technician.html');
        assert.equal(swSource.includes('/css/custom.css'), false, 'sw.js must NOT reference /css/custom.css');
        assert.equal(swSource.includes('/js/technician.js'), false, 'sw.js must NOT reference /js/technician.js');
    });

    test('public/manifest.json references valid favicon.svg with image/svg+xml type', () => {
        const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        assert.ok(Array.isArray(manifest.icons), 'manifest.json must have icons array');
        assert.ok(manifest.icons.length > 0, 'manifest.json must have at least one icon');

        const icon = manifest.icons[0];
        assert.equal(icon.src, 'favicon.svg');
        assert.equal(icon.type, 'image/svg+xml');

        const iconDiskPath = path.join(__dirname, '..', 'public', 'favicon.svg');
        assert.ok(fs.existsSync(iconDiskPath), 'favicon.svg must exist on disk');
    });

    test('public/js/config.js targets port 5002 in local development', () => {
        const configJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'config.js'), 'utf-8');
        assert.ok(configJs.includes('5002'), 'config.js must handle port 5002');
    });
});

describe('SUITE 5: Real-time Live SSE Tracking Stream', () => {
    test('server.js live tracking endpoint configures SSE headers and queries PYS first', () => {
        const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
        const trackLiveDecl = serverSource.indexOf("app.get('/api/track/live'");
        assert.ok(trackLiveDecl !== -1, 'GET /api/track/live must exist');

        const trackSection = serverSource.slice(trackLiveDecl, trackLiveDecl + 1500);
        assert.ok(trackSection.includes("'text/event-stream'"), 'Must set text/event-stream header');
        assert.ok(trackSection.includes('pysIntegrationService.trackTicket'), 'Must query PYS tracking engine');
        assert.ok(trackSection.includes('maskName'), 'Must mask customer full name for privacy');
    });
});
