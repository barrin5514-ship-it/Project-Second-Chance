import { randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'psc_sid';
export const CSRF_HEADER = 'x-psc-csrf';

/** Loopback hostnames only. Port checking is the caller's concern. */
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function randomId(prefix: string): string {
  return `${prefix}${randomBytes(24).toString('base64url')}`;
}

/**
 * True when the request's Host header names a loopback hostname. Used for the
 * bootstrap GET, which browsers send with no Origin header. Derived from the
 * hostname itself rather than the browser origin allowlist, so the API's own
 * port is accepted while non-loopback hosts and lookalikes are not.
 */
export function isLoopbackHost(host: string | undefined): boolean {
  if (typeof host !== 'string' || host.length === 0) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
      } catch {
    return false;
      }
  return LOOPBACK_HOSTNAMES.has(hostname);
}

/** Bootstrap GET: a missing Origin is the normal same-origin case. */
export function originAllowedForBootstrap(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined) return true;
  return isExactAllowedOrigin(origin, allowedOrigins);
}

/** Token POST: strict. A missing Origin is never acceptable for a state change. */
export function originAllowedForPost(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined) return false;
  return isExactAllowedOrigin(origin, allowedOrigins);
}

function isExactAllowedOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  if (origin === 'null') return false;
  return allowedOrigins.includes(origin);
}

/**
 * Constant-time comparison with an explicit length guard, so unequal-length
 * input is a controlled rejection rather than a throw from timingSafeEqual.
 */
export function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function issueSession(): { sessionId: string; csrfToken: string } {
  return { sessionId: randomId('sid_'), csrfToken: randomId('csrf_') };
}

