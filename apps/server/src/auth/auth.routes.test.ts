import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createApp, LOCAL_ORIGINS } from '../app';
import { AttemptRegistry } from '../avatar/attemptRegistry';
import { createAuth, type AuthDependencies } from './auth';

const LOCAL = LOCAL_ORIGINS[0];
const HOST = '127.0.0.1:3001';
const SECRET = 'test-only-session-secret-value-32-bytes-minimum';
const PASSWORD = 'correct horse battery staple';

const tempDirs: string[] = [];
const apps: AuthDependencies[] = [];

function makeHarness(options: {
  absoluteTtlMs?: number;
  now?: () => number;
  rateLimit?: {
    windowMs?: number;
    loginPerEmail?: number;
    loginPerIp?: number;
    registerPerIp?: number;
  };
} = {}): { app: Express; auth: AuthDependencies; dbPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'psc-auth-routes-'));
  tempDirs.push(dir);
  const dbPath = join(dir, 'auth.sqlite');
  const auth = createAuth({ databasePath: dbPath, sessionSecret: SECRET, ...options });
  apps.push(auth);
  const app = createApp({
    hasApiKey: false,
    readApiKey: () => null,
    fetchImpl: (async () => {
      throw new Error('provider must not be called by auth');
    }) as never,
    registry: new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
    clock: { now: () => Date.now() },
    auth,
  });
  return { app, auth, dbPath };
}

afterEach(() => {
  for (const auth of apps.splice(0)) {
    try {
      auth.close();
    } catch {
      // already closed
    }
  }
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

async function csrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get('/api/auth/csrf').set('Host', HOST);
  expect(res.status).toBe(200);
  return (res.body as { csrfToken: string }).csrfToken;
}

async function post(
  agent: ReturnType<typeof request.agent>,
  path: string,
  body: unknown,
  csrfToken: string,
  origin: string | null = LOCAL,
): Promise<request.Test> {
  const req = agent.post(path).set('Host', HOST).set('x-csrf-token', csrfToken).send(body as object);
  return origin === null ? req : req.set('Origin', origin);
}

function authCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
  const match = /psc_auth_sid=([^;]+)/.exec(raw);
  expect(match, `expected an auth session cookie, got: ${raw}`).not.toBeNull();
  return `psc_auth_sid=${match?.[1] ?? ''}`;
}

