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
  vi.useRealTimers();
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
    expect(init.signal).toBeInstanceOf(AbortSignal);
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

  it('aborts a request that never returns headers and reports a timeout', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('synthetic abort'), { name: 'AbortError' })),
            { once: true },
          );
        }),
    );

    const pending = fetchHealth();
    const rejected = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts a body that never completes and reports a timeout', async () => {
    vi.useFakeTimers();
    stubFetch(async (_input, init) => {
      return {
        ok: true,
        status: 200,
        json: () =>
          new Promise<unknown>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(Object.assign(new Error('synthetic abort'), { name: 'AbortError' })),
              { once: true },
            );
          }),
      } as Response;
    });

    const pending = fetchHealth();
    const rejected = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
  });
});
