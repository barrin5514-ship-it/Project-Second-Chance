import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore, type AccountStore } from '../auth/accountStore';
import { loadPrivateKeys, type PrivateKeys } from './crypto';
import {
  createPrivateStore,
  PrivateStorageError,
  type PrivateFileOps,
  type PrivateStore,
} from './privateStore';

const CANARY = 'FICTIONAL-CANARY-private-label-4c1f';
const DOC_CANARY = Buffer.from('FICTIONAL-DOCUMENT-CONTENT-CANARY-8a2e', 'utf8');

interface Harness {
  root: string;
  dbPath: string;
  dataDir: string;
  keys: PrivateKeys;
  accounts: AccountStore;
  store: PrivateStore;
  ownerId: string;
}

const open: Harness[] = [];

function harness(fileOps?: Partial<PrivateFileOps>): Harness {
  const root = mkdtempSync(join(tmpdir(), 'psc-private-store-'));
  const dbPath = join(root, 'auth.sqlite');
  const dataDir = join(root, 'private');
  const keyDir = join(root, 'keys');
  const accounts = createAccountStore(dbPath);
  const owner = accounts.create({ email: 'owner@example.test', passwordHash: 'hash' });
  const keys = loadPrivateKeys(keyDir, { allowCreate: true });
  const store = createPrivateStore({ db: accounts.db, keys, dataDir, fileOps });
  const h = { root, dbPath, dataDir, keys, accounts, store, ownerId: owner.id };
  open.push(h);
  return h;
}

afterEach(() => {
  for (const h of open.splice(0)) {
    try {
      h.store.reconcile();
    } catch {
      // best effort
    }
    try {
      h.accounts.close();
    } catch {
      // already closed
    }
    rmSync(h.root, { recursive: true, force: true });
  }
});

function allFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) result.push(...allFiles(path));
    else result.push(path);
  }
  return result;
}

function expectNoCanary(h: Harness): void {
  for (const path of allFiles(h.root)) {
    expect(readFileSync(path).includes(Buffer.from(CANARY)), path).toBe(false);
    expect(readFileSync(path).includes(DOC_CANARY), path).toBe(false);
  }
}

function addDocument(h: Harness, caseId: string, name = 'canary.pdf'): { id: string; bytes: Buffer } {
  const sha256 = createHash('sha256').update(DOC_CANARY).digest('hex');
  const doc = h.store.createDocument(h.ownerId, caseId, {
    originalName: name,
    mimeType: 'application/pdf',
    bytes: DOC_CANARY,
    sha256,
  });
  return { id: doc.id, bytes: DOC_CANARY };
}

