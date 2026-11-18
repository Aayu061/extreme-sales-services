// server/services/pysIntakeMapper.js
// ═══════════════════════════════════════════════════════════════════════════
// Pure mapping from ESS records (bookings, AMC requests, enquiries) to the
// PYS ESS intake contract (POST /api/v1/ess/intakes). No I/O here.
// Optional fields are omitted when unknown (never sent as null).
// ═══════════════════════════════════════════════════════════════════════════

// ESS booking option / service label -> PYS catalog code.
const SERVICE_CODE_MAP = {
    // Exact option values from public/service.html
    pm_dry: 'SVC-DRY',
    pm_jet: 'SVC-JET-WASH',
    pm_chemical: 'SVC-FOAM',
    diagnostic_cooling: 'SVC-DIAG',
    water_leakage: 'SVC-DIAG',
    gas_refill: 'SVC-GAS',
    pcb_repair: 'SVC-PCB',
    compressor_issue: 'SVC-COMP',
    fan_noise: 'SVC-FAN',
    electrical_trip: 'SVC-ELEC',
    installation: 'SVC-INSTALL',
    uninstallation: 'SVC-UNINSTALL',
    // Legacy / free-text labels still accepted by validateServiceType
    'ac repair': 'SVC-DIAG',
    repair: 'SVC-DIAG',
    servicing: 'SVC-JET-WASH',
    service: 'SVC-JET-WASH',
    jet_wash: 'SVC-JET-WASH',
    'jet wash': 'SVC-JET-WASH',
    'gas refill': 'SVC-GAS',
    gas: 'SVC-GAS',
    pumpdown: 'SVC-PUMPDOWN',
    'pump down': 'SVC-PUMPDOWN',
    capacitor: 'SVC-CAP'
};

const CATALOG_CODES = new Set([
    'SVC-DRY', 'SVC-JET-WASH', 'SVC-FOAM', 'SVC-PUMPDOWN', 'SVC-GAS', 'SVC-INSTALL', 'SVC-UNINSTALL',
    'SVC-DIAG', 'SVC-PCB', 'SVC-CAP', 'SVC-FAN', 'SVC-COMP', 'SVC-ELEC'
]);
const AMC_CODES = new Set(['SAMC-1', 'SAMC-2', 'SAMC-3', 'ORD-3', 'ORD-4', 'ORD-6', 'JKT-2', 'JKT-3']);
const AC_TYPES = ['SPLIT', 'WINDOW', 'CASSETTE', 'TOWER', 'DUCTABLE', 'VRF'];

const AMC_MARKER = ' [✅ AMC Covered]';

function clean(value, max) {
    if (value === undefined || value === null) return '';
    const s = String(value).replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
}

