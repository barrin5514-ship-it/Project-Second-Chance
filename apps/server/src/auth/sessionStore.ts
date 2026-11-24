import session, { type SessionData } from 'express-session';
import type Database from 'better-sqlite3';

export interface SqliteSessionStoreOptions {
  db: Database.Database;
  defaultTtlMs?: number;
  now?: () => number;
  pruneIntervalMs?: number;
}

interface SessionRow {
  sess: string;
  expires_at: number;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS auth_sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions (expires_at);
`;

/**
 * Small express-session store over better-sqlite3. The maintained alternatives
 * evaluated for this project were stale/vulnerable or GPL-licensed; this adapter
 * stores only the library-produced session id and serialized session data.
 */
export class SqliteSessionStore extends session.Store {
  private readonly db: Database.Database;
  private readonly defaultTtlMs: number;
  private readonly now: () => number;
  private readonly pruneTimer: NodeJS.Timeout | null;
  private readonly getStmt: Database.Statement;
  private readonly setStmt: Database.Statement;
  private readonly destroyStmt: Database.Statement;
  private readonly touchStmt: Database.Statement;
  private readonly pruneStmt: Database.Statement;

  constructor(options: SqliteSessionStoreOptions) {
    super();
    this.db = options.db;
    this.defaultTtlMs = options.defaultTtlMs ?? 30 * 60 * 1000;
    this.now = options.now ?? Date.now;
    this.db.exec(SCHEMA);
    this.getStmt = this.db.prepare('SELECT sess, expires_at FROM auth_sessions WHERE sid = ?');
    this.setStmt = this.db.prepare(
      'INSERT INTO auth_sessions (sid, sess, expires_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at',
    );
    this.destroyStmt = this.db.prepare('DELETE FROM auth_sessions WHERE sid = ?');
    this.touchStmt = this.db.prepare('UPDATE auth_sessions SET expires_at = ? WHERE sid = ?');
    this.pruneStmt = this.db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?');

    const interval = options.pruneIntervalMs ?? 60_000;
    this.pruneTimer =
      interval > 0
        ? setInterval(() => {
            try {
              this.prune();
            } catch {
              // A later request will surface store errors; pruning is best effort.
            }
          }, interval)
        : null;
    this.pruneTimer?.unref();
    this.prune();
  }

  private prune(): void {
    this.pruneStmt.run(this.now());
  }

  private expiryFor(sess: SessionData): number {
    const expires = sess.cookie?.expires;
    if (expires instanceof Date) return expires.getTime();
    if (typeof expires === 'string') {
      const parsed = Date.parse(expires);
      if (Number.isFinite(parsed)) return parsed;
    }
    return this.now() + this.defaultTtlMs;
  }

  override get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void,
  ): void {
    try {
      const row = this.getStmt.get(sid) as SessionRow | undefined;
      if (row === undefined) {
        callback(null, null);
        return;
      }
      if (row.expires_at <= this.now()) {
        this.destroyStmt.run(sid);
        callback(null, null);
        return;
      }
      const parsed = JSON.parse(row.sess) as SessionData;
      if (parsed.cookie !== undefined && typeof parsed.cookie.expires === 'string') {
        parsed.cookie.expires = new Date(parsed.cookie.expires);
      }
      callback(null, parsed);
    } catch (error) {
      callback(error);
    }
  }

  override set(
    sid: string,
    sess: SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    try {
      this.setStmt.run(sid, JSON.stringify(sess), this.expiryFor(sess));
      this.prune();
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.destroyStmt.run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  override touch(
    sid: string,
    sess: SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    try {
      this.touchStmt.run(this.expiryFor(sess), sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  close(): void {
    if (this.pruneTimer !== null) clearInterval(this.pruneTimer);
  }
}
