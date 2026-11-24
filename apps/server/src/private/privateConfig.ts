import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { loadPrivateKeys, type PrivateKeys } from './crypto';
import { createPrivateStore, type PrivateStore } from './privateStore';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export interface PrivatePaths {
  dataDir: string;
  keyDir: string;
}

export function loadPrivatePaths(root = PROJECT_ROOT, env = process.env): PrivatePaths {
  return {
    dataDir: env['PSC_PRIVATE_DATA_DIR'] ?? join(root, 'runtime', 'private'),
    keyDir: env['PSC_PRIVATE_KEY_DIR'] ?? join(root, 'runtime', 'keys'),
  };
}

function tableExists(db: Database.Database, name: string): boolean {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !==
    undefined
  );
}

function hasManagedFiles(dir: string): boolean {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (hasManagedFiles(path)) return true;
    } else {
      return true;
    }
  }
  return false;
}

export function storeHasPrivateData(db: Database.Database, dataDir: string): boolean {
  if (tableExists(db, 'private_cases')) {
    const cases = db.prepare('SELECT COUNT(*) AS n FROM private_cases').get() as { n: number };
    if (cases.n > 0) return true;
  }
  if (tableExists(db, 'private_documents')) {
    const docs = db.prepare('SELECT COUNT(*) AS n FROM private_documents').get() as { n: number };
    if (docs.n > 0) return true;
  }
  if (tableExists(db, 'private_key_check')) {
    const check = db.prepare('SELECT COUNT(*) AS n FROM private_key_check').get() as { n: number };
    if (check.n > 0) return true;
  }
  return hasManagedFiles(join(dataDir, 'blobs'));
}

export function initializePrivateStore(options: {
  db: Database.Database;
  paths: PrivatePaths;
  now?: () => number;
}): { store: PrivateStore; keys: PrivateKeys } {
  const hasData = storeHasPrivateData(options.db, options.paths.dataDir);
  const keys = loadPrivateKeys(options.paths.keyDir, { allowCreate: !hasData });
  const store = createPrivateStore({
    db: options.db,
    keys,
    dataDir: options.paths.dataDir,
    now: options.now,
  });
  store.reconcile();
  return { store, keys };
}