/** 10-digit Indian mobile (6-9 start) or '' when it cannot be normalised. */
function normalizeIndianMobile(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function normalizeEmail(email) {
    const e = clean(email, 254).toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

function mapServiceCode(serviceType) {
    const key = clean(serviceType).replace(AMC_MARKER.trim(), '').trim().toLowerCase();
    if (!key) return undefined;
    if (SERVICE_CODE_MAP[key]) return SERVICE_CODE_MAP[key];
    const upper = key.toUpperCase();
    if (CATALOG_CODES.has(upper)) return upper;
    return undefined;
}

/** "SAMC 1", "amc-samc-1", "Ordinary 4 Services...", "2 Jacket Service..." -> public AMC code. */
function mapAmcPlanCode(...candidates) {
    for (const candidate of candidates) {
        const s = clean(candidate).toLowerCase();
        if (!s) continue;
        let m = s.match(/\bsamc[\s_-]*([1-3])\b/);
        if (m) return `SAMC-${m[1]}`;
        m = s.match(/\b(?:ord|ordinary)[\s_-]*([346])\b/);
        if (m) return `ORD-${m[1]}`;
        m = s.match(/\b(?:jkt|jacket)[\s_-]*([23])\b/) || s.match(/\b([23])[\s_-]*jacket\b/);
        if (m) return `JKT-${m[1]}`;
        const upper = s.toUpperCase();
        if (AMC_CODES.has(upper)) return upper;
    }
    return undefined;
}

/** One-off plans sold on the AMC page that are really catalog services. */
function mapAmcPlanToServiceCode(...candidates) {
    for (const candidate of candidates) {
        const s = clean(candidate).toLowerCase();
        if (/pump[\s_-]*down/.test(s)) return 'SVC-PUMPDOWN';
        if (/jet[\s_-]*wash/.test(s)) return 'SVC-JET-WASH';
    }
    return undefined;
}

function parseAcType(value) {
    const s = clean(value).toUpperCase();
    if (!s) return undefined;
    if (s.includes('VRV') || s.includes('VRF')) return 'VRF';
    if (s.includes('DUCT')) return 'DUCTABLE';
    for (const t of AC_TYPES) {
        if (s.includes(t)) return t;
    }
    return undefined;
}

/** "1.5", "1.5T", "3.0+", "0.8_1.0" (range -> upper bound) -> number in (0, 50]. */
function parseTonnage(value) {
    if (typeof value === 'number') return value > 0 && value <= 50 ? value : undefined;
    const nums = (clean(value).match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0 && n <= 50);
    return nums.length ? Math.max(...nums) : undefined;
}

function parseBrand(value) {
    const s = clean(value, 60);
    if (!s || /^other/i.test(s)) return undefined;
    return s;
}

/** "Morning (9 AM - 12 PM)" -> MORNING, etc. */
function parseSlot(value) {
    const s = clean(value).toLowerCase();
    if (s.startsWith('morning')) return 'MORNING';
    if (s.startsWith('afternoon')) return 'AFTERNOON';
    if (s.startsWith('evening')) return 'EVENING';
    return undefined;
}

function parsePreferredDate(value) {
    const m = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return undefined;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}`) return undefined;
    return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Pull "[Slot: ...] [Brand: ...] [1.5T]" hints that service.js embeds in the message. */
function parseMessageHints(message) {
    const s = String(message || '');
    const slot = (s.match(/\[Slot:\s*([^\]]+)\]/i) || [])[1];
    const brand = (s.match(/\[Brand:\s*([^\]]+)\]/i) || [])[1];
    const tons = (s.match(/\[(\d+(?:\.\d+)?)\s*\+?\s*T\]/i) || [])[1];
    return { slot, brand, tons };
}

const KNOWN_CITIES = ['Navi Mumbai', 'Thane', 'Kalyan', 'Dombivli', 'Mira Road', 'Bhayandar', 'Vasai', 'Virar', 'Panvel', 'Mumbai'];

/** ESS keeps one free-text address; PYS wants { line, city, pincode? }. ESS serves Mumbai, so city defaults to Mumbai. */
function parseAddress(value) {
    const line = clean(value, 300);
    if (line.length < 3) return undefined;
    const lower = line.toLowerCase();
    const city = KNOWN_CITIES.find((c) => lower.includes(c.toLowerCase())) || 'Mumbai';
    const pincode = (line.match(/\b([1-9]\d{5})\b/) || [])[1];
    const address = { line, city };
    if (pincode) address.pincode = pincode;
    return address;
}

function buildContact(name, phone, email) {
    const contact = { name: clean(name, 100), phone: normalizeIndianMobile(phone) };
    const e = normalizeEmail(email);
    if (e) contact.email = e;
    return contact;
}

function compact(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
            const inner = compact(v);
            if (Object.keys(inner).length) out[k] = inner;
            continue;
        }
        out[k] = v;
    }
    return out;
}

// Records saved before the privacy-consent checkbox existed (ESS forms before
// notice version 2026-11-19) carry no consent fields at all. Some of them are
// still PENDING_SYNC and get re-sent by the retry sweep / admin "forward" button.
// Decision: keep the old behaviour for those records only -- send privacy: true
// (the customer submitted the form to get exactly this request handled) but mark
// it with noticeVersion 'LEGACY_IMPLIED' so PYS can tell it apart from explicit
// consent. Marketing is never implied, so it is omitted (PYS stores false).
const LEGACY_NOTICE_VERSION = 'LEGACY_IMPLIED';

/** consent block for PYS from the record's stored consent fields. */
function consentFromRecord(record) {
    const r = record || {};
    const hasConsentFields = (r.consent_privacy !== undefined && r.consent_privacy !== null)
        || Boolean(r.privacy_notice_version);
    if (!hasConsentFields) {
        return { ok: true, consent: { privacy: true, noticeVersion: LEGACY_NOTICE_VERSION } };
    }
    if (r.consent_privacy !== true) {
        return { ok: false, error: 'Customer did not give privacy consent; this record cannot be sent to PYS.' };
    }
    const consent = { privacy: true, marketing: r.consent_marketing === true };
    const version = clean(r.privacy_notice_version, 40);
    if (version) consent.noticeVersion = version;
    return { ok: true, consent };
}

function finalize(intake, record) {
    const body = compact(intake);
    const consent = consentFromRecord(record);
    if (!consent.ok) return { ok: false, error: consent.error };
    body.consent = consent.consent;
    if (!body.contact || !body.contact.name || body.contact.name.length < 2 || !body.contact.phone) {
        return { ok: false, error: 'A valid name and 10-digit Indian mobile number are required for PYS intake.' };
    }
    return { ok: true, body };
}

/**
 * ESS service booking -> SERVICE_BOOKING intake.
 * Accepts the stored record (snake_case) plus optional extra form fields.
 */
function buildServiceBookingIntake(booking) {
    const b = booking || {};
    const rawService = clean(b.service_code || b.serviceType || b.service_type).replace(AMC_MARKER.trim(), '').trim();
    const hints = parseMessageHints(b.issue_description || b.message);
    const serviceCode = mapServiceCode(rawService);
    const brand = parseBrand(b.ac_brand || b.brand || hints.brand);
    const tonnage = parseTonnage(b.ac_tonnage || b.tons || b.tonnage || hints.tons);
    // The booking form has no AC-type field; only send a type when one was recorded.
    const acType = parseAcType(b.ac_type);

    let message = clean(b.issue_description || b.message || b.description, 1000);
    if (!serviceCode && rawService) message = clean(`Service requested: ${rawService}. ${message}`, 1000);
    if (/AMC Covered/.test(String(b.service_type || ''))) message = clean(`${message} [Customer has an active ESS AMC]`, 1000);

    return finalize({
        kind: 'SERVICE_BOOKING',
        externalReferenceId: clean(b.request_id || b.id, 100),
        contact: buildContact(b.name, b.phone, b.email),
        address: parseAddress(b.address),
        ac: { type: acType, brand, tonnage },
        request: {
            serviceCode,
            message,
            preferredDate: parsePreferredDate(b.preferred_date || b.preferredDate),
            preferredSlot: parseSlot(b.time_slot || b.timeSlot || hints.slot)
        }
    }, b);
}

/** ESS AMC purchase -> AMC_REQUEST intake. */
function buildAmcRequestIntake(sub) {
    const s = sub || {};
    const amcPlanCode = mapAmcPlanCode(s.plan_code, s.plan_id, s.plan_name);
    const serviceCode = amcPlanCode ? undefined : mapAmcPlanToServiceCode(s.plan_id, s.plan_name);
    const acTypeRaw = clean(s.ac_type).toLowerCase();
    const parts = [
        `AMC request: ${clean(s.plan_name, 150) || 'plan not specified'}`,
        s.price ? `Quoted price: Rs ${Number(s.price) || 0}` : null,
        s.remaining_services ? `Visits per year: ${s.remaining_services}` : null,
        acTypeRaw === 'both' ? 'AC type: split & window' : null
    ].filter(Boolean);

    return finalize({
        kind: 'AMC_REQUEST',
        externalReferenceId: clean(s.id, 100),
        contact: buildContact(s.customer_name || s.name, s.phone, s.email),
        address: parseAddress(s.address),
        ac: { type: parseAcType(acTypeRaw), tonnage: parseTonnage(s.tonnage) },
        request: { amcPlanCode, serviceCode, message: clean(parts.join('. '), 1000) }
    }, s);
}

/** ESS enquiry -> PRODUCT_ENQUIRY (product page) or CONTACT (contact page). */
function buildEnquiryIntake(enq) {
    const e = enq || {};
    const isProduct = Boolean(e.product_id && e.product_id !== 'general');
    const serviceCode = mapServiceCode(e.serviceType || e.service_type);
    const parts = [
        isProduct ? `Product: ${clean(e.product_name, 150)}` : (e.subject ? `Subject: ${clean(e.subject, 150)}` : null),
        clean(e.message, 900)
    ].filter(Boolean);

    return finalize({
        kind: isProduct ? 'PRODUCT_ENQUIRY' : 'CONTACT',
        externalReferenceId: clean(e.id, 100),
        contact: buildContact(e.name, e.phone, e.email),
        request: { serviceCode, message: clean(parts.join(' | '), 1000) }
    }, e);
}

const IDEMPOTENCY_PREFIX = {
    SERVICE_BOOKING: 'ess-booking-',
    AMC_REQUEST: 'ess-amc-',
    PRODUCT_ENQUIRY: 'ess-enquiry-',
    CONTACT: 'ess-enquiry-'
};

/** Stable per record: re-forwarding the same record never creates a duplicate in PYS. */
function idempotencyKeyFor(kind, externalReferenceId) {
    const ref = String(externalReferenceId || '').replace(/[^A-Za-z0-9_.:-]/g, '-');
    return `${IDEMPOTENCY_PREFIX[kind] || 'ess-'}${ref}`.slice(0, 200);
}

module.exports = {
    SERVICE_CODE_MAP,
    normalizeIndianMobile,
    mapServiceCode,
    mapAmcPlanCode,
    mapAmcPlanToServiceCode,
    parseAcType,
    parseTonnage,
    parseBrand,
    parseSlot,
    parsePreferredDate,
    parseMessageHints,
    parseAddress,
    buildServiceBookingIntake,
    buildAmcRequestIntake,
    buildEnquiryIntake,
    consentFromRecord,
    LEGACY_NOTICE_VERSION,
    idempotencyKeyFor
};
