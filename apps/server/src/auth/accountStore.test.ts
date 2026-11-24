import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AccountExistsError,
  createAccountStore,
  normalizeEmail,
  type AccountStore,
} from './accountStore';

const tempDirs: string[] = [];
const stores: AccountStore[] = [];

function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'psc-auth-store-'));
  tempDirs.push(dir);
  return join(dir, 'auth.sqlite');
}

function open(path = tempDb()): AccountStore {
  const store = createAccountStore(path);
  stores.push(store);
  return store;
}

afterEach(() => {
  for (const store of stores.splice(0)) {
    try {
      store.close();
    } catch {
      // already closed
    }
  }
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('normalizeEmail', () => {
  it('lower-cases and trims the fictional identifier', () => {
    expect(normalizeEmail('  Denise@Example.TEST ')).toBe('denise@example.test');
  });
});

describe('SQLite account store', () => {
  it('creates an opaque account with a normalized email and argon hash', () => {
    const store = open();
    const account = store.create({
      email: '  Denise@Example.TEST ',
      passwordHash: '$argon2id$example',
      now: 1_700_000_000_000,
    });

    expect(account.id).toMatch(/^usr_[A-Za-z0-9_-]+$/);
    expect(account.email).toBe('denise@example.test');
    expect(account.passwordHash).toBe('$argon2id$example');
    expect(account.createdAt).toBe(1_700_000_000_000);
    expect(account.disabledAt).toBeNull();
  });

  it('finds accounts by normalized email and by id', () => {
    const store = open();
    const created = store.create({ email: 'a@example.test', passwordHash: 'hash' });

    expect(store.findByEmail(' A@EXAMPLE.TEST ')?.id).toBe(created.id);
    expect(store.findById(created.id)?.email).toBe('a@example.test');
    expect(store.findById('usr_missing')).toBeNull();
  });

  it('refuses a duplicate identifier regardless of case', () => {
    const store = open();
    store.create({ email: 'a@example.test', passwordHash: 'hash' });
    expect(() => store.create({ email: 'A@example.test', passwordHash: 'other' })).toThrow(
      AccountExistsError,
    );
  });

  it('persists an account across a clean store restart', () => {
    const path = tempDb();
    const first = open(path);
    const created = first.create({ email: 'persist@example.test', passwordHash: 'hash' });
    first.close();
    stores.splice(stores.indexOf(first), 1);

    const second = open(path);
    const found = second.findById(created.id);
    expect(found?.email).toBe('persist@example.test');
    expect(found?.passwordHash).toBe('hash');
  });

  it('marks an account disabled without deleting the row', () => {
    const store = open();
    const created = store.create({ email: 'disabled@example.test', passwordHash: 'hash' });
    expect(store.disable(created.id, 1_800_000_000_000)).toBe(true);
    expect(store.disable('usr_missing')).toBe(false);
    expect(store.findById(created.id)?.disabledAt).toBe(1_800_000_000_000);
  });

  it('updates only the password hash when rehashing is needed', () => {
    const store = open();
    const created = store.create({ email: 'rehash@example.test', passwordHash: 'old' });
    expect(store.updatePasswordHash(created.id, 'new')).toBe(true);
    expect(store.updatePasswordHash('usr_missing', 'new')).toBe(false);
    const found = store.findById(created.id);
    expect(found?.passwordHash).toBe('new');
    expect(found?.email).toBe('rehash@example.test');
  });
});
