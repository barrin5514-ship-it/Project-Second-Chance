import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: number;
  readonly disabledAt: number | null;
}

export class AccountExistsError extends Error {
  constructor() {
    super('account already exists');
    this.name = 'AccountExistsError';
  }
}

export interface AccountStore {
  readonly db: Database.Database;
  create(input: { email: string; passwordHash: string; now?: number }): Account;
  findByEmail(email: string): Account | null;
  findById(id: string): Account | null;
  updatePasswordHash(id: string, passwordHash: string): boolean;
  disable(id: string, now?: number): boolean;
  close(): void;
}

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
  disabled_at: number | null;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    disabled_at INTEGER
  );
`;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAccountStore(path: string): AccountStore {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const insert = db.prepare(
    'INSERT INTO users (id, email, password_hash, created_at, disabled_at) VALUES (?, ?, ?, ?, NULL)',
  );
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  const updateHash = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const disableStmt = db.prepare('UPDATE users SET disabled_at = ? WHERE id = ?');

  function toAccount(row: AccountRow | undefined): Account | null {
    if (row === undefined) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      disabledAt: row.disabled_at,
    };
  }

  return {
    db,

    create({ email, passwordHash, now = Date.now() }) {
      const normalized = normalizeEmail(email);
      const id = `usr_${randomBytes(16).toString('base64url')}`;
      try {
        insert.run(id, normalized, passwordHash, now);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw new AccountExistsError();
        }
        throw error;
      }
      return { id, email: normalized, passwordHash, createdAt: now, disabledAt: null };
    },

    findByEmail(email) {
      return toAccount(byEmail.get(normalizeEmail(email)) as AccountRow | undefined);
    },

    findById(id) {
      return toAccount(byId.get(id) as AccountRow | undefined);
    },

    updatePasswordHash(id, passwordHash) {
      return updateHash.run(passwordHash, id).changes > 0;
    },

    disable(id, now = Date.now()) {
      return disableStmt.run(now, id).changes > 0;
    },

    close() {
      db.close();
    },
  };
}
