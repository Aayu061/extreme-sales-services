// test/pys_integration.test.js
// ═══════════════════════════════════════════════════════════════════════════
// PYS DUAL-PLATFORM INTEGRATION & VENDOR PORTAL LOGICAL TEST SUITE
// Native Node.js Test Runner (Runs standalone and on CI/CD)
// ═══════════════════════════════════════════════════════════════════════════

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pysIntegrationService = require('../server/services/pysIntegrationService');

describe('SUITE 1: PYS Indian GSTIN Compliance & Algorithmic Decoder', () => {
    test('Correctly decodes valid Chembur Maharashtra GSTIN (27ANTPP9778J1ZO)', async () => {
        const result = await pysIntegrationService.lookupGstin('27ANTPP9778J1ZO');
        assert.ok(result.success, 'Lookup must succeed');
        assert.equal(result.data.stateCode, '27');
        assert.equal(result.data.state, 'Maharashtra');
        assert.equal(result.data.pan, 'ANTPP9778J');
        assert.equal(result.data.entityType, 'Proprietorship / Individual');
        assert.equal(result.data.isValidFormat, true);
        assert.equal(result.data.confidence, 'HIGH');
    });

    test('Correctly decodes Gujarat Company GSTIN (24AAACC1234F1Z5)', async () => {
        const result = await pysIntegrationService.lookupGstin('24AAACC1234F1Z5');
        assert.ok(result.success);
        assert.equal(result.data.stateCode, '24');
        assert.equal(result.data.state, 'Gujarat');
        assert.equal(result.data.pan, 'AAACC1234F');
        assert.equal(result.data.entityType, 'Company (Private / Public Limited)');
    });

    test('Rejects malformed GSTIN numbers cleanly', async () => {
        const result = await pysIntegrationService.lookupGstin('INVALID_GST_NUMBER');
        assert.equal(result.success, false);
        assert.ok(result.error);
    });

    test('Rejects empty or null GSTIN input', async () => {
        const r1 = await pysIntegrationService.lookupGstin('');
        const r2 = await pysIntegrationService.lookupGstin(null);
        assert.equal(r1.success, false);
        assert.equal(r2.success, false);
    });
});

describe('SUITE 2: PYS Webhook Authentication & Security Guard', () => {
    test('Verifies valid webhook secret provided by PYS production deployment', () => {
        const mockValidReq = {
            headers: {
                'x-webhook-secret': 'ess_pys_shared_secret_2026',
                'user-agent': 'PlaceYourService-Webhook/1.0'
            }
        };
        assert.equal(pysIntegrationService.verifyWebhookAuth(mockValidReq), true);
    });

    test('Rejects forged or missing webhook secret', () => {
        const mockForgedReq = {
            headers: {
                'x-webhook-secret': 'invalid_secret_attack'
            }
        };
        const mockEmptyReq = { headers: {} };

        assert.equal(pysIntegrationService.verifyWebhookAuth(mockForgedReq), false);
        assert.equal(pysIntegrationService.verifyWebhookAuth(mockEmptyReq), false);
    });
});

describe('SUITE 3: Technician Portal Deprecation & File Integrity', () => {
    test('technician.html and technician.js must be permanently deleted', () => {
        const techHtmlPath = path.join(__dirname, '..', 'public', 'technician.html');
        const techJsPath = path.join(__dirname, '..', 'public', 'js', 'technician.js');
        assert.equal(fs.existsSync(techHtmlPath), false, 'technician.html must not exist in public/');
        assert.equal(fs.existsSync(techJsPath), false, 'technician.js must not exist in public/js/');
    });

    test('vendor.html and vendor.js must exist and be accessible', () => {
        const vendorHtmlPath = path.join(__dirname, '..', 'public', 'vendor.html');
        const vendorJsPath = path.join(__dirname, '..', 'public', 'js', 'vendor.js');
        assert.equal(fs.existsSync(vendorHtmlPath), true, 'vendor.html must exist');
        assert.equal(fs.existsSync(vendorJsPath), true, 'vendor.js must exist');
    });

    test('login.html contains Vendor tab and no Field Tech tab', () => {
        const loginHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'), 'utf-8');
        assert.ok(loginHtml.includes('Vendor'), 'login.html must contain Vendor role tab');
        assert.equal(loginHtml.includes('Field Tech'), false, 'login.html must not contain Field Tech');
    });
});
