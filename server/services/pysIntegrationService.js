// server/services/pysIntegrationService.js
// ═══════════════════════════════════════════════════════════════════════════
// EXTREME SALES & SERVICES (ESS) <-> PLACE YOUR SERVICE (PYS) INTEGRATION
// Machine-to-Machine REST API Client & Webhook Synchronization Service
// ═══════════════════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');
const { URL } = require('url');

class PysIntegrationService {
    constructor() {
        this.baseUrl = (process.env.PYS_API_BASE_URL || 'https://place-your-service-api.onrender.com/api/v1').replace(/\/$/, '');
        this.apiKey = process.env.PYS_API_KEY || 'pys_m2m_ess_live_secret_key_2026';
        this.webhookSecret = process.env.PYS_WEBHOOK_SECRET || 'ess_pys_shared_secret_2026';
        this.timeoutMs = 8000;
    }

    /**
     * Resilient HTTP/HTTPS request utility supporting both native fetch and Node https module.
     */
    async _request(endpoint, method = 'GET', data = null) {
        const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'ExtremeSalesServices-Integration/2.0'
        };

        if (typeof globalThis.fetch === 'function') {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const response = await globalThis.fetch(fullUrl, {
                    method,
                    headers,
                    body: data ? JSON.stringify(data) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timer);
                const json = await response.json().catch(() => ({}));
                return {
                    ok: response.ok,
                    status: response.status,
                    data: json
                };
            } catch (err) {
                clearTimeout(timer);
                return {
                    ok: false,
                    status: 503,
                    error: err.name === 'AbortError' ? 'PYS API request timed out (cold start)' : err.message
                };
            }
        }

