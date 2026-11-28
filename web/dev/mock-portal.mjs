// Customer accounts (S11 / S11b) for the mock PYS, so /account can be used on a PC.
// Sign in with asha@example.com and the code 123456 (any other email gets the same 202, and no code works for it).
// Answers come from dev/fixtures/portal.json, made from tests/helpers/portal-fixtures.ts (the same sample data as the
// screen tests). Behaves like PYS for the parts the website reacts to: 401 SESSION_ENDED, 404 with details.portal,
// 409 NOT_RENEWABLE never (renewal always works), 429 never.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('./fixtures/portal.json', import.meta.url), 'utf8'));
const EMAIL = 'asha@example.com';
const CODE = '123456';
const sessions = new Set();
let renewals = 0;
let changes = 0;

const NOT_FOUND = { code: 'NOT_FOUND', message: 'We could not find that.', details: { portal: true } };

/** Handles /portal/*; returns false for any other path. `ok(res, data, status)` and `fail(res, status, code, message, details)`. */
export function portalRoute(req, res, path, url, body, ok, fail) {
  if (!path.startsWith('/portal/')) return false;
  const send = (data, status = 200) => (ok(res, data, status), true);
  const refuse = (status, e) => (fail(res, status, e.code, e.message, e.details), true);
  const input = () => {
    try {
      return JSON.parse(body || '{}');
    } catch {
      return {};
    }
  };

  if (req.method === 'GET' && path === '/portal/status') return send({ enabled: true });
  if (req.method === 'POST' && path === '/portal/code') {
    if (String(input().email ?? '').trim().toLowerCase() === EMAIL) console.log(`[mock portal] sign-in code for ${EMAIL}: ${CODE}`);
    return send({ sent: true }, 202);
  }
  if (req.method === 'POST' && path === '/portal/sign-in') {
    const { email, code } = input();
    if (String(email ?? '').trim().toLowerCase() !== EMAIL || String(code ?? '').trim() !== CODE) {
      return refuse(401, { code: 'CODE_REJECTED', message: 'That code is not right or has expired. Ask for a new code.' });
    }
    const token = randomBytes(32).toString('base64url');
    sessions.add(token);
    return send({ token, expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() });
  }

  const token = String(req.headers['x-pys-customer-session'] ?? '');
  if (req.method === 'POST' && path === '/portal/sign-out') {
    sessions.delete(token);
    return send({ signedOut: true });
  }
  if (!sessions.has(token)) return refuse(401, { code: 'SESSION_ENDED', message: 'Please sign in again.' });

  const id = (prefix) => (path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : null);
  if (req.method === 'POST' && path === '/portal/sign-out-all') {
    sessions.clear();
    return send({ signedOut: true });
  }
  if (req.method === 'POST' && path === '/portal/profile/change-request') {
    const message = String(input().message ?? '').trim();
    if (message.length < 5 || message.length > 1000) return refuse(400, { code: 'INVALID_INPUT', message: 'Please write between 5 and 1000 characters.' });
    changes += 1;
    return send({ requested: true, reference: `ESS-CHNG-DEV${changes}` }, 201);
  }
  const renewId = path.match(/^\/portal\/amc\/([^/]+)\/renew$/)?.[1];
  if (req.method === 'POST' && renewId) {
    if (decodeURIComponent(renewId) !== DATA.amcDetail.contract.id) return refuse(404, NOT_FOUND);
    renewals += 1;
    const already = renewals > 1;
    return send({ requested: true, reference: 'ESS-RNEW-DEV1', alreadyRequested: already }, already ? 200 : 201);
  }
  if (req.method !== 'GET') return refuse(404, NOT_FOUND);

  if (path === '/portal/me') return send({ customer: DATA.overview.customer, acs: [], amc: [], requests: [] });
  if (path === '/portal/overview') return send(DATA.overview);
  if (path === '/portal/acs') return send(DATA.acs);
  if (path === '/portal/amc') return send(DATA.amcList);
  if (path === '/portal/requests') return send(DATA.requests);
  if (path === '/portal/billing') return send(DATA.billing);
  const byId = [
    ['/portal/acs/', DATA.acDetail, (d) => d.ac.id],
    ['/portal/amc/', DATA.amcDetail, (d) => d.contract.id],
    ['/portal/requests/', DATA.requestDetail, (d) => d.request.number],
    ['/portal/reports/', DATA.report, (d) => d.report.number],
    ['/portal/billing/', DATA.bill, (d) => d.bill.number],
  ];
  for (const [prefix, data, key] of byId) {
    const ref = id(prefix);
    if (ref !== null) return ref === key(data) ? send(data) : refuse(404, NOT_FOUND);
  }
  return refuse(404, NOT_FOUND);
}
