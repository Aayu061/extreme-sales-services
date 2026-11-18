// server/services/pysIntakeForwarder.js
// ═══════════════════════════════════════════════════════════════════════════
// Sends one ESS record to PYS through the signed intake API and records the
// outcome on the ESS record via a caller-supplied `persist(update)` callback
// (Firestore or in-memory - the forwarder does not care which).
//
// Sync fields written on the ESS record:
//   pys_sync_status      SYNCED | PENDING_SYNC (will be retried) | SYNC_FAILED (needs a human)
//   pys_intake_number    PYS intake number (also copied to pys_request_number for the admin badge)
//   pys_tracking_code    customer-facing tracking code from PYS
//   pys_idempotency_key  stable key, so every retry hits the same PYS intake
//   pys_sync_attempts, pys_last_sync_error, pys_synced_at, pys_last_attempt_at
// ═══════════════════════════════════════════════════════════════════════════

const signedClient = require('./pysSignedClient');
const mapper = require('./pysIntakeMapper');

const BUILDERS = {
    SERVICE_BOOKING: mapper.buildServiceBookingIntake,
    AMC_REQUEST: mapper.buildAmcRequestIntake,
    ENQUIRY: mapper.buildEnquiryIntake
};

// Statuses worth retrying later (cold start, overload, in-progress, key not yet set/rotated).
function isRetryableStatus(status) {
    return status === 0 || status === 401 || status === 403 || status === 408 || status === 409 ||
        status === 429 || status >= 500;
}

/**
 * @param {'SERVICE_BOOKING'|'AMC_REQUEST'|'ENQUIRY'} recordType
 * @param {object} record  stored ESS record
 * @param {(update: object) => Promise<void>|void} persist
 * @param {object} [opts]  passed to postIntake (timeoutMs, retryDelayMs, fetchImpl, env)
 */
async function syncRecord(recordType, record, persist, opts = {}) {
    const build = BUILDERS[recordType];
    if (!build) throw new Error(`Unknown record type ${recordType}`);
    const built = build(record);
    const kind = built.ok ? built.body.kind : (recordType === 'ENQUIRY' ? 'CONTACT' : recordType);
    const ref = built.ok ? built.body.externalReferenceId : (record.request_id || record.id);
    const idempotencyKey = record.pys_idempotency_key || mapper.idempotencyKeyFor(kind, ref);
    const now = new Date().toISOString();
    const attempts = (Number(record.pys_sync_attempts) || 0) + 1;

    let result;
    let update;
    if (!built.ok) {
        result = { success: false, status: 422, retryable: false, error: built.error };
    } else {
        result = await signedClient.postIntake(built.body, idempotencyKey, opts);
    }

    if (result.success) {
        update = {
            pys_sync_status: 'SYNCED',
            pys_intake_number: result.intakeNumber || '',
            pys_request_number: result.intakeNumber || '',
            pys_tracking_code: result.trackingCode || '',
            pys_intake_status: result.intakeStatus || '',
            pys_idempotency_key: idempotencyKey,
            pys_sync_attempts: attempts,
            pys_last_sync_error: '',
            pys_last_attempt_at: now,
            pys_synced_at: now
        };
    } else {
        const retryable = result.notConfigured || isRetryableStatus(Number(result.status) || 0);
        update = {
            pys_sync_status: retryable ? 'PENDING_SYNC' : 'SYNC_FAILED',
            pys_idempotency_key: idempotencyKey,
            pys_sync_attempts: attempts,
            pys_last_sync_error: String(result.error || 'Unknown error').slice(0, 300),
            pys_last_attempt_at: now
        };
    }

    try {
        await persist(update);
    } catch (err) {
        console.warn(`[PYS Intake] Could not save sync result for ${ref}:`, err.message);
    }
    if (result.success) {
        console.log(`[PYS Intake] ${kind} ${ref} -> ${update.pys_intake_number} (${result.duplicate ? 'duplicate' : 'new'})`);
    } else {
        console.warn(`[PYS Intake] ${kind} ${ref} not synced (${update.pys_sync_status}, HTTP ${result.status}): ${update.pys_last_sync_error}`);
    }
    return { ...result, update, idempotencyKey };
}

/** Resolve to the promise's value, or { timedOut: true } after `ms` (the promise keeps running). */
function withDeadline(promise, ms) {
    let timer;
    const deadline = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(timer)), deadline]);
}

module.exports = {
    isSignedMode: (env) => signedClient.isConfigured(env),
    syncRecord,
    withDeadline,
    isRetryableStatus
};
