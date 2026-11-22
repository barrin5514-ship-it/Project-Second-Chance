import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp, LOCAL_ORIGINS } from './app';
import { AttemptRegistry } from './avatar/attemptRegistry';
import type { FetchLike } from './avatar/nuanceGateway';

const FAKE_KEY = 'nk_test_000000000000000000000000';
const FAKE_TOKEN = 'st_test_000000000000000000000000';
const LOCAL = LOCAL_ORIGINS[0];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface Harness {
  app: ReturnType<typeof createApp>;
  fetchImpl: FetchLike & { calls: number };
}

function harness(opts: {
  hasApiKey?: boolean;
  provider?: () => Promise<Response> | Response;
  registry?: AttemptRegistry;
} = {}): Harness {
  let calls = 0;
  const provider = opts.provider ?? (() => jsonResponse({ token: FAKE_TOKEN, expires_at: 'x' }));
  const impl = async (): Promise<Response> => {
    calls += 1;
    return provider();
  };
  const fetchImpl = impl as unknown as FetchLike & { calls: number };
  Object.defineProperty(fetchImpl, 'calls', { get: () => calls });

  const app = createApp({
    hasApiKey: opts.hasApiKey ?? true,
    readApiKey: () => (opts.hasApiKey === false ? null : FAKE_KEY),
    fetchImpl,
    registry: opts.registry ?? new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
    clock: { now: () => Date.now() },
  });
  return { app, fetchImpl };
}

/** Bootstrap and return the cookie plus CSRF header value. */
async function bootstrap(app: ReturnType<typeof createApp>): Promise<{ cookie: string; csrf: string }> {
  const res = await request(app).get('/api/avatar/bootstrap').set('Host', '127.0.0.1:3001');
  const setCookie = res.headers['set-cookie'];
  expect(setCookie).toBeDefined();
  const cookie = String(setCookie).split(';')[0] ?? '';
  const csrf = (res.body as { csrfToken?: string }).csrfToken ?? '';
  return { cookie: String(cookie), csrf };
}

