import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createAvatarConnection, type ConversationLike } from './connection';
import { createHttpTokenAdapter, type TokenTransport } from './tokenAdapter';
import { createApp } from '../../../server/src/app';
import { AttemptRegistry } from '../../../server/src/avatar/attemptRegistry';

/**
 * Integration across the REAL browser token adapter, the REAL connection
 * wrapper and the REAL server app. Only the provider network call is replaced,
 * and every credential is synthetic. This is the path Codex found unverified:
 * the production adapter, not an injected fake.
 */

const FAKE_KEY = 'nk_test_000000000000000000000000';
const FAKE_TOKEN = 'st_test_000000000000000000000000';
const LOCAL = 'http://127.0.0.1:5173';

interface Harness {
  app: Express;
  providerCalls: { count: number };
  /** Counts POSTs that reached the token route (cache hits must not). */
  tokenPosts: { count: number };
  /** Browser-like kept credentials, for assertions made as the same session. */
  credentials: { cookie: string; csrf: string };
}

function buildServer(options: { tokenTtlMs?: number; clock?: { now(): number } } = {}): Harness {
  const providerCalls = { count: 0 };
  const app = createApp({
    hasApiKey: true,
    readApiKey: () => FAKE_KEY,
    fetchImpl: (async () => {
      providerCalls.count += 1;
      return new Response(JSON.stringify({ token: FAKE_TOKEN, expires_at: '2026-11-23T00:01:00Z' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as never,
    registry: new AttemptRegistry({
      clock: options.clock ?? { now: () => Date.now() },
      tokenTtlMs: options.tokenTtlMs ?? 60_000,
    }),
    clock: options.clock ?? { now: () => Date.now() },
  });
  return { app, providerCalls, tokenPosts: { count: 0 }, credentials: { cookie: '', csrf: '' } };
}

/**
 * A transport that behaves like the browser: it keeps the HttpOnly session
 * cookie and replays the CSRF value the way App.tsx's fetch transport does.
 */
function makeTransport(harness: Harness): TokenTransport {
  const kept = harness.credentials;
  return {
    async get(url) {
      const res = await request(harness.app).get(url).set('Host', '127.0.0.1:5173');
      const setCookie = res.headers['set-cookie'];
      if (Array.isArray(setCookie) && setCookie.length > 0) {
        kept.cookie = String(setCookie[0]).split(';')[0] ?? '';
      }
      const body = res.body as { csrfToken?: string };
      if (typeof body.csrfToken === 'string') kept.csrf = body.csrfToken;
      return { ok: res.status === 200, status: res.status, json: async () => res.body };
    },
    async post(url, body) {
      if (url.endsWith('/session-token')) harness.tokenPosts.count += 1;
      const res = await request(harness.app)
        .post(url)
        .set('Host', '127.0.0.1:5173')
        .set('Origin', LOCAL)
        .set('Cookie', kept.cookie)
        .set('x-psc-csrf', kept.csrf)
        .send(body as object);
      return { ok: res.status === 200, status: res.status, json: async () => res.body };
    },
  };
}

/**
 * A fake SDK that calls token() on every connect attempt, the way the real
 * SDK does on each internal retry of a busy service.
 */
function fakeSdk(tokenCalls: { count: number; tokens: string[] }) {
  return (options: Record<string, unknown>): ConversationLike => {
    const tokenFn = options['token'] as () => Promise<string>;
    return {
      on: () => () => {},
      async connect() {
        tokenCalls.count += 1;
        tokenCalls.tokens.push(await tokenFn());
      },
      disconnect: () => {},
    };
  };
}

/** Asks the server, as the same browser session, whether an identity is active. */
async function serverSaysActive(harness: Harness, attemptId: string): Promise<boolean> {
  const res = await request(harness.app)
    .get('/api/avatar/attempt-lifecycle')
    .query({ attemptId })
    .set('Host', '127.0.0.1:5173')
    .set('Cookie', harness.credentials.cookie);
  expect(res.status).toBe(200);
  return (res.body as { active: boolean }).active;
}

/** Lets the best-effort lifecycle POSTs settle before asserting server state. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

describe('browser adapter to server, one mint per explicit Start', () => {
  it('never mints a second provider token for a single Start', async () => {
    const harness = buildServer();
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const calls = { count: 0, tokens: [] as string[] };

    const conn = createAvatarConnection({ createConversation: fakeSdk(calls), tokens });
    await conn.start();

    expect(calls.count).toBe(1);
    expect(harness.providerCalls.count).toBe(1);
    expect(harness.tokenPosts.count).toBe(1);
  });

  it('passes the server-issued attempt identity from the first mint', async () => {
    const harness = buildServer();
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const conn = createAvatarConnection({
      createConversation: fakeSdk({ count: 0, tokens: [] }),
      tokens,
    });

    await conn.start();
    expect(conn.lastTokenRequestAttemptId).toMatch(/^att_/);
    expect(harness.providerCalls.count).toBe(1);
  });

  it('answers an SDK token() retry from cache and contacts the server once', async () => {
    const harness = buildServer();
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const conn = createAvatarConnection({
      createConversation: fakeSdk({ count: 0, tokens: [] }),
      tokens,
    });

    const first = await tokens.fetchToken();
    const second = await tokens.fetchToken();

    expect(second.token).toBe(first.token);
    expect(second.attemptId).toBe(first.attemptId);
    expect(harness.tokenPosts.count).toBe(1);
    expect(harness.providerCalls.count).toBe(1);
    // The connection still works from the cached identity.
    await conn.start();
    expect(harness.providerCalls.count).toBe(1);
  });

  it('lets a fresh explicit Start mint exactly once after a clean Stop', async () => {
    const harness = buildServer();
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const sdkCalls = { count: 0, tokens: [] as string[] };
    const conn = createAvatarConnection({ createConversation: fakeSdk(sdkCalls), tokens });

    await conn.start();
    expect(harness.providerCalls.count).toBe(1);
    conn.stop();

    await conn.start();
    expect(harness.providerCalls.count).toBe(2);
    // The second Start used a new identity and the server-issued second token.
    expect(sdkCalls.tokens).toEqual([FAKE_TOKEN, FAKE_TOKEN]);
    expect(harness.tokenPosts.count).toBe(2);
  });

  it('reports a connected conversation as active even after the token deadline', async () => {
    let nowMs = Date.UTC(2026, 10, 23, 12, 0, 0);
    const clock = { now: () => nowMs };
    const harness = buildServer({ clock, tokenTtlMs: 60_000 });
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const conn = createAvatarConnection({
      createConversation: fakeSdk({ count: 0, tokens: [] }),
      tokens,
    });

    await conn.start();
    await settle();
    const attemptId = conn.lastTokenRequestAttemptId;
    expect(attemptId).not.toBeNull();

    // Only after the SDK connected does the browser report the conversation.
    expect(await serverSaysActive(harness, attemptId as string)).toBe(true);

    // Past the token-start deadline the conversation is still the active one.
    nowMs += 600_000;
    expect(await serverSaysActive(harness, attemptId as string)).toBe(true);
    expect(harness.providerCalls.count).toBe(1);
  });

  it('releases the server-side attempt on Stop so a new Start is accepted', async () => {
    const harness = buildServer();
    const tokens = createHttpTokenAdapter(makeTransport(harness));
    const conn = createAvatarConnection({
      createConversation: fakeSdk({ count: 0, tokens: [] }),
      tokens,
    });

    await conn.start();
    await settle();
    const firstId = conn.lastTokenRequestAttemptId as string;

    conn.stop();
    await settle();
    expect(await serverSaysActive(harness, firstId)).toBe(false);

    await conn.start();
    expect(harness.providerCalls.count).toBe(2);
    expect(conn.lastTokenRequestAttemptId).not.toBe(firstId);
  });
});
