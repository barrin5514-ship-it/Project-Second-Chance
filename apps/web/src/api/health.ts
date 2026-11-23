export interface HealthResponse {
  readonly status: 'ok';
  readonly mode: 'fictional-demo';
}

export const HEALTH_URL = '/api/health';

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['status'] === 'ok' && record['mode'] === 'fictional-demo';
}

/**
 * Reads the same-origin foundation health contract.
 *
 * A non-2xx answer, unreadable body or any shape other than the exact
 * fictional-demo contract rejects. Callers show "unavailable" rather than
 * treating an unexpected response as healthy.
 */
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(HEALTH_URL, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('health request failed');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('health response was not valid JSON');
  }

  if (!isHealthResponse(body)) {
    throw new Error('health response did not match the contract');
  }
  return body;
}
