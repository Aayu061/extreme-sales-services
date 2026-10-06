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

function validateServiceType(serviceType) {
    if (!serviceType || typeof serviceType !== 'string') return false;
    const clean = serviceType.replace(' [✅ AMC Covered]', '').trim().toLowerCase();
    return ALLOWED_SERVICE_TYPES.some(allowed => clean.includes(allowed.toLowerCase()));
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
    isValidStatusTransition,
    generateSecureRequestId,
    validateProductInput
};
