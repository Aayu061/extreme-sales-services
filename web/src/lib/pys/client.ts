import 'server-only';
import { pysLinkConfigured, serverEnv } from '@/lib/env';
import { signRequest } from './signature';

/**
 * Server-only client for the signed PYS API. The browser never talks to PYS: pages and server
 * actions call this, so the ESS key never leaves the server.
 *
 * PYS runs on Render's free plan and can take ~50 s to wake up, so reads use a long timeout and
 * one retry on network/5xx errors. Writes are only retried when they carry an Idempotency-Key.
 */

export class PysError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PysError';
  }
}

export class PysNotConfiguredError extends PysError {
  constructor() {
    super(503, 'PYS_LINK_NOT_CONFIGURED', 'The connection to PYS is not configured on this server.');
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PysRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Extra attempts after the first (network errors and 5xx/408/429 only). */
  retries?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 2_000;
const API_PREFIX = '/api/v1/ess';

const retryable = (status: number) => status >= 500 || status === 408 || status === 429;
/** PYS answers 409 REQUEST_IN_PROGRESS while it is still storing the same idempotent write. */
const inProgress = (e: PysError) => e.status === 409 && e.code === 'REQUEST_IN_PROGRESS';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pysRequest<T>(method: Method, path: string, opts: PysRequestOptions = {}): Promise<T> {
  const env = serverEnv();
  if (!pysLinkConfigured(env)) throw new PysNotConfiguredError();

  const pathWithQuery = `${API_PREFIX}${path}`;
  const body = opts.body === undefined ? '' : JSON.stringify(opts.body);
  const canRetry = method === 'GET' || Boolean(opts.headers?.['Idempotency-Key']);
  const attempts = 1 + (canRetry ? (opts.retries ?? 1) : 0);
  const doFetch = opts.fetchImpl ?? fetch;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Fresh timestamp + nonce per attempt: PYS refuses a replayed nonce.
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...signRequest({
        keyId: env.PYS_INTEGRATION_KEY_ID!,
        secret: env.PYS_INTEGRATION_SECRET!,
        method,
        pathWithQuery,
        body,
      }),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const res = await doFetch(`${env.PYS_API_URL}${pathWithQuery}`, {
        method,
        headers,
        body: body || undefined,
        signal: controller.signal,
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: T; error?: { code?: string; message?: string; details?: unknown } }
        | null;
      if (res.ok && json?.success !== false) return json?.data as T;

      const err = new PysError(
        res.status,
        json?.error?.code ?? `HTTP_${res.status}`,
        json?.error?.message ?? `PYS answered ${res.status}`,
        json?.error?.details,
      );
      if (!(retryable(res.status) || (canRetry && inProgress(err))) || attempt === attempts) throw err;
      lastError = err;
    } catch (err) {
      if (err instanceof PysError && !retryable(err.status) && !(canRetry && inProgress(err))) throw err;
      lastError = err;
      if (attempt === attempts) break;
    } finally {
      clearTimeout(timer);
    }
    await sleep(RETRY_DELAY_MS * attempt);
  }
  if (lastError instanceof PysError) throw lastError;
  throw new PysError(503, 'PYS_UNREACHABLE', 'PYS could not be reached. Please try again in a minute.');
}
