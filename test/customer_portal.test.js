// extreme-sales-services-main/test/customer_portal.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// The phone-only customer portal is paused until verified (OTP) login ships.
describe('SUITE: ESS Customer Portal (paused until secure login)', () => {
    it('customer-portal.html shows the upgrade notice and loads no portal script', () => {
        const html = fs.readFileSync(path.join(__dirname, '../public/customer-portal.html'), 'utf8');
        assert.ok(html.includes('Customer portal is being upgraded'), 'shows the upgrade notice');
        assert.ok(html.includes('status.html'), 'links to request tracking');
        assert.equal(html.includes('customer-portal.js'), false, 'no portal script is loaded');
        assert.equal(html.includes('quickDemoBtn'), false, 'no demo customer button');
    });

    it('customer-portal.js (phone-only login client) has been removed', () => {
        assert.equal(fs.existsSync(path.join(__dirname, '../public/js/customer-portal.js')), false);
    });

    it('server.js has no catch-all proxy to PYS and answers /api/portal with 503', () => {
        const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
        assert.equal(src.includes('pysEndpoint = `/portal${req.url}`'), false, 'catch-all proxy removed');
        assert.ok(src.includes("app.all(['/api/portal', '/api/portal/*splat']"), 'paused handler present');
    });

    it('Navbars in index.html and status.html still link to the Customer Portal page', () => {
        const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
        const statusHtml = fs.readFileSync(path.join(__dirname, '../public/status.html'), 'utf8');
        assert.ok(indexHtml.includes('customer-portal.html'));
        assert.ok(statusHtml.includes('customer-portal.html'));
    });
});
