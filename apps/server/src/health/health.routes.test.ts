import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { AttemptRegistry } from '../avatar/attemptRegistry';
import type { FetchLike } from '../avatar/nuanceGateway';

const FAKE_KEY = 'nk_test_000000000000000000000000';

function makeApp(): {
  app: ReturnType<typeof createApp>;
  providerCalls: () => number;
  readApiKey: ReturnType<typeof vi.fn>;
} {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ token: 'st_test_health_should_not_mint' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as FetchLike;
  const readApiKey = vi.fn(() => FAKE_KEY);
  const clock = { now: () => Date.now() };
  const app = createApp({
    hasApiKey: true,
    readApiKey,
    fetchImpl,
    registry: new AttemptRegistry({ clock, tokenTtlMs: 60_000 }),
    clock,
  });
  return { app, providerCalls: () => calls, readApiKey };
}

describe('GET /api/health', () => {
  it('returns exactly the fictional-demo status without provider or environment detail', async () => {
    const { app, providerCalls } = makeApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok', mode: 'fictional-demo' });
    expect(Object.keys(res.body).sort()).toEqual(['mode', 'status']);
    // The foundation health check must never touch the Mira provider.
    expect(providerCalls()).toBe(0);
    // No filesystem, environment or credential material in the body.
    expect(res.text).not.toContain(process.cwd());
    expect(res.text).not.toContain('NUANCE');
    expect(res.text).not.toContain('nk_');
    expect(res.text).not.toContain('st_');
  });

  it('answers unknown API routes with a generic JSON 404 and no request path', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/not-a-real-route');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'not-found' });
    // The default Express 404 echoes the path and is HTML; neither is wanted.
    expect(res.text).not.toContain('/api/not-a-real-route');
    expect(res.text).not.toContain(process.cwd());
    expect(res.text).not.toContain('Cannot GET');
  });
});

describe('JSON parser and framework failures', () => {
  it.each([
    {
      kind: 'malformed',
      path: '/api/health',
      method: 'get' as const,
      body: '{"synthetic-canary":"request-text-only"',
      status: 400,
      error: 'bad-request',
    },
    {
      kind: 'oversized',
      path: '/api/unknown-route',
      method: 'post' as const,
      body: JSON.stringify({ payload: 'x'.repeat(2048) }),
      status: 413,
      error: 'payload-too-large',
    },
  ])(
    'keeps a $kind JSON body as a generic JSON error without stack paths or request text',
    async ({ path, method, body, status, error }) => {
      const { app, providerCalls, readApiKey } = makeApp();
      const agent = method === 'get' ? request(app).get(path) : request(app).post(path);
      const res = await agent.set('Content-Type', 'application/json').send(body);

      expect(res.status).toBe(status);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ error });
      // The default Express/body-parser handler is HTML and includes a
      // SyntaxError stack with absolute local paths. None of that may escape.
      expect(res.text).not.toMatch(
        /SyntaxError|node_modules|request-text-only|synthetic-canary|payload-too-large canary/i,
      );
      expect(res.text).not.toContain(process.cwd());
      expect(res.text).not.toContain('at ');
      // Parsing must fail before configuration or provider access.
      expect(readApiKey).not.toHaveBeenCalled();
      expect(providerCalls()).toBe(0);
    },
  );
});
