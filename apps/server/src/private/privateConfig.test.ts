import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore, type AccountStore } from '../auth/accountStore';
import { initializePrivateStore, loadPrivatePaths, storeHasPrivateData } from './privateConfig';
import { loadPrivateKeys } from './crypto';

const roots: string[] = [];
const accounts: AccountStore[] = [];

function setup(): {
  root: string;
  db: AccountStore;
  paths: { dataDir: string; keyDir: string };
  ownerId: string;
} {
  const root = mkdtempSync(join(tmpdir(), 'psc-private-config-'));
  roots.push(root);
  const db = createAccountStore(join(root, 'auth.sqlite'));
  accounts.push(db);
  const owner = db.create({ email: 'config@example.test', passwordHash: 'hash' });
  return {
    root,
    db,
    paths: { dataDir: join(root, 'data'), keyDir: join(root, 'keys') },
    ownerId: owner.id,
  };
}

afterEach(() => {
  for (const account of accounts.splice(0)) {
    try {
      account.close();
    } catch {
      // already closed
    }
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('private store initialization', () => {
  it('creates a fresh key/store and verifies the same key on restart', () => {
    const h = setup();
    const first = initializePrivateStore({ db: h.db.db, paths: h.paths });
    const created = first.store.createCase(h.ownerId, { label: 'Persisted', jurisdiction: null });
    expect(storeHasPrivateData(h.db.db, h.paths.dataDir)).toBe(true);

    const second = initializePrivateStore({ db: h.db.db, paths: h.paths });
    expect(second.store.getCase(h.ownerId, created.id)?.label).toBe('Persisted');
  });

  it('fails closed when the key is missing or corrupt but private data exists', () => {
    const h = setup();
    const first = initializePrivateStore({ db: h.db.db, paths: h.paths });
    first.store.createCase(h.ownerId, { label: 'Needs key', jurisdiction: null });
    rmSync(h.paths.keyDir, { recursive: true, force: true });
    expect(() => initializePrivateStore({ db: h.db.db, paths: h.paths })).toThrow(/key/i);

    const corrupt = setup();
    initializePrivateStore({ db: corrupt.db.db, paths: corrupt.paths }).store.createCase(
      corrupt.ownerId,
      { label: 'Corrupt key', jurisdiction: null },
    );
    writeFileSync(join(corrupt.paths.keyDir, 'master-key.json'), '{broken');
    expect(() => initializePrivateStore({ db: corrupt.db.db, paths: corrupt.paths })).toThrow(
      /key/i,
    );
  });

  it('fails closed when a different key is supplied for existing data', () => {
    const h = setup();
    const first = initializePrivateStore({ db: h.db.db, paths: h.paths });
    first.store.createCase(h.ownerId, { label: 'Wrong key', jurisdiction: null });

    loadPrivateKeys(join(h.root, 'different-keys'), { allowCreate: true });
    expect(() =>
      initializePrivateStore({
        db: h.db.db,
        paths: { dataDir: h.paths.dataDir, keyDir: join(h.root, 'different-keys') },
      }),
    ).toThrow(/unavailable|key|integrity/i);
  });

  it('creates a key for a fresh store and honors configurable paths', () => {
    const h = setup();
    const paths = loadPrivatePaths(h.root, {
      PSC_PRIVATE_DATA_DIR: join(h.root, 'custom-data'),
      PSC_PRIVATE_KEY_DIR: join(h.root, 'custom-keys'),
    });
    expect(paths.dataDir).toContain('custom-data');
    expect(paths.keyDir).toContain('custom-keys');
    const initialized = initializePrivateStore({ db: h.db.db, paths });
    expect(initialized.keys.metadataKey).toHaveLength(32);
  });
});
