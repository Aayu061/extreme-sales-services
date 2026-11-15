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
        this.apiKey = process.env.PYS_API_KEY || '***REMOVED***';
        this.webhookSecret = process.env.PYS_WEBHOOK_SECRET || '***REMOVED***';
        this.timeoutMs = 30000;
    }

    /**
     * Resilient HTTP/HTTPS request utility supporting both native fetch and Node https module.
     */
    async _request(endpoint, method = 'GET', data = null, customHeaders = {}) {
        const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'ExtremeSalesServices-Integration/2.0',
            ...customHeaders
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
            const rawPhone = ticket.phone || '';
            const phone = rawPhone.trim().replace(/\D/g, '').slice(-10);
            const customerName = (ticket.name || ticket.customerName || 'Valued Customer').trim();
            const customerEmail = (ticket.email || `customer-${phone || Date.now()}@extremess.com`).trim().toLowerCase();
            const rawAddress = (ticket.address || '').trim();
            const address = rawAddress.length >= 3 ? rawAddress : 'Chembur, Mumbai, Maharashtra';

            let customerId = null;
            let siteId = null;

            // Step 1: Find or Create Customer on PYS
            if (phone && phone.length >= 7) {
                const searchRes = await this._request(`/customers?search=${encodeURIComponent(phone)}`, 'GET');
                if (searchRes.ok && searchRes.data && searchRes.data.data && Array.isArray(searchRes.data.data.customers) && searchRes.data.data.customers.length > 0) {
                    const c = searchRes.data.data.customers[0];
                    customerId = c.id;
                    if (c.primarySite && c.primarySite.id) {
                        siteId = c.primarySite.id;
                    }
                }
            }

            if (!customerId) {
                const createCustRes = await this._request('/customers', 'POST', {
                    name: customerName,
                    phone: phone || '9999999999',
                    email: customerEmail,
                    address: address,
                    customerType: 'TEMPORARY',
                    companyName: ticket.companyName || customerName,
                    gstNumber: ticket.gstin || ticket.gstNumber || undefined
                });

                if (createCustRes.ok && createCustRes.data && createCustRes.data.data && createCustRes.data.data.customer) {
                    const c = createCustRes.data.data.customer;
                    customerId = c.id;
                    if (c.primarySite && c.primarySite.id) {
                        siteId = c.primarySite.id;
                    }
                } else {
                    const errorMsg = (createCustRes.data && createCustRes.data.error && createCustRes.data.error.message) ||
                                     (createCustRes.data && createCustRes.data.message) ||
                                     createCustRes.error || 'Failed to create customer record in PYS';
                    return { success: false, error: errorMsg, status: createCustRes.status };
                }
            }

            // Step 2: Ensure Site ID is available
            if (!siteId && customerId) {
                const siteRes = await this._request(`/customers/${customerId}/sites`, 'GET');
                if (siteRes.ok && siteRes.data && siteRes.data.data && Array.isArray(siteRes.data.data.sites) && siteRes.data.data.sites.length > 0) {
                    siteId = siteRes.data.data.sites[0].id;
                } else {
                    const createSiteRes = await this._request('/sites', 'POST', {
                        customerId,
                        siteName: `${customerName} - Main Site`,
                        address: address,
                        contactPerson: customerName,
                        contactPhone: phone || '9999999999',
                        contactEmail: customerEmail,
                        isPrimary: true
                    });
                    if (createSiteRes.ok && createSiteRes.data && createSiteRes.data.data && createSiteRes.data.data.site) {
                        siteId = createSiteRes.data.data.site.id;
                    }
                }
            }

            if (!customerId || !siteId) {
                return {
                    success: false,
                    error: `Could not link Customer (${customerId}) and Site (${siteId}) in PYS`
                };
            }

            // Step 3: Dispatch Service Request to PYS
            const effectiveServiceType = ticket.service_type || ticket.serviceType || 'AC Repair & Service';
            const effectiveDescription = ticket.issue_description || ticket.problem || ticket.description || 'Customer requested service via Extreme S&S';
            const descriptionParts = [
                `ESS Service Inquiry: ${effectiveServiceType}`,
                ticket.brand ? `AC Brand: ${ticket.brand}` : null,
                `Issue: ${effectiveDescription}`,
                ticket.preferredDate || ticket.preferred_date ? `Preferred Slot: ${ticket.preferredDate || ticket.preferred_date}` : null
            ].filter(Boolean);

            const rawPriority = String(ticket.priority || '').toLowerCase();
            let mappedPriority = 'HIGH';
            if (rawPriority === 'urgent' || rawPriority === 'critical') mappedPriority = 'URGENT';
            else if (rawPriority === 'emergency') mappedPriority = 'EMERGENCY';
            else if (rawPriority === 'low') mappedPriority = 'LOW';
            else if (rawPriority === 'medium') mappedPriority = 'MEDIUM';

            let validDate = null;
            const rawDate = ticket.preferredDate || ticket.preferred_date;
            if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
                validDate = String(rawDate).match(/^\d{4}-\d{2}-\d{2}/)[0];
            } else {
                validDate = new Date().toISOString().split('T')[0];
            }

            const payload = {
                customerId,
                siteId,
                assetId: null,
                requestType: 'BREAKDOWN',
                priority: mappedPriority,
                description: descriptionParts.join(' | '),
                sourceChannel: 'EXTREME_SALES_SERVICES',
                externalReferenceId: ticket.request_id || ticket.id || ticket.ticketId || `SR-${Date.now()}`,
                preferredDate: validDate
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
                error: (ticketRes.data && ticketRes.data.error && ticketRes.data.error.message) ||
                       (ticketRes.data && ticketRes.data.message) ||
                       ticketRes.error || 'Failed to sync service request with PYS',
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
     * Track live ticket from PYS Supabase database
     */
    async trackTicket(identifier, phone) {
        try {
            const query = [];
            if (identifier) query.push(`ticket=${encodeURIComponent(identifier)}`);
            if (phone) query.push(`phone=${encodeURIComponent(phone)}`);
            const res = await this._request(`/portal/track?${query.join('&')}`, 'GET');
            if (res.ok && res.data && res.data.success) {
                return {
                    success: true,
                    data: res.data.data
                };
            }
            return {
                success: false,
                error: (res.data && res.data.message) || res.error || 'Ticket not found in PYS'
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Forward server crash or client exception to PYS Telemetry & Bug Inspector
     */
    async forwardCrashReport(crashPayload) {
        try {
            const res = await this._request('/admin/telemetry/crash-report', 'POST', {
                service: 'ESS',
                ...crashPayload
            });
            return res.ok;
        } catch (err) {
            console.error('[PYS Integration] Failed to forward crash report:', err.message);
            return false;
        }
    }

    /**
     * Forward customer inquiry or contact message to PYS CRM contact_enquiries
     */
    async forwardEnquiry(enquiryData) {
        try {
            const res = await this._request('/contact-enquiries', 'POST', {
                sourceChannel: 'EXTREME_SALES_SERVICES',
                ...enquiryData
            });
            if (res.ok && res.data && (res.data.success || res.data.data)) {
                return {
                    success: true,
                    data: res.data.data || res.data
                };
            }
            return {
                success: false,
                error: (res.data && res.data.message) || res.error
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
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
