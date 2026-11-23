import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './health';

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl);
  vi.stubGlobal('fetch', mock);
  return mock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchHealth', () => {
  it('returns the validated fictional-demo response from the same origin', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse({ status: 'ok', mode: 'fictional-demo' }),
    );

    await expect(fetchHealth()).resolves.toEqual({ status: 'ok', mode: 'fictional-demo' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/health');
    expect(init.credentials).toBe('same-origin');
    expect(init.cache).toBe('no-store');
  });

  it('rejects a non-200 response without claiming the API is ready', async () => {
    stubFetch(async () => jsonResponse({ error: 'unavailable' }, 503));
    await expect(fetchHealth()).rejects.toThrow(/health/i);
  });

  it('rejects a body that is not JSON', async () => {
    stubFetch(async () => new Response('<html>not json</html>', { status: 200 }));
    await expect(fetchHealth()).rejects.toThrow(/health/i);
  });

  it('rejects a JSON body with the wrong contract', async () => {
    stubFetch(async () => jsonResponse({ status: 'ok', mode: 'production' }));
    await expect(fetchHealth()).rejects.toThrow(/health/i);
  });
});