describe('private store', () => {
  it('creates/reads/updates/lists cases and keeps labels encrypted at rest', () => {
    const h = harness();
    const created = h.store.createCase(h.ownerId, { label: CANARY, jurisdiction: 'Georgia' });
    expect(created.label).toBe(CANARY);
    expect(h.store.listCases(h.ownerId)).toHaveLength(1);
    expect(h.store.getCase(h.ownerId, created.id)?.jurisdiction).toBe('Georgia');

    const updated = h.store.updateCase(h.ownerId, created.id, {
      label: `${CANARY}-updated`,
      jurisdiction: null,
    });
    expect(updated.label).toContain('updated');
    expect(updated.jurisdiction).toBeNull();

    const raw = h.accounts.db
      .prepare('SELECT metadata FROM private_cases WHERE id = ?')
      .get(created.id) as { metadata: Buffer };
    expect(raw.metadata.includes(Buffer.from(CANARY))).toBe(false);
    expectNoCanary(h);
  });

  it('isolates cases and documents by owner and parent case', () => {
    const h = harness();
    const other = h.accounts.create({ email: 'other@example.test', passwordHash: 'hash' });
    const caseA = h.store.createCase(h.ownerId, { label: CANARY, jurisdiction: null });
    const caseB = h.store.createCase(other.id, { label: 'other', jurisdiction: null });
    const doc = addDocument(h, caseA.id);

    expect(h.store.listCases(other.id).map((c) => c.id)).toEqual([caseB.id]);
    expect(h.store.getCase(other.id, caseA.id)).toBeNull();
    expect(h.store.getDocument(other.id, caseA.id, doc.id)).toBeNull();
    expect(() => h.store.listDocuments(other.id, caseA.id)).toThrow(PrivateStorageError);
    expect(() => h.store.openDocument(other.id, caseA.id, doc.id)).toThrow(PrivateStorageError);
    expect(() => h.store.createDocument(other.id, caseA.id, {
      originalName: 'x.pdf',
      mimeType: 'application/pdf',
      bytes: DOC_CANARY,
      sha256: 'x',
    })).toThrow(PrivateStorageError);

    const createdOnWrongParent = h.store.createDocument(h.ownerId, caseA.id, {
      originalName: 'parent.pdf',
      mimeType: 'application/pdf',
      bytes: Buffer.from('parent-check'),
      sha256: createHash('sha256').update('parent-check').digest('hex'),
    });
    expect(h.store.getDocument(h.ownerId, caseB.id, createdOnWrongParent.id)).toBeNull();
    expect(() => h.store.openDocument(h.ownerId, caseB.id, createdOnWrongParent.id)).toThrow(
      PrivateStorageError,
    );
  });

  it('uploads only ciphertext, decrypts byte-identically, and persists across restart', () => {
    const h = harness();
    const created = h.store.createCase(h.ownerId, { label: CANARY, jurisdiction: 'Nebraska' });
    const doc = addDocument(h, created.id);
    expectNoCanary(h);

    const opened = h.store.openDocument(h.ownerId, created.id, doc.id);
    expect(opened.bytes.equals(DOC_CANARY)).toBe(true);
    expect(opened.document.originalName).toBe('canary.pdf');
    expect(opened.document.sha256).toBe(createHash('sha256').update(DOC_CANARY).digest('hex'));

    const dbPath = h.dbPath;
    const dataDir = h.dataDir;
    const keys = h.keys;
    const ownerId = h.ownerId;
    h.accounts.close();
    open.splice(open.indexOf(h), 1);

    const accounts = createAccountStore(dbPath);
    const store = createPrivateStore({
      db: accounts.db,
      keys,
      dataDir,
    });
    const reopened = {
      root: h.root,
      dbPath,
      dataDir,
      keys,
      accounts,
      store,
      ownerId,
    };
    open.push(reopened);
    expect(store.getCase(ownerId, created.id)?.label).toBe(CANARY);
    expect(store.openDocument(ownerId, created.id, doc.id).bytes.equals(DOC_CANARY)).toBe(true);
  });

  it('rejects tampered ciphertext and swapped context without returning plaintext', () => {
    const h = harness();
    const one = h.store.createCase(h.ownerId, { label: 'one', jurisdiction: null });
    const two = h.store.createCase(h.ownerId, { label: 'two', jurisdiction: null });
    const doc = addDocument(h, one.id);
    const raw = h.accounts.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(doc.id) as { blob_name: string };
    const blobPath = join(h.dataDir, 'blobs', raw.blob_name.slice(0, 2), `${raw.blob_name}.psc`);
    const envelope = readFileSync(blobPath);
    const last = envelope.length - 1;
    envelope[last] = (envelope[last] ?? 0) ^ 0x01;
    writeFileSync(blobPath, envelope);
    expect(() => h.store.openDocument(h.ownerId, one.id, doc.id)).toThrow(PrivateStorageError);

    const other = addDocument(h, two.id);
    const otherName = (
      h.accounts.db.prepare('SELECT blob_name FROM private_documents WHERE id = ?').get(other.id) as {
        blob_name: string;
      }
    ).blob_name;
    const otherPath = join(h.dataDir, 'blobs', otherName.slice(0, 2), `${otherName}.psc`);
    writeFileSync(blobPath, readFileSync(otherPath));
    expect(() => h.store.openDocument(h.ownerId, one.id, doc.id)).toThrow(PrivateStorageError);
  });

  it('deletes documents and whole cases with their blobs', () => {
    const h = harness();
    const c = h.store.createCase(h.ownerId, { label: 'delete', jurisdiction: null });
    const d = addDocument(h, c.id);
    expect(h.store.deleteDocument(h.ownerId, c.id, d.id)).toBe(true);
    expect(h.store.getDocument(h.ownerId, c.id, d.id)).toBeNull();
    expect(() => h.store.openDocument(h.ownerId, c.id, d.id)).toThrow(PrivateStorageError);

    const d2 = addDocument(h, c.id, 'second.pdf');
    expect(h.store.deleteCase(h.ownerId, c.id)).toBe(true);
    expect(h.store.getCase(h.ownerId, c.id)).toBeNull();
    expect(() => h.store.openDocument(h.ownerId, c.id, d2.id)).toThrow(PrivateStorageError);
  });

  it('fails closed when the database and data directory identity do not match', () => {
    const h = harness();
    const c = h.store.createCase(h.ownerId, { label: 'identity', jurisdiction: null });
    const d = addDocument(h, c.id);
    const before = h.accounts.db
      .prepare('SELECT status FROM private_documents WHERE id = ?')
      .get(d.id) as { status: string };

    expect(() =>
      createPrivateStore({
        db: h.accounts.db,
        keys: h.keys,
        dataDir: join(h.root, 'wrong-data'),
      }),
    ).toThrow(PrivateStorageError);
    expect(
      h.accounts.db.prepare('SELECT status FROM private_documents WHERE id = ?').get(d.id),
    ).toEqual(before);

    const wrongDir = harness();
    const wc = wrongDir.store.createCase(wrongDir.ownerId, { label: 'wrong', jurisdiction: null });
    const reset = createAccountStore(join(wrongDir.root, 'reset.sqlite'));
    try {
      expect(() =>
        createPrivateStore({
          db: reset.db,
          keys: wrongDir.keys,
          dataDir: wrongDir.dataDir,
        }),
      ).toThrow(PrivateStorageError);
    } finally {
      reset.close();
    }
    expect(wrongDir.store.getCase(wrongDir.ownerId, wc.id)?.label).toBe('wrong');
  });

  it('keeps the case list usable when one row has damaged encrypted metadata', () => {
    const h = harness();
    const good = h.store.createCase(h.ownerId, { label: 'Good case', jurisdiction: null });
    const bad = h.store.createCase(h.ownerId, { label: 'Damaged case', jurisdiction: null });
    h.accounts.db
      .prepare("UPDATE private_cases SET metadata = X'00' WHERE id = ?")
      .run(bad.id);

    const cases = h.store.listCases(h.ownerId);
    expect(cases).toHaveLength(2);
    expect(cases.find((item) => item.id === good.id)?.label).toBe('Good case');
    expect(cases.find((item) => item.id === bad.id)).toMatchObject({
      label: 'Unavailable case',
      status: 'error',
    });
    expect(h.store.getCase(h.ownerId, bad.id)?.label).toBe('Unavailable case');

    const document = addDocument(h, good.id);
    h.accounts.db
      .prepare("UPDATE private_documents SET metadata = X'00' WHERE id = ?")
      .run(document.id);
    expect(h.store.listDocuments(h.ownerId, good.id)[0]).toMatchObject({
      originalName: 'Unavailable document',
      status: 'error',
    });
  });

  it('does not report deletion success when a ready blob is missing', () => {
    const h = harness();
    const c = h.store.createCase(h.ownerId, { label: 'missing-delete', jurisdiction: null });
    const d = addDocument(h, c.id);
    const row = h.accounts.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(d.id) as { blob_name: string };
    unlinkSync(join(h.dataDir, 'blobs', row.blob_name.slice(0, 2), `${row.blob_name}.psc`));

    expect(() => h.store.deleteDocument(h.ownerId, c.id, d.id)).toThrow(PrivateStorageError);
    expect(h.store.getDocument(h.ownerId, c.id, d.id)?.status).toBe('error');
    expect(() => h.store.openDocument(h.ownerId, c.id, d.id)).toThrow(PrivateStorageError);
  });

  it('fails closed and leaves no ready row when write or rename fails', () => {
    const writeFail = harness({
      writeFile: (path, data) => {
        if (path.includes('.psc-store-identity')) {
          writeFileSync(path, data, { mode: 0o600 });
          return;
        }
        throw new Error('disk full');
      },
    });
    const writeCase = writeFail.store.createCase(writeFail.ownerId, {
      label: 'write fault',
      jurisdiction: null,
    });
    expect(() => addDocument(writeFail, writeCase.id)).toThrow(PrivateStorageError);
    expect(writeFail.store.listDocuments(writeFail.ownerId, writeCase.id)).toHaveLength(0);

    const renameFail = harness({
      rename: (from, to) => {
        if (from.includes('.psc-store-identity')) {
          renameSync(from, to);
          return;
        }
        throw new Error('rename denied');
      },
    });
    const renameCase = renameFail.store.createCase(renameFail.ownerId, {
      label: 'rename fault',
      jurisdiction: null,
    });
    expect(() => addDocument(renameFail, renameCase.id)).toThrow(PrivateStorageError);
    expect(renameFail.store.listDocuments(renameFail.ownerId, renameCase.id)).toHaveLength(0);
    expect(
      renameFail.accounts.db
        .prepare('SELECT COUNT(*) AS n FROM private_documents WHERE owner_id = ?')
        .get(renameFail.ownerId),
    ).toEqual({ n: 0 });
  });

  it('removes pending/orphan ciphertext and marks missing ready blobs on reconcile', () => {
    const h = harness();
    const c = h.store.createCase(h.ownerId, { label: 'reconcile', jurisdiction: null });
    const d = addDocument(h, c.id);
    const row = h.accounts.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(d.id) as { blob_name: string };
    const path = join(h.dataDir, 'blobs', row.blob_name.slice(0, 2), `${row.blob_name}.psc`);
    const orphan = join(h.dataDir, 'blobs', 'or', 'blob_AAAAAAAAAAAAAAAAAAAAAA.psc');
    mkdirSync(join(h.dataDir, 'blobs', 'or'), { recursive: true });
    writeFileSync(orphan, Buffer.from('orphan-ciphertext'));
    h.accounts.db.prepare("UPDATE private_documents SET status = 'pending' WHERE id = ?").run(d.id);
    const result = h.store.reconcile();
    expect(result.removedOrphans).toBe(1);
    expect(h.store.getDocument(h.ownerId, c.id, d.id)).toBeNull();
    expect(() => statSync(path)).toThrow();
    expect(() => statSync(orphan)).toThrow();
  });

  it('marks a ready document error when its blob is missing', () => {
    const h = harness();
    const c = h.store.createCase(h.ownerId, { label: 'missing', jurisdiction: null });
    const d = addDocument(h, c.id);
    const row = h.accounts.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(d.id) as { blob_name: string };
    unlinkSync(join(h.dataDir, 'blobs', row.blob_name.slice(0, 2), `${row.blob_name}.psc`));
    expect(h.store.reconcile().missingBlobs).toBe(1);
    expect(h.store.getDocument(h.ownerId, c.id, d.id)?.status).toBe('error');
    expect(() => h.store.openDocument(h.ownerId, c.id, d.id)).toThrow(PrivateStorageError);
  });
});