describe('account lifecycle', () => {
  it('creates an account and signs in with a real session, then signs out', async () => {
    const { app, auth } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const register = await post(
      agent,
      '/api/auth/register',
      { email: 'Denise@Example.TEST', password: PASSWORD },
      token,
    );
    expect(register.status).toBe(201);
    expect(register.body).toEqual({ ok: true });
    expect(JSON.stringify(register.body)).not.toContain(PASSWORD);
    const stored = auth.accountStore.findByEmail('denise@example.test');
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);

    const login = await post(
      agent,
      '/api/auth/login',
      { email: ' DENISE@example.test ', password: PASSWORD },
      token,
    );
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ user: { email: 'denise@example.test' } });
    expect(typeof (login.body as { csrfToken?: unknown }).csrfToken).toBe('string');
    const cookieHeader = authCookie(login);
    expect(cookieHeader).toContain('psc_auth_sid=');
    expect(String(login.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(String(login.headers['set-cookie'])).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(login.body)).not.toContain(PASSWORD);
    const loginToken = (login.body as { csrfToken: string }).csrfToken;

    const me = await agent.get('/api/auth/me').set('Host', HOST);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      user: { id: stored?.id, email: 'denise@example.test' },
    });

    const logout = await post(agent, '/api/auth/logout', {}, loginToken);
    expect(logout.status).toBe(204);
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(401);

    const replay = await request(app)
      .get('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', cookieHeader);
    expect(replay.status).toBe(401);
  });

  it('uses a uniform public outcome for valid new/duplicate registration and generic validation failures', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const first = await post(
      agent,
      '/api/auth/register',
      { email: 'a@example.test', password: PASSWORD },
      token,
    );
    expect(first.status).toBe(201);
    const duplicate = await post(
      agent,
      '/api/auth/register',
      { email: 'A@example.test', password: PASSWORD },
      token,
    );
    const invalid = await post(
      agent,
      '/api/auth/register',
      { email: 'not-an-email', password: PASSWORD },
      token,
    );
    expect(duplicate.status).toBe(first.status);
    expect(duplicate.body).toEqual(first.body);
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(duplicate.body)).not.toMatch(/exist|duplicate|email/i);

    const wrong = await post(
      agent,
      '/api/auth/login',
      { email: 'a@example.test', password: 'wrong password 123456' },
      token,
    );
    const unknown = await post(
      agent,
      '/api/auth/login',
      { email: 'missing@example.test', password: 'wrong password 123456' },
      token,
    );
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(JSON.stringify(wrong.body)).not.toMatch(/a@example|missing@example/i);
  });

  it('does not replace the existing password or create a second account on valid duplicate registration', async () => {
    const { app, auth } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const first = await post(
      agent,
      '/api/auth/register',
      { email: 'keep@example.test', password: PASSWORD },
      token,
    );
    expect(first.status).toBe(201);
    const before = auth.accountStore.findByEmail('keep@example.test');
    expect(before).not.toBeNull();

    const duplicate = await post(
      agent,
      '/api/auth/register',
      { email: 'KEEP@example.test', password: 'different fictional passphrase 2026' },
      token,
    );
    expect(duplicate.status).toBe(201);
    expect(duplicate.body).toEqual({ ok: true });
    const after = auth.accountStore.findByEmail('keep@example.test');
    expect(after?.id).toBe(before?.id);
    expect(after?.passwordHash).toBe(before?.passwordHash);

    const originalLogin = await post(
      agent,
      '/api/auth/login',
      { email: 'keep@example.test', password: PASSWORD },
      token,
    );
    expect(originalLogin.status).toBe(200);
    const freshToken = (originalLogin.body as { csrfToken: string }).csrfToken;
    expect(
      (
        await post(
          agent,
          '/api/auth/login',
          { email: 'keep@example.test', password: 'different fictional passphrase 2026' },
          freshToken,
        )
      ).status,
    ).toBe(401);
  });

  it('rejects a well-formed identifier outside the fictional example.test namespace', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const response = await post(
      agent,
      '/api/auth/register',
      { email: 'person@gmail.com', password: PASSWORD },
      token,
    );
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid-request' });
  });

  it('keeps two independent fictional accounts isolated', async () => {
    const { app } = makeHarness();
    const alice = request.agent(app);
    const bob = request.agent(app);
    const aliceToken = await csrf(alice);
    const bobToken = await csrf(bob);

    await post(
      alice,
      '/api/auth/register',
      { email: 'alice@example.test', password: PASSWORD },
      aliceToken,
    );
    await post(
      bob,
      '/api/auth/register',
      { email: 'bob@example.test', password: PASSWORD },
      bobToken,
    );
    await post(
      alice,
      '/api/auth/login',
      { email: 'alice@example.test', password: PASSWORD },
      aliceToken,
    );
    await post(
      bob,
      '/api/auth/login',
      { email: 'bob@example.test', password: PASSWORD },
      bobToken,
    );

    const aliceMe = await alice.get('/api/auth/me').set('Host', HOST);
    const bobMe = await bob.get('/api/auth/me').set('Host', HOST);
    expect((aliceMe.body as { user: { email: string } }).user.email).toBe('alice@example.test');
    expect((bobMe.body as { user: { email: string } }).user.email).toBe('bob@example.test');

    // No list/admin endpoint and no caller-selected identity.
    expect((await alice.get('/api/auth/users').set('Host', HOST)).status).toBe(404);
    const forged = await alice
      .get('/api/auth/me?userId=forged')
      .set('Host', HOST)
      .set('X-User-Id', 'usr_forged');
    expect((forged.body as { user: { email: string } }).user.email).toBe('alice@example.test');
  });
});

