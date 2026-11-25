import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import type Database from 'better-sqlite3';
import {
  buildAad,
  openEnvelope,
  sealEnvelope,
  type PrivateKeys,
} from './crypto';

export const MAX_CASES_PER_ACCOUNT = 100;
export const MAX_DOCUMENTS_PER_ACCOUNT = 100;
export const MAX_DOCUMENTS_PER_CASE = 50;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type PrivateStatus = 'pending' | 'ready' | 'deleting' | 'error';

export interface PrivateCase {
  id: string;
  ownerId: string;
  status: PrivateStatus;
  label: string;
  jurisdiction: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PrivateDocument {
  id: string;
  caseId: string;
  ownerId: string;
  status: PrivateStatus;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: number;
}

export interface NewDocument {
  originalName: string;
  mimeType: string;
  bytes: Buffer;
  sha256: string;
}

export interface PrivateFileOps {
  mkdir(path: string): void;
  writeFile(path: string, data: Buffer): void;
  rename(from: string, to: string): void;
  unlink(path: string): void;
  exists(path: string): boolean;
  readFile(path: string): Buffer;
  readdir(path: string): string[];
  /** Both checks inspect the entry itself: links and junctions are neither. */
  isFile(path: string): boolean;
  isDirectory(path: string): boolean;
  open(path: string, flags: string): number;
  fsync(fd: number): void;
  close(fd: number): void;
}

const defaultFileOps: PrivateFileOps = {
  mkdir(path) {
    mkdirSync(path, { recursive: true, mode: 0o700 });
    try {
      chmodSync(path, 0o700);
    } catch {
      // Windows may not honor POSIX modes.
    }
  },
  writeFile(path, data) {
    writeFileSync(path, data, { mode: 0o600 });
    try {
      chmodSync(path, 0o600);
    } catch {
      // Windows may not honor POSIX modes.
    }
  },
  rename(from, to) {
    renameSync(from, to);
  },
  unlink(path) {
    unlinkSync(path);
  },
  exists(path) {
    return existsSync(path);
  },
  readFile(path) {
    return readFileSync(path);
  },
  readdir(path) {
    return readdirSync(path);
  },
  isFile(path) {
    try {
      return lstatSync(path).isFile();
    } catch {
      return false;
    }
  },
  isDirectory(path) {
    try {
      return lstatSync(path).isDirectory();
    } catch {
      return false;
    }
  },
  open(path, flags) {
    return openSync(path, flags);
  },
  fsync(fd) {
    fsyncSync(fd);
  },
  close(fd) {
    closeSync(fd);
  },
};

export class PrivateStorageError extends Error {
  constructor(
    readonly code: 'not-found' | 'invalid' | 'unavailable' | 'key' | 'identity',
  ) {
    super(code);
    this.name = 'PrivateStorageError';
  }
}

interface CaseRow {
  id: string;
  owner_id: string;
  status: PrivateStatus;
  metadata: Buffer;
  metadata_version: number;
  created_at: number;
  updated_at: number;
}

interface DocumentRow {
  id: string;
  case_id: string;
  owner_id: string;
  status: PrivateStatus;
  blob_name: string;
  blob_version: number;
  metadata: Buffer;
  metadata_version: number;
  ciphertext_bytes: number;
  created_at: number;
  updated_at: number;
}

const CASE_META_AAD = (owner: string, id: string, version: number): string =>
  buildAad('metadata', owner, id, id, version);
const DOC_META_AAD = (owner: string, caseId: string, id: string, version: number): string =>
  buildAad('metadata', owner, caseId, id, version);
const DOC_BLOB_AAD = (owner: string, caseId: string, id: string, version: number): string =>
  buildAad('blob', owner, caseId, id, version);

const BLOB_PATTERN = /^blob_[A-Za-z0-9_-]{22}$/;
const STAGING_PATTERN = /^doc_[A-Za-z0-9_-]{22}\.part$/;

function makeId(prefix: 'case' | 'doc' | 'blob'): string {
  return `${prefix}_${randomBytes(16).toString('base64url')}`;
}

function metadataBytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

export function createPrivateStore(options: {
  db: Database.Database;
  keys: PrivateKeys;
  dataDir: string;
  now?: () => number;
  fileOps?: Partial<PrivateFileOps>;
}): PrivateStore {
  const db = options.db;
  const keys = options.keys;
  const dataDir = resolve(options.dataDir);
  const ops: PrivateFileOps = { ...defaultFileOps, ...options.fileOps };
  const now = options.now ?? Date.now;

  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_cases (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      metadata BLOB NOT NULL,
      metadata_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_documents (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES private_cases(id),
      owner_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      blob_name TEXT NOT NULL UNIQUE,
      blob_version INTEGER NOT NULL,
      metadata BLOB NOT NULL,
      metadata_version INTEGER NOT NULL,
      ciphertext_bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_key_check (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      envelope BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_store_identity (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS private_cases_owner ON private_cases(owner_id, created_at);
    CREATE INDEX IF NOT EXISTS private_documents_case ON private_documents(case_id, created_at);
  `);
  // Cleanup only ever sees server-generated names in real directories under
  // dataDir. Anything else, including links and junctions, is left alone.
  const managedEntries = (
    directory: string,
    accept: (name: string) => boolean,
  ): { name: string; path: string }[] => {
    if (!ops.isDirectory(directory)) return [];
    return ops
      .readdir(directory)
      .filter(accept)
      .map((name) => ({ name, path: join(directory, name) }));
  };
  const managedStagingFiles = (): string[] =>
    managedEntries(join(dataDir, 'staging'), (name) => STAGING_PATTERN.test(name))
      .filter((entry) => ops.isFile(entry.path))
      .map((entry) => entry.path);
  const managedBlobFiles = (): { blobName: string; path: string }[] =>
    managedEntries(join(dataDir, 'blobs'), (name) => name.length === 2).flatMap((shard) =>
      managedEntries(
        shard.path,
        (name) => name.endsWith('.psc') && BLOB_PATTERN.test(name.slice(0, -4)),
      )
        .filter((entry) => ops.isFile(entry.path))
        .map((entry) => ({ blobName: entry.name.slice(0, -4), path: entry.path })),
    );

  db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(
    now(),
  );

  for (const dir of ['blobs', 'staging']) ops.mkdir(join(dataDir, dir));

  const blobPath = (name: string): string => {
    if (!BLOB_PATTERN.test(name)) throw new PrivateStorageError('unavailable');
    return join(dataDir, 'blobs', name.slice(0, 2), `${name}.psc`);
  };
  const stagingPath = (id: string): string => join(dataDir, 'staging', `${id}.part`);

  const fsyncFile = (path: string): void => {
    const fd = ops.open(path, 'r+');
    try {
      ops.fsync(fd);
    } finally {
      ops.close(fd);
    }
  };
  const fsyncDir = (path: string): void => {
    try {
      const fd = ops.open(path, 'r');
      try {
        ops.fsync(fd);
      } finally {
        ops.close(fd);
      }
    } catch {
      // Directory fsync is not available on every Windows filesystem.
    }
  };
  const safeUnlink = (path: string): boolean => {
    try {
      if (ops.exists(path)) {
        ops.unlink(path);
        return true;
      }
    } catch {
      // Caller decides whether cleanup failure is fatal.
    }
    return false;
  };
  const removeManaged = (path: string, allowMissing = false): void => {
    if (ops.exists(path)) {
      ops.unlink(path);
      return;
    }
    if (!allowMissing) throw new PrivateStorageError('unavailable');
  };

  // Bind this database to this exact managed directory before any reconciliation.
  // A missing/mismatched marker is an operational error, not permission to mark
  // documents missing or delete files from a directory that merely looks familiar.
  const identityPath = join(dataDir, '.psc-store-identity');
  const identityRow = db
    .prepare('SELECT store_id FROM private_store_identity WHERE id = 1')
    .get() as { store_id: string } | undefined;
  const identityFile = existsSync(identityPath)
    ? readFileSync(identityPath, 'utf8').trim()
    : null;
  const privateRowCount = (
    db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM private_cases) + (SELECT COUNT(*) FROM private_documents) AS n',
      )
      .get() as { n: number }
  ).n;

  if (identityRow === undefined) {
    if (privateRowCount > 0 || identityFile !== null) {
      throw new PrivateStorageError('identity');
    }
    const storeId = randomBytes(16).toString('hex');
    const marker = Buffer.from(`${JSON.stringify({ version: 1, storeId })}\n`, 'utf8');
    const markerTemp = `${identityPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    writeFileSync(markerTemp, marker, { mode: 0o600, flag: 'wx' });
    let published = false;
    try {
      fsyncFile(markerTemp);
      renameSync(markerTemp, identityPath);
      published = true;
      fsyncDir(dataDir);
      db.prepare('INSERT INTO private_store_identity (id, store_id) VALUES (1, ?)').run(storeId);
    } catch (error) {
      safeUnlink(markerTemp);
      if (published) safeUnlink(identityPath);
      throw error instanceof PrivateStorageError ? error : new PrivateStorageError('identity');
    }
  } else if (identityFile === null) {
    throw new PrivateStorageError('identity');
  } else {
    let parsed: { version?: unknown; storeId?: unknown };
    try {
      parsed = JSON.parse(identityFile) as { version?: unknown; storeId?: unknown };
    } catch {
      throw new PrivateStorageError('identity');
    }
    if (parsed.version !== 1 || parsed.storeId !== identityRow.store_id) {
      throw new PrivateStorageError('identity');
    }
  }

  // Only after the store identity is verified may initialization mutate the DB
  // with the key-check row. This prevents a wrong/reset directory from writing
  // even a small piece of state before failing closed.
  const keyCheckAad = buildAad('metadata', 'keycheck', 'keycheck', 'keycheck', 1);
  const existingCheck = db
    .prepare('SELECT envelope FROM private_key_check WHERE id = 1')
    .get() as { envelope: Buffer } | undefined;
  if (existingCheck !== undefined) {
    try {
      const value = JSON.parse(
        openEnvelope(keys, 'metadata', keyCheckAad, existingCheck.envelope).toString('utf8'),
      ) as { keyId?: unknown };
      if (value.keyId !== keys.keyId) throw new PrivateStorageError('key');
    } catch {
      throw new PrivateStorageError('key');
    }
  } else {
    const rows = db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM private_cases) + (SELECT COUNT(*) FROM private_documents) AS n',
      )
      .get() as { n: number };
    if (rows.n > 0 || managedBlobFiles().length > 0) {
      throw new PrivateStorageError('key');
    }
    const envelope = sealEnvelope(
      keys,
      'metadata',
      keyCheckAad,
      Buffer.from(JSON.stringify({ keyId: keys.keyId }), 'utf8'),
    );
    db.prepare('INSERT INTO private_key_check (id, envelope) VALUES (1, ?)').run(envelope);
  }

  const openCaseMeta = (row: CaseRow): { label: string; jurisdiction: string | null } => {
    const value = JSON.parse(
      openEnvelope(keys, 'metadata', CASE_META_AAD(row.owner_id, row.id, row.metadata_version), row.metadata).toString('utf8'),
    ) as { label?: unknown; jurisdiction?: unknown };
    if (typeof value.label !== 'string') throw new PrivateStorageError('unavailable');
    return {
      label: value.label,
      jurisdiction: typeof value.jurisdiction === 'string' ? value.jurisdiction : null,
    };
  };

  const openDocMeta = (
    row: DocumentRow,
  ): { originalName: string; mimeType: string; size: number; sha256: string } => {
    const value = JSON.parse(
      openEnvelope(
        keys,
        'metadata',
        DOC_META_AAD(row.owner_id, row.case_id, row.id, row.metadata_version),
        row.metadata,
      ).toString('utf8'),
    ) as { originalName?: unknown; mimeType?: unknown; size?: unknown; sha256?: unknown };
    if (
      typeof value.originalName !== 'string' ||
      typeof value.mimeType !== 'string' ||
      typeof value.size !== 'number' ||
      typeof value.sha256 !== 'string'
    ) {
      throw new PrivateStorageError('unavailable');
    }
    return {
      originalName: value.originalName,
      mimeType: value.mimeType,
      size: value.size,
      sha256: value.sha256,
    };
  };

  const caseResult = (row: CaseRow): PrivateCase => {
    const meta = openCaseMeta(row);
    return {
      id: row.id,
      ownerId: row.owner_id,
      status: row.status,
      label: meta.label,
      jurisdiction: meta.jurisdiction,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };
  const docResult = (row: DocumentRow): PrivateDocument => {
    const meta = openDocMeta(row);
    return {
      id: row.id,
      caseId: row.case_id,
      ownerId: row.owner_id,
      status: row.status,
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      size: meta.size,
      sha256: meta.sha256,
      createdAt: row.created_at,
    };
  };
  const unavailableCase = (row: CaseRow): PrivateCase => ({
    id: row.id,
    ownerId: row.owner_id,
    status: 'error',
    label: 'Unavailable case',
    jurisdiction: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  const unavailableDocument = (row: DocumentRow): PrivateDocument => ({
    id: row.id,
    caseId: row.case_id,
    ownerId: row.owner_id,
    status: 'error',
    originalName: 'Unavailable document',
    mimeType: 'application/octet-stream',
    size: row.ciphertext_bytes,
    sha256: '',
    createdAt: row.created_at,
  });

  const caseRow = (ownerId: string, caseId: string): CaseRow | undefined =>
    db.prepare('SELECT * FROM private_cases WHERE id = ? AND owner_id = ?').get(caseId, ownerId) as
      | CaseRow
      | undefined;
  const docRow = (ownerId: string, caseId: string, docId: string): DocumentRow | undefined =>
    db
      .prepare(
        'SELECT * FROM private_documents WHERE id = ? AND case_id = ? AND owner_id = ?',
      )
      .get(docId, caseId, ownerId) as DocumentRow | undefined;

  function createCase(
    ownerId: string,
    input: { label: string; jurisdiction: string | null; now?: number },
  ): PrivateCase {
    const count = db
      .prepare('SELECT COUNT(*) AS n FROM private_cases WHERE owner_id = ?')
      .get(ownerId) as { n: number };
    if (count.n >= MAX_CASES_PER_ACCOUNT) throw new PrivateStorageError('invalid');
    const id = makeId('case');
    const at = input.now ?? now();
    const metadata = sealEnvelope(
      keys,
      'metadata',
      CASE_META_AAD(ownerId, id, 1),
      metadataBytes({ label: input.label, jurisdiction: input.jurisdiction }),
    );
    db.prepare(
      "INSERT INTO private_cases (id, owner_id, status, metadata, metadata_version, created_at, updated_at) VALUES (?, ?, 'ready', ?, 1, ?, ?)",
    ).run(id, ownerId, metadata, at, at);
    return {
      id,
      ownerId,
      status: 'ready',
      label: input.label,
      jurisdiction: input.jurisdiction,
      createdAt: at,
      updatedAt: at,
    };
  }

  function listCases(ownerId: string): PrivateCase[] {
    const rows = db
      .prepare('SELECT * FROM private_cases WHERE owner_id = ? ORDER BY created_at DESC')
      .all(ownerId) as CaseRow[];
    return rows.map((row) => {
      try {
        return caseResult(row);
      } catch {
        return unavailableCase(row);
      }
    });
  }

  function getCase(ownerId: string, id: string): PrivateCase | null {
    const row = caseRow(ownerId, id);
    if (row === undefined) return null;
    try {
      return caseResult(row);
    } catch {
      return unavailableCase(row);
    }
  }

  function updateCase(
    ownerId: string,
    id: string,
    input: { label: string; jurisdiction: string | null },
  ): PrivateCase {
    const row = caseRow(ownerId, id);
    if (row === undefined || row.status !== 'ready') throw new PrivateStorageError('not-found');
    const version = row.metadata_version + 1;
    const metadata = sealEnvelope(
      keys,
      'metadata',
      CASE_META_AAD(ownerId, id, version),
      metadataBytes(input),
    );
    const at = now();
    db.prepare(
      "UPDATE private_cases SET metadata = ?, metadata_version = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'ready'",
    ).run(metadata, version, at, id, ownerId);
    return { id, ownerId, status: 'ready', ...input, createdAt: row.created_at, updatedAt: at };
  }

  function documentCounts(ownerId: string, caseId: string): { account: number; case: number } {
    const account = db
      .prepare(
        "SELECT COUNT(*) AS n FROM private_documents WHERE owner_id = ? AND status != 'pending'",
      )
      .get(ownerId) as { n: number };
    const inCase = db
      .prepare(
        "SELECT COUNT(*) AS n FROM private_documents WHERE owner_id = ? AND case_id = ? AND status != 'pending'",
      )
      .get(ownerId, caseId) as { n: number };
    return { account: account.n, case: inCase.n };
  }

  function createDocument(ownerId: string, caseId: string, input: NewDocument): PrivateDocument {
    const parent = caseRow(ownerId, caseId);
    if (parent === undefined || parent.status !== 'ready') throw new PrivateStorageError('not-found');
    if (input.bytes.length > MAX_UPLOAD_BYTES) throw new PrivateStorageError('invalid');
    const counts = documentCounts(ownerId, caseId);
    if (counts.account >= MAX_DOCUMENTS_PER_ACCOUNT || counts.case >= MAX_DOCUMENTS_PER_CASE) {
      throw new PrivateStorageError('invalid');
    }
    const id = makeId('doc');
    const blobName = makeId('blob');
    const at = now();
    const metadata = sealEnvelope(
      keys,
      'metadata',
      DOC_META_AAD(ownerId, caseId, id, 1),
      metadataBytes({
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.bytes.length,
        sha256: input.sha256,
      }),
    );
    const blob = sealEnvelope(keys, 'blob', DOC_BLOB_AAD(ownerId, caseId, id, 1), input.bytes);
    const finalPath = blobPath(blobName);
    const staging = stagingPath(id);
    try {
      ops.mkdir(join(dataDir, 'blobs', blobName.slice(0, 2)));
      ops.writeFile(staging, blob);
      fsyncFile(staging);
      db.prepare(
        "INSERT INTO private_documents (id, case_id, owner_id, status, blob_name, blob_version, metadata, metadata_version, ciphertext_bytes, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, 1, ?, 1, ?, ?, ?)",
      ).run(id, caseId, ownerId, blobName, metadata, blob.length, at, at);
      try {
        ops.rename(staging, finalPath);
        fsyncDir(join(dataDir, 'blobs', blobName.slice(0, 2)));
        db.prepare(
          "UPDATE private_documents SET status = 'ready', updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'pending'",
        ).run(now(), id, ownerId);
        const published = db
          .prepare('SELECT status FROM private_documents WHERE id = ? AND owner_id = ?')
          .get(id, ownerId) as { status?: string } | undefined;
        if (published?.status !== 'ready') {
          throw new PrivateStorageError('unavailable');
        }
      } catch (error) {
        db.prepare('DELETE FROM private_documents WHERE id = ? AND owner_id = ?').run(id, ownerId);
        safeUnlink(staging);
        safeUnlink(finalPath);
        throw error;
      }
    } catch (error) {
      safeUnlink(staging);
      if (error instanceof PrivateStorageError) throw error;
      throw new PrivateStorageError('unavailable');
    }
    return {
      id,
      caseId,
      ownerId,
      status: 'ready',
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.bytes.length,
      sha256: input.sha256,
      createdAt: at,
    };
  }

  function listDocuments(ownerId: string, caseId: string): PrivateDocument[] {
    const parent = caseRow(ownerId, caseId);
    if (parent === undefined) throw new PrivateStorageError('not-found');
    const rows = db
      .prepare(
        "SELECT * FROM private_documents WHERE owner_id = ? AND case_id = ? AND status != 'pending' ORDER BY created_at DESC",
      )
      .all(ownerId, caseId) as DocumentRow[];
    return rows.map((row) => {
      try {
        return docResult(row);
      } catch {
        return unavailableDocument(row);
      }
    });
  }

  function getDocument(ownerId: string, caseId: string, id: string): PrivateDocument | null {
    const row = docRow(ownerId, caseId, id);
    if (row === undefined || row.status === 'pending') return null;
    try {
      return docResult(row);
    } catch {
      return unavailableDocument(row);
    }
  }

  function openDocument(
    ownerId: string,
    caseId: string,
    id: string,
  ): { document: PrivateDocument; bytes: Buffer } {
    const row = docRow(ownerId, caseId, id);
    if (row === undefined || row.status !== 'ready') throw new PrivateStorageError('not-found');
    // An unfinished case deletion blocks downloads, including after a crash.
    if (caseRow(ownerId, caseId)?.status !== 'ready') throw new PrivateStorageError('not-found');
    try {
      const envelope = ops.readFile(blobPath(row.blob_name));
      const bytes = openEnvelope(
        keys,
        'blob',
        DOC_BLOB_AAD(ownerId, caseId, id, row.blob_version),
        envelope,
      );
      const meta = openDocMeta(row);
      if (bytes.length !== meta.size) throw new PrivateStorageError('unavailable');
      if (createHash('sha256').update(bytes).digest('hex') !== meta.sha256) {
        throw new PrivateStorageError('unavailable');
      }
      return { document: docResult(row), bytes };
    } catch (error) {
      if (error instanceof PrivateStorageError) throw error;
      throw new PrivateStorageError('unavailable');
    }
  }

  function deleteDocument(ownerId: string, caseId: string, id: string): boolean {
    const row = docRow(ownerId, caseId, id);
    if (row === undefined) return false;
    db.prepare("UPDATE private_documents SET status = 'deleting', updated_at = ? WHERE id = ?").run(
      now(),
      id,
    );
    try {
      removeManaged(blobPath(row.blob_name), row.status !== 'ready');
      db.prepare('DELETE FROM private_documents WHERE id = ? AND owner_id = ?').run(id, ownerId);
      return true;
    } catch {
      db.prepare("UPDATE private_documents SET status = 'error', updated_at = ? WHERE id = ?").run(
        now(),
        id,
      );
      throw new PrivateStorageError('unavailable');
    }
  }

  function deleteCase(ownerId: string, caseId: string): boolean {
    const row = caseRow(ownerId, caseId);
    if (row === undefined) return false;
    db.prepare("UPDATE private_cases SET status = 'deleting', updated_at = ? WHERE id = ?").run(
      now(),
      caseId,
    );
    try {
      const docs = db
        .prepare('SELECT * FROM private_documents WHERE owner_id = ? AND case_id = ?')
        .all(ownerId, caseId) as DocumentRow[];
      for (const doc of docs) {
        db.prepare(
          "UPDATE private_documents SET status = 'deleting', updated_at = ? WHERE id = ?",
        ).run(now(), doc.id);
        removeManaged(blobPath(doc.blob_name), doc.status !== 'ready');
        db.prepare('DELETE FROM private_documents WHERE id = ? AND owner_id = ?').run(doc.id, ownerId);
      }
      db.prepare('DELETE FROM private_cases WHERE id = ? AND owner_id = ?').run(caseId, ownerId);
      return true;
    } catch {
      db.prepare("UPDATE private_documents SET status = 'error', updated_at = ? WHERE case_id = ?").run(
        now(),
        caseId,
      );
      db.prepare("UPDATE private_cases SET status = 'error', updated_at = ? WHERE id = ?").run(
        now(),
        caseId,
      );
      throw new PrivateStorageError('unavailable');
    }
  }

  function reconcile(): { removedStaging: number; removedOrphans: number; missingBlobs: number } {
    let removedStaging = 0;
    let removedOrphans = 0;
    let missingBlobs = 0;
    for (const path of managedStagingFiles()) {
      if (safeUnlink(path)) removedStaging += 1;
    }
    const pending = db
      .prepare("SELECT * FROM private_documents WHERE status = 'pending'")
      .all() as DocumentRow[];
    for (const doc of pending) {
      safeUnlink(blobPath(doc.blob_name));
      db.prepare('DELETE FROM private_documents WHERE id = ?').run(doc.id);
    }
    const referenced = new Set(
      (db.prepare('SELECT blob_name FROM private_documents').all() as { blob_name: string }[]).map(
        (row) => row.blob_name,
      ),
    );
    for (const { blobName, path } of managedBlobFiles()) {
      if (!referenced.has(blobName)) {
        if (safeUnlink(path)) removedOrphans += 1;
      }
    }
    const ready = db
      .prepare("SELECT * FROM private_documents WHERE status = 'ready'")
      .all() as DocumentRow[];
    for (const doc of ready) {
      if (!ops.exists(blobPath(doc.blob_name))) {
        db.prepare("UPDATE private_documents SET status = 'error', updated_at = ? WHERE id = ?").run(
          now(),
          doc.id,
        );
        missingBlobs += 1;
      }
    }
    return { removedStaging, removedOrphans, missingBlobs };
  }

  return {
    createCase,
    listCases,
    getCase,
    updateCase,
    createDocument,
    listDocuments,
    getDocument,
    openDocument,
    deleteDocument,
    deleteCase,
    reconcile,
    counts: documentCounts,
  };
}

export interface PrivateStore {
  createCase(
    ownerId: string,
    input: { label: string; jurisdiction: string | null; now?: number },
  ): PrivateCase;
  listCases(ownerId: string): PrivateCase[];
  getCase(ownerId: string, id: string): PrivateCase | null;
  updateCase(
    ownerId: string,
    id: string,
    input: { label: string; jurisdiction: string | null },
  ): PrivateCase;
  createDocument(ownerId: string, caseId: string, input: NewDocument): PrivateDocument;
  listDocuments(ownerId: string, caseId: string): PrivateDocument[];
  getDocument(ownerId: string, caseId: string, id: string): PrivateDocument | null;
  openDocument(
    ownerId: string,
    caseId: string,
    id: string,
  ): { document: PrivateDocument; bytes: Buffer };
  deleteDocument(ownerId: string, caseId: string, id: string): boolean;
  deleteCase(ownerId: string, caseId: string): boolean;
  reconcile(): { removedStaging: number; removedOrphans: number; missingBlobs: number };
  counts(ownerId: string, caseId: string): { account: number; case: number };
}
