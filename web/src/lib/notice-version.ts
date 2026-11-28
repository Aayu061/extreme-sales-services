/**
 * S12 / E1: the version of the built-in privacy notice. It is BOTH the "Last updated" date on /legal/privacy and
 * the notice version recorded with every request's consent, so the two can never drift apart again.
 * Change it only when the notice text changes (on legal approval: the approval date).
 * Kept in its own small file because the request forms (browser code) import it, and the legal text should not be
 * bundled into them.
 */
export const PRIVACY_NOTICE_VERSION = '2026-11-28';