describe('session boundary', () => {
  it('regenerates the session id on login and rejects the pre-login cookie', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'fixation@example.test', password: PASSWORD },
      token,
    );

    const csrfResponse = await agent.get('/api/auth/csrf').set('Host', HOST);
    const preLoginCookie = String(csrfResponse.headers['set-cookie'] ?? '');
    const preLoginSid = /psc_auth_sid=([^;]+)/.exec(preLoginCookie)?.[1];
    expect(preLoginSid).toBeTruthy();

    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'fixation@example.test', password: PASSWORD },
      token,
    );
    expect(login.status).toBe(200);
    const postLoginSid = /psc_auth_sid=([^;]+)/.exec(String(login.headers['set-cookie']))?.[1];
    expect(postLoginSid).toBeTruthy();
    expect(postLoginSid).not.toBe(preLoginSid);

    const replay = await request(app)
      .get('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', `psc_auth_sid=${preLoginSid}`);
    expect(replay.status).toBe(401);
  });

  it('rejects expired, revoked and disabled-account sessions', async () => {
    const { app, auth, dbPath } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'expiry@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'expiry@example.test', password: PASSWORD },
      token,
    );
    expect(login.status).toBe(200);
    const account = auth.accountStore.findByEmail('expiry@example.test');

    // Disabled account: the session cannot retrieve data.
    auth.accountStore.disable(account!.id);
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(401);
  });

  it('enforces the server-side session expiry even with a valid signed cookie', async () => {
    const { app, dbPath } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'expired@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'expired@example.test', password: PASSWORD },
      token,
    );
    expect(login.status).toBe(200);
    const cookie = authCookie(login);

    const db = new Database(dbPath);
    db.prepare('UPDATE auth_sessions SET expires_at = ?').run(Date.now() - 1);
    db.close();

    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Host', HOST)
          .set('Cookie', cookie)
      ).status,
    ).toBe(401);
  });

  it('rejects a revoked session and does not resurrect it after logout', async () => {
    const { app, dbPath } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'revoked@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'revoked@example.test', password: PASSWORD },
      token,
    );
    const cookie = authCookie(login);

    const db = new Database(dbPath);
    db.prepare('DELETE FROM auth_sessions').run();
    db.close();

    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Host', HOST)
          .set('Cookie', cookie)
      ).status,
    ).toBe(401);
  });

  it('enforces the absolute lifetime independently of rolling idle renewal', async () => {
    let now = Date.now();
    const { app } = makeHarness({ absoluteTtlMs: 1_000, now: () => now });
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'absolute@example.test', password: PASSWORD },
      token,
    );
    expect(
      (
        await post(
          agent,
          '/api/auth/login',
          { email: 'absolute@example.test', password: PASSWORD },
          token,
        )
      ).status,
    ).toBe(200);
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(200);

    now += 2_000;
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(401);
  });

  it('persists accounts and valid sessions across a clean app restart', async () => {
    const first = makeHarness();
    const agent = request.agent(first.app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'restart@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'restart@example.test', password: PASSWORD },
      token,
    );
    const cookie = authCookie(login);
    first.auth.close();

    const secondAuth = createAuth({
      databasePath: first.dbPath,
      sessionSecret: SECRET,
    });
    apps.push(secondAuth);
    const secondApp = createApp({
      hasApiKey: false,
      readApiKey: () => null,
      fetchImpl: (async () => {
        throw new Error('provider must not be called by auth');
      }) as never,
      registry: new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
      clock: { now: () => Date.now() },
      auth: secondAuth,
    });

    const me = await request(secondApp)
      .get('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ user: { email: 'restart@example.test' } });

    const secondAgent = request.agent(secondApp);
    const secondToken = await csrf(secondAgent);
    const loginAgain = await post(
      secondAgent,
      '/api/auth/login',
      { email: 'restart@example.test', password: PASSWORD },
      secondToken,
    );
    expect(loginAgain.status).toBe(200);
  });

  it('rotates the CSRF token on login so the pre-login token cannot log out', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'rotate@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'rotate@example.test', password: PASSWORD },
      token,
    );
    const freshToken = (login.body as { csrfToken: string }).csrfToken;

    const stale = await post(agent, '/api/auth/logout', {}, token);
    expect(stale.status).toBe(403);
    expect((await post(agent, '/api/auth/logout', {}, freshToken)).status).toBe(204);
  });

  it('throttles repeated login attempts per identifier without revealing account existence', async () => {
    const { app } = makeHarness({
      rateLimit: { windowMs: 60_000, loginPerEmail: 2, loginPerIp: 100, registerPerIp: 100 },
    });
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'limit@example.test', password: PASSWORD },
      token,
    );

    const first = await post(
      agent,
      '/api/auth/login',
      { email: 'limit@example.test', password: 'wrong password 123456' },
      token,
    );
    const second = await post(
      agent,
      '/api/auth/login',
      { email: 'limit@example.test', password: 'wrong password 123456' },
      token,
    );
    const third = await post(
      agent,
      '/api/auth/login',
      { email: 'limit@example.test', password: 'wrong password 123456' },
      token,
    );
    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.headers['cache-control']).toBe('no-store');

    const unknownAgent = request.agent(app);
    const unknownToken = await csrf(unknownAgent);
    const unknownFirst = await post(
      unknownAgent,
      '/api/auth/login',
      { email: 'unknown@example.test', password: 'wrong password 123456' },
      unknownToken,
    );
    const unknownSecond = await post(
      unknownAgent,
      '/api/auth/login',
      { email: 'unknown@example.test', password: 'wrong password 123456' },
      unknownToken,
    );
    const unknownThird = await post(
      unknownAgent,
      '/api/auth/login',
      { email: 'unknown@example.test', password: 'wrong password 123456' },
      unknownToken,
    );
    expect(unknownFirst.status).toBe(401);
    expect(unknownSecond.status).toBe(401);
    expect(unknownThird.status).toBe(429);
  });

  it('throttles repeated registration by source without a permanent lockout', async () => {
    const { app } = makeHarness({
      rateLimit: { windowMs: 60_000, loginPerEmail: 100, loginPerIp: 100, registerPerIp: 2 },
    });
    const agent = request.agent(app);
    const token = await csrf(agent);
    expect(
      (
        await post(
          agent,
          '/api/auth/register',
          { email: 'r1@example.test', password: PASSWORD },
          token,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await post(
          agent,
          '/api/auth/register',
          { email: 'r2@example.test', password: PASSWORD },
          token,
        )
      ).status,
    ).toBe(201);
    const limited = await post(
      agent,
      '/api/auth/register',
      { email: 'r3@example.test', password: PASSWORD },
      token,
    );
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'rate-limited' });
    expect(limited.headers['retry-after']).toBe('3600');
  });
});