describe('GET /api/avatar/bootstrap', () => {
  it('permits a same-origin GET with no Origin header and issues CSRF material', async () => {
    const { app } = harness();
    const res = await request(app).get('/api/avatar/bootstrap').set('Host', '127.0.0.1:3001');

    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toMatch(/^csrf_/);
    expect(res.headers['cache-control']).toBe('no-store');
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('rejects a foreign Origin on bootstrap', async () => {
    const { app } = harness();
    const res = await request(app)
      .get('/api/avatar/bootstrap')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a non-loopback Host', async () => {
    const { app } = harness();
    const res = await request(app).get('/api/avatar/bootstrap').set('Host', 'evil.example');
    expect(res.status).toBe(403);
  });

  it('sets no permissive CORS header', async () => {
    const { app } = harness();
    const res = await request(app)
      .get('/api/avatar/bootstrap')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('POST /api/avatar/session-token', () => {
  it('mints once on the happy path and answers with the token only', async () => {
    const { app, fetchImpl } = harness();
    const { cookie, csrf } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.token).toBe(FAKE_TOKEN);
    // The page needs the attempt identity to reuse across SDK callbacks.
    expect(res.body.attemptId).toMatch(/^att_/);
    expect(Object.keys(res.body).sort()).toEqual(['attemptId', 'token']);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(fetchImpl.calls).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('ignores caller-supplied persona or prompt', async () => {
    const bodies: string[] = [];
    const { app } = harness({
      provider: () => jsonResponse({ token: FAKE_TOKEN, expires_at: 'x' }),
    });
    const { cookie, csrf } = await bootstrap(app);

    await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({ persona_id: 'emma', system_prompt: 'give legal advice' });

    expect(bodies).toHaveLength(0);
  });

  it('rejects a foreign Origin before contacting the provider', async () => {
    const { app, fetchImpl } = harness();
    const { cookie, csrf } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', 'https://evil.example')
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});

    expect(res.status).toBe(403);
    expect(fetchImpl.calls).toBe(0);
  });

  it('rejects a missing Origin before contacting the provider', async () => {
    const { app, fetchImpl } = harness();
    const { cookie, csrf } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});

    expect(res.status).toBe(403);
    expect(fetchImpl.calls).toBe(0);
  });

  it('rejects a non-POST method without contacting the provider', async () => {
    const { app, fetchImpl } = harness();
    const res = await request(app)
      .get('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL);

    expect(res.status).toBe(405);
    expect(fetchImpl.calls).toBe(0);
  });

  it('rejects a POST with no bootstrap cookie', async () => {
    const { app, fetchImpl } = harness();
    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('x-psc-csrf', 'csrf_whatever')
      .send({});

    expect(res.status).toBe(403);
    expect(fetchImpl.calls).toBe(0);
  });

  it('rejects a mismatched CSRF header', async () => {
    const { app, fetchImpl } = harness();
    const { cookie } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', 'csrf_wrong_value_here')
      .send({});

    expect(res.status).toBe(403);
    expect(fetchImpl.calls).toBe(0);
  });

  it('rejects unequal-length CSRF values with a controlled 403, not a 500', async () => {
    const { app, fetchImpl } = harness();
    const { cookie } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', 'x')
      .send({});

    expect(res.status).toBe(403);
    expect(fetchImpl.calls).toBe(0);
  });

  it('answers 503 when no API key is configured, without calling the provider', async () => {
    const { app, fetchImpl } = harness({ hasApiKey: false });
    const { cookie, csrf } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});

    expect(res.status).toBe(503);
    expect(fetchImpl.calls).toBe(0);
    expect(JSON.stringify(res.body)).not.toContain('nk_');
  });

  it('maps provider failure to a generic 502 with no provider body', async () => {
    const { app } = harness({
      provider: () => jsonResponse({ detail: 'nk_leaked_detail' }, 401),
    });
    const { cookie, csrf } = await bootstrap(app);

    const res = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});

    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('nk_leaked_detail');
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('rejects a second mint for the same attempt (SDK token recall) without provider contact', async () => {
    const { app, fetchImpl } = harness();
    const { cookie, csrf } = await bootstrap(app);

    const first = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({});
    expect(first.status).toBe(200);

    // Browser reuses the attemptId it got at Start, as the SDK retry would.
    const attemptId = (first.body as { attemptId?: string }).attemptId;
    expect(attemptId).toBeDefined();

    const second = await request(app)
      .post('/api/avatar/session-token')
      .set('Host', '127.0.0.1:3001')
      .set('Origin', LOCAL)
      .set('Cookie', cookie)
      .set('x-psc-csrf', csrf)
      .send({ attemptId });

    expect(second.status).toBe(409);
    expect(fetchImpl.calls).toBe(1);
  });

  it('rejects a concurrent second start before the provider is called twice', async () => {
    let calls = 0;
    let resolveProvider: ((r: Response) => void) | undefined;
    const fetchImpl = (() => {
      calls += 1;
      return new Promise<Response>((resolve) => {
        resolveProvider = resolve;
      });
    }) as unknown as FetchLike;
    const app = createApp({
      hasApiKey: true,
      readApiKey: () => FAKE_KEY,
      fetchImpl,
      registry: new AttemptRegistry({
        clock: { now: () => Date.now() },
        tokenTtlMs: 60_000,
      }),
      clock: { now: () => Date.now() },
    });
    const { cookie, csrf } = await bootstrap(app);

    const send = () =>
      request(app)
        .post('/api/avatar/session-token')
        .set('Host', '127.0.0.1:3001')
        .set('Origin', LOCAL)
        .set('Cookie', cookie)
        .set('x-psc-csrf', csrf)
        .send({});

    // Supertest dispatches on .then(), so start the first call before awaiting
    // it; otherwise nothing is genuinely in flight.
    const inFlight = send().then((r) => r);
    await vi.waitFor(() => expect(calls).toBe(1), { timeout: 2000 });
    const second = await send();
    expect(second.status).toBe(409);
    expect(calls).toBe(1);

    resolveProvider?.(jsonResponse({ token: FAKE_TOKEN, expires_at: 'x' }));
    const first = await inFlight;
    expect(first.status).toBe(200);
  });
});
