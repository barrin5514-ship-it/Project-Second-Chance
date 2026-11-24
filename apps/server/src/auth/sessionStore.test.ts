import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import session, { type SessionData } from 'express-session';
import { SqliteSessionStore } from './sessionStore';

const tempDirs: string[] = [];
const closers: Array<() => void> = [];

function tempPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'psc-auth-session-'));
  tempDirs.push(dir);
  return join(dir, 'auth.sqlite');
}

function makeStore(options: { path?: string; now?: () => number } = {}): {
  db: Database.Database;
  store: SqliteSessionStore;
  path: string;
} {
  const path = options.path ?? tempPath();
  const db = new Database(path);
  const store = new SqliteSessionStore({
    db,
    defaultTtlMs: 60_000,
    now: options.now ?? (() => 1_700_000_000_000),
    pruneIntervalMs: 0,
  });
  closers.push(() => {
    store.close();
    db.close();
  });
  return { db, store, path };
}

function sessionData(expiresAt: number, extra: Record<string, unknown> = {}): SessionData {
  return {
    cookie: { maxAge: expiresAt - 1_700_000_000_000, expires: new Date(expiresAt) },
    ...extra,
  } as SessionData;
}

function get(store: SqliteSessionStore, sid: string): Promise<SessionData | null> {
  return new Promise((resolve, reject) => {
    store.get(sid, (error, value) => (error ? reject(error) : resolve(value ?? null)));
  });
}

function set(store: SqliteSessionStore, sid: string, data: SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    store.set(sid, data, (error) => (error ? reject(error) : resolve()));
  });
}

function destroy(store: SqliteSessionStore, sid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    store.destroy(sid, (error) => (error ? reject(error) : resolve()));
  });
}

function touch(store: SqliteSessionStore, sid: string, data: SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    store.touch(sid, data, (error) => (error ? reject(error) : resolve()));
  });
}

afterEach(() => {
  for (const close of closers.splice(0)) {
    try {
      close();
    } catch {
      // already closed
    }
  }
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('SqliteSessionStore', () => {
  it('stores and retrieves a session through the express-session Store API', async () => {
    const { store } = makeStore();
    await set(store, 'sid_a', sessionData(1_700_000_060_000, { userId: 'usr_a' }));

    const found = await get(store, 'sid_a');
    expect(found?.userId).toBe('usr_a');
    expect(found?.cookie.expires).toBeInstanceOf(Date);
    expect(await get(store, 'sid_missing')).toBeNull();
  });

  it('does not return an expired session even when the row remains', async () => {
    let now = 1_700_000_000_000;
    const { store } = makeStore({ now: () => now });
    await set(store, 'sid_expired', sessionData(now + 1_000));

    now += 1_001;
    expect(await get(store, 'sid_expired')).toBeNull();
  });

  it('destroys a session and makes replay fail', async () => {
    const { store } = makeStore();
    await set(store, 'sid_gone', sessionData(1_700_000_060_000));
    await destroy(store, 'sid_gone');
    expect(await get(store, 'sid_gone')).toBeNull();
  });

  it('touch extends the stored expiry for rolling sessions', async () => {
    let now = 1_700_000_000_000;
    const { store } = makeStore({ now: () => now });
    await set(store, 'sid_roll', sessionData(now + 10_000));

    now += 9_000;
    await touch(store, 'sid_roll', sessionData(now + 30_000));
    now += 20_000;
    expect(await get(store, 'sid_roll')).not.toBeNull();
  });

  it('persists sessions across a clean store restart', async () => {
    const path = tempPath();
    const first = makeStore({ path });
    await set(
      first.store,
      'sid_persist',
      sessionData(Date.now() + 60_000, { userId: 'usr_p' }),
    );
    first.store.close();

    const db = new Database(path);
    const store = new SqliteSessionStore({ db, defaultTtlMs: 60_000, pruneIntervalMs: 0 });
    closers.push(() => {
      store.close();
      db.close();
    });
    expect((await get(store, 'sid_persist'))?.userId).toBe('usr_p');
  });

  it('rejects malformed stored session JSON instead of authenticating it', async () => {
    const { store, db } = makeStore();
    db.prepare(
      'INSERT INTO auth_sessions (sid, sess, expires_at) VALUES (?, ?, ?)',
    ).run('sid_bad', '{not json', 1_700_000_060_000);

    await expect(get(store, 'sid_bad')).rejects.toThrow();
  });
});