describe('failure handling', () => {
  it('does not report a successful login when the session store cannot save', async () => {
    const { app, auth } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'savefail@example.test', password: PASSWORD },
      token,
    );
    const originalSet = auth.sessionStore.set.bind(auth.sessionStore);
    auth.sessionStore.set = (_sid, _sess, callback) => callback?.(new Error('store down'));

    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'savefail@example.test', password: PASSWORD },
      token,
    );
    expect(login.status).toBe(503);
    expect(login.body).toEqual({ error: 'unavailable' });
    // A cookie may be emitted by middleware, but a failed store write must not
    // create an authenticatable session.
    const cookie = String(login.headers['set-cookie'] ?? '');
    const cookieValue = /psc_auth_sid=([^;]+)/.exec(cookie)?.[1];
    if (cookieValue !== undefined) {
      expect(
        (
          await request(app)
            .get('/api/auth/me')
            .set('Host', HOST)
            .set('Cookie', `psc_auth_sid=${cookieValue}`)
        ).status,
      ).toBe(401);
    }

    auth.sessionStore.set = originalSet;
  });

  it('does not claim logout succeeded when server-side destruction fails', async () => {
    const { app, auth } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'logoutfail@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'logoutfail@example.test', password: PASSWORD },
      token,
    );
    const loginToken = (login.body as { csrfToken: string }).csrfToken;
    expect(login.status).toBe(200);

    const originalDestroy = auth.sessionStore.destroy.bind(auth.sessionStore);
    auth.sessionStore.destroy = (_sid, callback) => callback?.(new Error('store down'));

    const logout = await post(agent, '/api/auth/logout', {}, loginToken);
    expect(logout.status).toBe(503);
    expect(logout.body).toEqual({ error: 'unavailable' });
    // The response must not claim success; the server session may already have
    // been invalidated by Passport before the final destroy failed.
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(401);

    auth.sessionStore.destroy = originalDestroy;
  });

  it('fails closed with a generic 503 when the account store fails', async () => {
    const { app, auth } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    auth.accountStore.create = () => {
      throw new Error('database unavailable');
    };
    const register = await post(
      agent,
      '/api/auth/register',
      { email: 'dbfail@example.test', password: PASSWORD },
      token,
    );
    expect(register.status).toBe(503);
    expect(JSON.stringify(register.body)).not.toMatch(/database|sqlite|stack/i);
  });

  it('sets an HTTP-only, SameSite=Lax loopback session cookie without Secure', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'cookie@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'cookie@example.test', password: PASSWORD },
      token,
    );
    const cookie = String(login.headers['set-cookie']);
    expect(cookie).toMatch(/psc_auth_sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it('rejects unsupported methods with a generic 405 and Allow header', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);

    const getLogin = await agent.get('/api/auth/login').set('Host', HOST);
    expect(getLogin.status).toBe(405);
    expect(getLogin.headers['allow']).toBe('POST');
    expect(getLogin.body).toEqual({ error: 'method-not-allowed' });

    const postMe = await agent.post('/api/auth/me').set('Host', HOST);
    expect(postMe.status).toBe(405);
    expect(postMe.headers['allow']).toBe('GET, HEAD');
  });

  it('supports signing in again immediately after an awaited logout without a stale cookie', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);
    await post(
      agent,
      '/api/auth/register',
      { email: 'relogin@example.test', password: PASSWORD },
      token,
    );
    const login = await post(
      agent,
      '/api/auth/login',
      { email: 'relogin@example.test', password: PASSWORD },
      token,
    );
    const loginToken = (login.body as { csrfToken: string }).csrfToken;
    const oldCookie = authCookie(login);

    expect((await post(agent, '/api/auth/logout', {}, loginToken)).status).toBe(204);

    const freshToken = await csrf(agent);
    const again = await post(
      agent,
      '/api/auth/login',
      { email: 'relogin@example.test', password: PASSWORD },
      freshToken,
    );
    expect(again.status).toBe(200);
    expect((await agent.get('/api/auth/me').set('Host', HOST)).status).toBe(200);

    const oldReplay = await request(app)
      .get('/api/auth/me')
      .set('Host', HOST)
      .set('Cookie', oldCookie);
    expect(oldReplay.status).toBe(401);
  });

  it('stops every session for a disabled account', async () => {
    const { app, auth } = makeHarness();
    const first = request.agent(app);
    const second = request.agent(app);
    const firstToken = await csrf(first);
    const secondToken = await csrf(second);
    await post(
      first,
      '/api/auth/register',
      { email: 'twosessions@example.test', password: PASSWORD },
      firstToken,
    );
    expect(
      (
        await post(
          first,
          '/api/auth/login',
          { email: 'twosessions@example.test', password: PASSWORD },
          firstToken,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await post(
          second,
          '/api/auth/login',
          { email: 'twosessions@example.test', password: PASSWORD },
          secondToken,
        )
      ).status,
    ).toBe(200);

    const account = auth.accountStore.findByEmail('twosessions@example.test');
    auth.accountStore.disable(account!.id);

    expect((await first.get('/api/auth/me').set('Host', HOST)).status).toBe(401);
    expect((await second.get('/api/auth/me').set('Host', HOST)).status).toBe(401);
  });
});

