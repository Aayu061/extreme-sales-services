// server/middleware/security.js
// Centralized Security, Rate Limiting, Input Validation & State Machine Validation

// In-Memory Rate Limiter (Sliding Window per IP)
function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 mins default
    const maxRequests = options.max || 100;
    const message = options.message || 'Too many requests. Please try again later.';
    const ipHits = new Map(); // ip -> Array of timestamps

    // Cleanup stale entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of ipHits.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                ipHits.delete(ip);
            } else {
                ipHits.set(ip, valid);
            }
        }
    }, 5 * 60 * 1000).unref();

    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] 
            ? req.headers['x-forwarded-for'].split(',')[0].trim() 
            : (req.socket.remoteAddress || '127.0.0.1');

        const now = Date.now();
        const timestamps = ipHits.get(ip) || [];
        const windowTimestamps = timestamps.filter(t => now - t < windowMs);

        if (windowTimestamps.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message,
                retryAfterSeconds: Math.ceil((windowTimestamps[0] + windowMs - now) / 1000)
            });
        }

        windowTimestamps.push(now);
        ipHits.set(ip, windowTimestamps);
        next();
    };
}

// Specialized Rate Limiters
const loginLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many login attempts. Please wait 5 minutes before trying again.'
});

const bookingLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    message: 'Too many booking submissions. Please try again in 10 minutes.'
});

const enquiryLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Too many enquiries submitted from this IP. Please try again later.'
});

const feedbackLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Too many feedback submissions. Please try again later.'
});

const diagnosticsLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 40,
    message: 'Too many diagnostics queries. Please wait a few minutes.'
});

// Input Validation Functions
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.replace(/[\s\-\+]/g, '');
    // Support Indian 10-digit mobile numbers with optional leading 0 or +91 / 91
    return /^(?:0|(?:\+|0{0,2})91)?[6-9]\d{9}$/.test(clean);
}

function cleanPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.substring(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
        return digits.substring(1);
    }
    return digits.slice(-10);
}

function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
}

function validateAddress(address) {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    return trimmed.length >= 3 && trimmed.length <= 300;
}

const ALLOWED_SERVICE_TYPES = [
    'AC Repair',
    'Servicing',
    'Installation',
    'Gas Refill',
    'AMC Visit',
    'Uninstallation',
    'repair',
    'service',
    'installation',
    'gas',
    'jet_wash'
];

// Exact option values sent by the booking form (public/service.html).
const BOOKING_FORM_SERVICE_CODES = [
    'pm_dry',
    'pm_jet',
    'pm_chemical',
    'diagnostic_cooling',
    'water_leakage',
    'gas_refill',
    'pcb_repair',
    'compressor_issue',
    'fan_noise',
    'electrical_trip',
    'installation',
    'uninstallation'
];

function validateServiceType(serviceType) {
    if (!serviceType || typeof serviceType !== 'string') return false;
    const clean = serviceType.replace(' [✅ AMC Covered]', '').trim().toLowerCase();
    if (BOOKING_FORM_SERVICE_CODES.includes(clean)) return true;
    return ALLOWED_SERVICE_TYPES.some(allowed => clean.includes(allowed.toLowerCase()));
}

// ── Privacy consent (public customer forms) ─────────────────────────────────
// Bump this date whenever public/privacy.html changes in a way customers must re-accept.
const PRIVACY_NOTICE_VERSION = '2026-11-19';
const CONSENT_REQUIRED_MESSAGE = 'Please tick the box to agree to the Privacy Notice so we can handle your request.';

function isTicked(value) {
    return value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
}

/**
 * Reads consent from a public form submission. Accepts flat fields
 * (consent_privacy / consent_marketing, or camelCase) or a nested { consent: { privacy, marketing } }.
 * Returns { ok: false, message } when privacy consent is not given, otherwise the
 * fields to store on the record.
 */
function readConsent(body) {
    const b = body || {};
    const nested = (b.consent && typeof b.consent === 'object') ? b.consent : {};
    const privacy = isTicked(b.consent_privacy) || isTicked(b.consentPrivacy) || isTicked(nested.privacy);
    if (!privacy) return { ok: false, message: CONSENT_REQUIRED_MESSAGE };
    const marketing = isTicked(b.consent_marketing) || isTicked(b.consentMarketing) || isTicked(nested.marketing);
    return {
        ok: true,
        fields: {
            consent_privacy: true,
            consent_marketing: marketing,
            consent_at: new Date().toISOString(),
            privacy_notice_version: PRIVACY_NOTICE_VERSION
        }
    };
}

// Legal Lifecycle State Transitions
const LEGAL_TRANSITIONS = {
    'Pending': ['Assigned', 'Cancelled'],
    'Assigned': ['In Progress', 'Pending', 'Cancelled'],
    'In Progress': ['Completed', 'Assigned', 'Cancelled'],
    'Completed': [], // Terminal
    'Cancelled': []  // Terminal
};

function isValidStatusTransition(currentStatus, nextStatus, userRole = '') {
    if (currentStatus === nextStatus) return true;
    // Admin override capability
    if (userRole === 'admin') return true;

    const allowed = LEGAL_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(nextStatus);
}

// Collision-Resistant Request ID Generator (e.g. AC-20261002-8F2B7K)
function generateSecureRequestId() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous set (32^6 = >1 billion space)
    let suffix = '';
    for (let i = 0; i < 6; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `AC-${yyyy}${mm}${dd}-${suffix}`;
}

// Product Field Validator
function validateProductInput(body) {
    const errors = [];
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters long.');
    }
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 10000000) {
        errors.push('Product price must be a valid positive number.');
    }
    const stock = Number(body.stock !== undefined ? body.stock : (body.quantity !== undefined ? body.quantity : 0));
    if (!Number.isFinite(stock) || stock < 0 || stock > 100000) {
        errors.push('Product stock must be a valid non-negative integer.');
    }
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedPrice: price,
        sanitizedStock: Math.floor(stock)
    };
}

// Global XSS Sanitization Helper
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = {
    createRateLimiter,
    loginLimiter,
    bookingLimiter,
    enquiryLimiter,
    feedbackLimiter,
    diagnosticsLimiter,
    validatePhone,
    cleanPhone,
    validateEmail,
    validateName,
    validateAddress,
    validateServiceType,
    BOOKING_FORM_SERVICE_CODES,
    PRIVACY_NOTICE_VERSION,
    CONSENT_REQUIRED_MESSAGE,
    readConsent,
    isValidStatusTransition,
    generateSecureRequestId,
    validateProductInput,
    escapeHtml
};
