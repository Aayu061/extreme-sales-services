// server/services/pysSignedClient.js
// ═══════════════════════════════════════════════════════════════════════════
// Signed server-to-server client for the PYS ESS intake API.
//
//   POST {base}/api/v1/ess/intakes   (bookings, AMC requests, enquiries)
//   GET  {base}/api/v1/ess/ping      (connectivity check)
//
// Every request is signed with HMAC-SHA256 over a canonical string:
//   timestamp \n nonce \n METHOD \n path \n sha256hex(raw body)
// The exact body string that is signed is the exact string that is sent.
//
// Env (secrets only ever come from env vars, never from code):
//   PYS_API_URL or PYS_API_BASE_URL   PYS base URL (a trailing /api/v1 is stripped)
//   PYS_INTEGRATION_KEY_ID            key id issued by PYS admin
//   PYS_INTEGRATION_SECRET            shared secret issued with that key id
// ═══════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const INTAKE_PATH = '/api/v1/ess/intakes';
const PING_PATH = '/api/v1/ess/ping';
const DEFAULT_BASE_URL = 'https://place-your-service-api.onrender.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 3000;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_.:-]{8,200}$/;

function getConfig(env = process.env) {
    const rawBase = String(env.PYS_API_URL || env.PYS_API_BASE_URL || DEFAULT_BASE_URL).trim();
    const baseUrl = rawBase.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
    return {
        baseUrl,
        keyId: String(env.PYS_INTEGRATION_KEY_ID || '').trim(),
        secret: String(env.PYS_INTEGRATION_SECRET || '')
    };
}

/** True only when both the key id and the secret are present. */
function isConfigured(env = process.env) {
    const cfg = getConfig(env);
    return Boolean(cfg.keyId && cfg.secret);
}

function sha256Hex(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function buildCanonical({ timestamp, nonce, method, path, body = '' }) {
    return [String(timestamp), nonce, String(method).toUpperCase(), path, sha256Hex(body)].join('\n');
}

/**
 * Build the signing headers for one request.
 * `body` must be the exact raw string that will be sent ('' for GET).
 * `timestamp` / `nonce` can be injected for deterministic tests.
 */
function signRequest({ keyId, secret, method, path, body = '', timestamp, nonce }) {
    if (!keyId || !secret) throw new Error('PYS signed integration is not configured');
    const ts = timestamp !== undefined ? String(timestamp) : String(Math.floor(Date.now() / 1000));
    const n = nonce || crypto.randomBytes(16).toString('hex');
    const canonical = buildCanonical({ timestamp: ts, nonce: n, method, path, body });
    const signature = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    return {
        'X-PYS-Key-Id': keyId,
        'X-PYS-Timestamp': ts,
        'X-PYS-Nonce': n,
        'X-PYS-Signature': signature
    };
}

function isRetryable(result) {
    if (!result) return true;
    if (result.networkError) return true;
    return result.status === 409 || result.status >= 500;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendOnce(cfg, method, path, bodyString, extraHeaders, timeoutMs, fetchImpl) {
    const headers = {
        Accept: 'application/json',
        'User-Agent': 'ExtremeSalesServices-Integration/3.0',
        ...extraHeaders,
        ...signRequest({ keyId: cfg.keyId, secret: cfg.secret, method, path, body: bodyString })
    };
    if (method !== 'GET') headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(`${cfg.baseUrl}${path}`, {
            method,
            headers,
            body: method === 'GET' ? undefined : bodyString,
            signal: controller.signal
        });
        const json = await response.json().catch(() => null);
        return { ok: response.ok, status: response.status, data: json };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            networkError: true,
            error: err && err.name === 'AbortError' ? `PYS request timed out after ${timeoutMs} ms` : (err && err.message) || 'Network error'
        };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Send a signed request; retries once (fresh timestamp + nonce, same body and
 * Idempotency-Key) on network error, timeout, 5xx or 409.
 */
async function sendSigned(method, path, bodyString, extraHeaders = {}, opts = {}) {
    const cfg = getConfig(opts.env || process.env);
    if (!cfg.keyId || !cfg.secret) {
        return { ok: false, status: 503, notConfigured: true, error: 'PYS signed integration is not configured (PYS_INTEGRATION_KEY_ID / PYS_INTEGRATION_SECRET missing).' };
    }
    const fetchImpl = opts.fetchImpl || globalThis.fetch;
    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const retryDelayMs = opts.retryDelayMs !== undefined ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS;
    const maxAttempts = opts.retry === false ? 1 : 2;

    let result;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        result = await sendOnce(cfg, method, path, bodyString, extraHeaders, timeoutMs, fetchImpl);
        result.attempts = attempt;
        if (!isRetryable(result) || attempt === maxAttempts) break;
        await sleep(retryDelayMs);
    }
    return result;
}

function extractError(res) {
    const d = res && res.data;
    return (d && d.error && (d.error.message || (typeof d.error === 'string' ? d.error : null))) ||
           (d && d.message) || (res && res.error) || `PYS responded with HTTP ${res && res.status}`;
}

/**
 * Send one intake to PYS.
 * Resolves to { success: true, intakeNumber, trackingCode, status, duplicate }
 * or { success: false, status, error, retryable, notConfigured }.
 */
async function postIntake(body, idempotencyKey, opts = {}) {
    if (!IDEMPOTENCY_KEY_RE.test(String(idempotencyKey || ''))) {
        return { success: false, status: 0, retryable: false, error: 'Invalid Idempotency-Key (8-200 chars of A-Z a-z 0-9 _ . : -)' };
    }
    const bodyString = JSON.stringify(body);
    const res = await sendSigned('POST', INTAKE_PATH, bodyString, { 'Idempotency-Key': idempotencyKey }, opts);
    if (res.ok && res.data && res.data.success && res.data.data) {
        const d = res.data.data;
        return {
            success: true,
            status: res.status,
            duplicate: res.status === 200,
            intakeNumber: d.intakeNumber || '',
            trackingCode: d.trackingCode || '',
            intakeStatus: d.status || '',
            attempts: res.attempts
        };
    }
    return {
        success: false,
        status: res.status,
        notConfigured: Boolean(res.notConfigured),
        retryable: Boolean(res.notConfigured) || isRetryable(res),
        error: extractError(res),
        attempts: res.attempts
    };
}

/** Signed connectivity check (GET, empty body). */
async function ping(opts = {}) {
    const start = Date.now();
    const res = await sendSigned('GET', PING_PATH, '', {}, { retry: false, ...opts });
    return {
        connected: Boolean(res.ok),
        status: res.status,
        latencyMs: Date.now() - start,
        details: res.ok ? res.data : { error: extractError(res) }
    };
}

module.exports = {
    INTAKE_PATH,
    PING_PATH,
    getConfig,
    isConfigured,
    sha256Hex,
    buildCanonical,
    signRequest,
    postIntake,
    ping,
    _sendSigned: sendSigned
};