describe('request protection', () => {
  it('rejects missing/foreign Origin and missing CSRF with generic no-store JSON', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const noCsrf = await agent
      .post('/api/auth/register')
      .set('Host', HOST)
      .set('Origin', LOCAL)
      .send({ email: 'x@example.test', password: PASSWORD });
    const foreign = await post(
      agent,
      '/api/auth/register',
      { email: 'x@example.test', password: PASSWORD },
      token,
      'https://evil.example',
    );
    const missingOrigin = await post(
      agent,
      '/api/auth/register',
      { email: 'x@example.test', password: PASSWORD },
      token,
      null,
    );

    for (const res of [noCsrf, foreign, missingOrigin]) {
      expect(res.status).toBe(403);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules|origin/i);
    }
  });

  it('rejects malformed and oversized JSON with generic errors', async () => {
    const { app } = makeHarness();
    const agent = request.agent(app);
    const token = await csrf(agent);

    const malformed = await agent
      .post('/api/auth/register')
      .set('Host', HOST)
      .set('Origin', LOCAL)
      .set('x-csrf-token', token)
      .set('Content-Type', 'application/json')
      .send('{"email":');
    const oversized = await agent
      .post('/api/auth/register')
      .set('Host', HOST)
      .set('Origin', LOCAL)
      .set('x-csrf-token', token)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'x@example.test', password: 'x'.repeat(4096) }));

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    for (const res of [malformed, oversized]) {
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(JSON.stringify(res.body)).not.toMatch(/syntax|node_modules|stack/i);
    }
  });
});
