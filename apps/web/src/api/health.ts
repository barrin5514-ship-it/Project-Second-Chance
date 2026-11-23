export interface HealthResponse {
  readonly status: 'ok';
  readonly mode: 'fictional-demo';
}

export const HEALTH_URL = '/api/health';

/** Bounded budget for the whole check, including reading the JSON body. */
export const HEALTH_TIMEOUT_MS = 8_000;

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['status'] === 'ok' && record['mode'] === 'fictional-demo';
}

/**
 * Reads the same-origin foundation health contract.
 *
 * A non-2xx answer, unreadable body, any shape other than the exact
 * fictional-demo contract, or a request that stalls past `HEALTH_TIMEOUT_MS`
 * rejects. The timer stays armed through body reading; a stalled response
 * therefore becomes an actionable unavailable state instead of "Checking"
 * forever.
 */
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, HEALTH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(HEALTH_URL, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('health request failed');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(
        timedOut ? 'health request timed out' : 'health response was not valid JSON',
      );
    }

    if (!isHealthResponse(body)) {
      throw new Error('health response did not match the contract');
    }
    return body;
  } catch (error) {
    // A fetch abort surfaces as AbortError/DOMException; report the timeout
    // consistently without exposing the underlying exception.
    if (timedOut) throw new Error('health request timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