        // Fallback for environments without global fetch
        return new Promise((resolve) => {
            const parsed = new URL(fullUrl);
            const client = parsed.protocol === 'https:' ? https : http;
            const req = client.request({
                protocol: parsed.protocol,
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method,
                headers,
                timeout: this.timeoutMs
            }, (res) => {
                let chunks = '';
                res.on('data', chunk => chunks += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(chunks);
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: json });
                    } catch (_) {
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { raw: chunks } });
                    }
                });
            });

            req.on('error', (err) => resolve({ ok: false, status: 503, error: err.message }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false, status: 504, error: 'PYS API timeout' });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * Offline Algorithmic Indian GSTIN Validator fallback
     */
    _offlineGstinValidator(gstin) {
        if (!gstin || typeof gstin !== 'string') {
            return { isValid: false, reason: 'Empty or invalid format' };
        }
        const cleaned = gstin.trim().toUpperCase();
        const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!regex.test(cleaned)) {
            return { isValid: false, reason: 'GSTIN does not match 15-character statutory format' };
        }

        const stateCodes = {
            '27': 'Maharashtra',
            '24': 'Gujarat',
            '29': 'Karnataka',
            '07': 'Delhi',
            '33': 'Tamil Nadu',
            '36': 'Telangana',
            '19': 'West Bengal',
            '06': 'Haryana',
            '09': 'Uttar Pradesh',
            '08': 'Rajasthan'
        };

        const entityTypes = {
            'C': 'Company (Private / Public Limited)',
            'P': 'Proprietorship / Individual',
            'H': 'Hindu Undivided Family (HUF)',
            'F': 'Partnership Firm / LLP',
            'A': 'Association of Persons (AOP)',
            'T': 'Trust',
            'B': 'Body of Individuals (BOI)',
            'L': 'Local Authority',
            'J': 'Artificial Juridical Person',
            'G': 'Government Department'
        };

        const stateCode = cleaned.slice(0, 2);
        const pan = cleaned.slice(2, 12);
        const entityChar = cleaned[5];

        return {
            isValid: true,
            data: {
                gstin: cleaned,
                stateCode,
                state: stateCodes[stateCode] || 'Other State / UT',
                pan,
                entityType: entityTypes[entityChar] || 'Registered Commercial Entity',
                isValidFormat: true,
                confidence: 'HIGH',
                source: 'OFFLINE_ALGORITHMIC_VALIDATOR'
            }
        };
    }

    /**
     * Lookup Indian GSTIN using PYS offline validator endpoint, with local fallback
     */
    async lookupGstin(gstin) {
        if (!gstin) return { success: false, error: 'GSTIN required' };

        // 1. Attempt PYS Endpoint
        const res = await this._request('/compliance/gstin/lookup', 'POST', { gstin });
        if (res.ok && res.data && res.data.success) {
            return res.data;
        }

        // 2. Resilient Fallback to Local Algorithmic Decoder
        const fallback = this._offlineGstinValidator(gstin);
        if (fallback.isValid) {
            return {
                success: true,
                data: fallback.data,
                note: 'Verified via ESS built-in algorithmic engine'
            };
        }
        return {
            success: false,
            error: fallback.reason || 'Invalid GSTIN number'
        };
    }

    /**
     * Check liveness & connection latency to PYS API
     */
    async checkHealth() {
        const start = Date.now();
        const res = await this._request('/health', 'GET');
        const latencyMs = Date.now() - start;
        return {
            connected: res.ok,
            status: res.status,
            latencyMs,
            details: res.data || { error: res.error }
        };
    }

    /**
     * Forward an ESS Service Booking Ticket to PYS Enterprise REST Engine
     * 1. Register or find Customer
     * 2. Register primary Site
     * 3. Create Service Request with sourceChannel: 'EXTREME_SALES_SERVICES' and externalReferenceId
     */
    async forwardServiceRequest(ticket) {
        try {
            const phone = (ticket.phone || '').trim().replace(/\D/g, '').slice(-10);
            const customerName = (ticket.name || ticket.customerName || 'Valued Customer').trim();
            const customerEmail = (ticket.email || `customer-${phone || Date.now()}@extremess.com`).trim();
            const address = ticket.address || 'Chembur, Mumbai, Maharashtra';

            let customerId = null;

            // Step 1: Find or Create Customer on PYS
            if (phone) {
                const searchRes = await this._request(`/customers?search=${encodeURIComponent(phone)}`, 'GET');
                if (searchRes.ok && searchRes.data && searchRes.data.data && Array.isArray(searchRes.data.data.customers) && searchRes.data.data.customers.length > 0) {
                    customerId = searchRes.data.data.customers[0].id;
                }
            }

            if (!customerId) {
                const createCustRes = await this._request('/customers', 'POST', {
                    name: customerName,
                    phone: phone || '9999999999',
                    email: customerEmail,
                    customerType: 'TEMPORARY',
                    companyName: ticket.companyName || customerName,
                    gstNumber: ticket.gstin || ticket.gstNumber || undefined
                });

                if (createCustRes.ok && createCustRes.data && createCustRes.data.data && createCustRes.data.data.customer) {
                    customerId = createCustRes.data.data.customer.id;
                }
            }

            // Step 2: Register Primary Site if customer was created or lookup customer sites
            let siteId = null;
            if (customerId) {
                const siteRes = await this._request(`/customers/${customerId}/sites`, 'GET');
                if (siteRes.ok && siteRes.data && siteRes.data.data && Array.isArray(siteRes.data.data.sites) && siteRes.data.data.sites.length > 0) {
                    siteId = siteRes.data.data.sites[0].id;
                } else {
                    const createSiteRes = await this._request('/sites', 'POST', {
                        customerId,
                        siteName: `${customerName} Location`,
                        address: address,
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400071',
                        isPrimary: true
                    });
                    if (createSiteRes.ok && createSiteRes.data && createSiteRes.data.data && createSiteRes.data.data.site) {
                        siteId = createSiteRes.data.data.site.id;
                    }
                }
            }

            // Step 3: Dispatch Service Request to PYS
            const descriptionParts = [
                `ESS Service Inquiry: ${ticket.serviceType || 'AC Repair & Service'}`,
                ticket.brand ? `AC Brand: ${ticket.brand}` : null,
                ticket.problem || ticket.description ? `Issue Reported: ${ticket.problem || ticket.description}` : null,
                ticket.preferredDate ? `Preferred Slot: ${ticket.preferredDate}` : null
            ].filter(Boolean);

            const payload = {
                customerId: customerId || undefined,
                siteId: siteId || undefined,
                assetId: null,
                requestType: 'BREAKDOWN',
                priority: ticket.priority === 'urgent' ? 'CRITICAL' : 'HIGH',
                description: descriptionParts.join(' | '),
                sourceChannel: 'EXTREME_SALES_SERVICES',
                externalReferenceId: ticket.id || ticket.ticketId || `SR-${Date.now()}`,
                preferredDate: ticket.preferredDate || new Date().toISOString().split('T')[0]
            };

            const ticketRes = await this._request('/service-requests', 'POST', payload);

            if (ticketRes.ok && ticketRes.data && ticketRes.data.data) {
                const created = ticketRes.data.data.request || ticketRes.data.data;
                return {
                    success: true,
                    pysRequestId: created.id || created.requestId,
                    pysRequestNumber: created.requestNumber,
                    status: created.status || 'PENDING',
                    syncedAt: new Date().toISOString(),
                    raw: ticketRes.data
                };
            }

            return {
                success: false,
                error: (ticketRes.data && ticketRes.data.message) || ticketRes.error || 'Failed to sync with PYS',
                status: ticketRes.status
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Pull live official AMC plans from PYS
     */
    async fetchAmcPlans() {
        const res = await this._request('/amc-contracts/plans?includeInactive=false', 'GET');
        if (res.ok && res.data && res.data.data) {
            return {
                success: true,
                plans: res.data.data.plans || []
            };
        }
        return {
            success: false,
            error: res.error || 'Unable to fetch PYS plans'
        };
    }

    /**
     * Validate incoming webhook signature from PYS
     */
    verifyWebhookAuth(req) {
        const incomingSecret = req.headers['x-webhook-secret'];
        if (!incomingSecret) return false;
        return incomingSecret === this.webhookSecret;
    }
}

module.exports = new PysIntegrationService();
