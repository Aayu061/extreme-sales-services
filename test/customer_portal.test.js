// extreme-sales-services-main/test/customer_portal.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('SUITE: ESS Customer Self-Service Portal & Equipment Verification', () => {
    it('customer-portal.html must exist with complete UI sections', () => {
        const portalPath = path.join(__dirname, '../public/customer-portal.html');
        assert.ok(fs.existsSync(portalPath), 'customer-portal.html should exist');

        const html = fs.readFileSync(portalPath, 'utf8');
        assert.ok(html.includes('id="authSection"'), 'Includes customer auth login section');
        assert.ok(html.includes('id="dashboardSection"'), 'Includes customer dashboard section');
        assert.ok(html.includes('id="tabPanelEquipment"'), 'Includes AC Equipment register tab');
        assert.ok(html.includes('id="tabPanelHistory"'), 'Includes Service History & Reports tab');
        assert.ok(html.includes('id="tabPanelAmc"'), 'Includes AMC Maintenance tab');
        assert.ok(html.includes('id="tabPanelInvoices"'), 'Includes Invoices & Billing tab');
        assert.ok(html.includes('id="bookServiceModal"'), 'Includes 1-click Book Service modal');
        assert.ok(html.includes('id="registerAssetModal"'), 'Includes Register New AC modal');
        assert.ok(html.includes('id="jobCardModal"'), 'Includes Digital Job Card inspection modal');
    });

    it('customer-portal.js must exist with API handlers', () => {
        const jsPath = path.join(__dirname, '../public/js/customer-portal.js');
        assert.ok(fs.existsSync(jsPath), 'customer-portal.js should exist');

        const js = fs.readFileSync(jsPath, 'utf8');
        assert.ok(js.includes('/overview'), 'Includes overview fetch');
        assert.ok(js.includes('/auth/login'), 'Includes login handler');
        assert.ok(js.includes('/book-service'), 'Includes service request booking handler');
        assert.ok(js.includes('/register-asset'), 'Includes equipment register handler');
    });

    it('Navbars in index.html and status.html contain Customer Portal links', () => {
        const indexPath = path.join(__dirname, '../public/index.html');
        const statusPath = path.join(__dirname, '../public/status.html');

        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        const statusHtml = fs.readFileSync(statusPath, 'utf8');

        assert.ok(indexHtml.includes('customer-portal.html'), 'index.html links to customer-portal.html');
        assert.ok(statusHtml.includes('customer-portal.html'), 'status.html links to customer-portal.html');
    });
});
