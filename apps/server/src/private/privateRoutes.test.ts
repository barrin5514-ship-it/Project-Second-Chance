import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import type { Express } from 'express';
import { createApp, LOCAL_ORIGINS } from '../app';
import { AttemptRegistry } from '../avatar/attemptRegistry';
import { createAuth, type AuthDependencies } from '../auth/auth';
import { loadPrivateKeys } from './crypto';
import {
  createPrivateStore,
  PrivateStorageError,
  type PrivateFileOps,
  type PrivateStore,
} from './privateStore';
import { createPrivateRouter } from './privateRoutes';

const HOST = '127.0.0.1:3001';
const ORIGIN = LOCAL_ORIGINS[0];
const PASSWORD = 'correct horse battery staple';
const SECRET = 'test-only-private-session-secret-value-32-bytes';

interface Harness {
  root: string;
  dbPath: string;
  dataDir: string;
  keyDir: string;
  app: Express;
  auth: AuthDependencies;
  store: PrivateStore;
}

const open: Harness[] = [];

async function pdf(): Promise<Buffer> {
  const document = await PDFDocument.create();
  document.addPage();
  return Buffer.from(await document.save());
}

async function harness(options: {
  now?: () => number;
  absoluteTtlMs?: number;
  fileOps?: Partial<PrivateFileOps>;
  wrongKeys?: boolean;
} = {}): Promise<Harness> {
  const root = mkdtempSync(join(tmpdir(), 'psc-private-routes-'));
  const dbPath = join(root, 'auth.sqlite');
  const dataDir = join(root, 'private');
  const keyDir = join(root, 'keys');
  const auth = createAuth({
    databasePath: dbPath,
    sessionSecret: SECRET,
    absoluteTtlMs: options.absoluteTtlMs,
    now: options.now,
  });
  const keys = loadPrivateKeys(options.wrongKeys ? join(root, 'wrong-keys') : keyDir, {
    allowCreate: true,
  });
  const store = createPrivateStore({
    db: auth.accountStore.db,
    keys,
    dataDir,
    now: options.now,
    fileOps: options.fileOps,
  });
  const app = createApp({
    hasApiKey: false,
    readApiKey: () => null,
    fetchImpl: (async () => {
      throw new Error('provider must not be called');
    }) as never,
    registry: new AttemptRegistry({ clock: { now: () => Date.now() }, tokenTtlMs: 60_000 }),
    clock: { now: () => Date.now() },
    auth,
    privateDocuments: { router: createPrivateRouter({ auth, store }) },
  });
  const h = { root, dbPath, dataDir, keyDir, app, auth, store };
  open.push(h);
  return h;
}

afterEach(() => {
  for (const h of open.splice(0)) {
    try {
      h.auth.close();
    } catch {
      // already closed
    }
    rmSync(h.root, { recursive: true, force: true });
  }
});

async function csrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get('/api/auth/csrf').set('Host', HOST);
  expect(res.status).toBe(200);
  return (res.body as { csrfToken: string }).csrfToken;
}

async function registerAndLogin(
  h: Harness,
  email: string,
): Promise<{ agent: ReturnType<typeof request.agent>; token: string; id: string }> {
  const agent = request.agent(h.app);
  const token = await csrf(agent);
  const register = await agent
    .post('/api/auth/register')
    .set('Host', HOST)
    .set('Origin', ORIGIN)
    .set('x-csrf-token', token)
    .send({ email, password: PASSWORD });
  expect(register.status).toBe(201);
  const login = await agent
    .post('/api/auth/login')
    .set('Host', HOST)
    .set('Origin', ORIGIN)
    .set('x-csrf-token', token)
    .send({ email, password: PASSWORD });
  expect(login.status).toBe(200);
  const account = h.auth.accountStore.findByEmail(email);
  return {
    agent,
    token: (login.body as { csrfToken: string }).csrfToken,
    id: account!.id,
  };
}

function send(
  agent: ReturnType<typeof request.agent>,
  method: 'post' | 'patch' | 'delete',
  path: string,
  token: string,
  body: unknown = {},
) {
  return agent[method](path)
    .set('Host', HOST)
    .set('Origin', ORIGIN)
    .set('x-csrf-token', token)
    .send(body as object);
}

async function createCase(
  agent: ReturnType<typeof request.agent>,
  token: string,
  label = 'Fictional case',
): Promise<string> {
  const response = await send(agent, 'post', '/api/cases', token, {
    label,
    jurisdiction: 'Georgia',
  });
  expect(response.status).toBe(201);
  return (response.body as { case: { id: string } }).case.id;
}

describe('private cases and documents API', () => {
  it('keeps cases/documents owner-isolated and hides foreign IDs consistently', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'alice@example.test');
    const bob = await registerAndLogin(h, 'bob@example.test');
    const caseId = await createCase(alice.agent, alice.token, 'Alice private canary');

    const aliceList = await alice.agent.get('/api/cases').set('Host', HOST);
    expect(aliceList.status).toBe(200);
    expect(aliceList.body).toMatchObject({ accountId: alice.id });
    expect(JSON.stringify(aliceList.body)).toContain('Alice private canary');
    expect(aliceList.body).not.toHaveProperty('cases.0.ownerId');

    const bobList = await bob.agent.get('/api/cases').set('Host', HOST);
    expect(bobList.status).toBe(200);
    expect(bobList.body).toEqual({ accountId: bob.id, cases: [] });

    for (const path of [
      `/api/cases/${caseId}`,
      `/api/cases/${caseId}/documents`,
      `/api/cases/${caseId}/documents/doc_missing/download`,
    ]) {
      expect((await bob.agent.get(path).set('Host', HOST)).status).toBe(404);
    }
    expect(
      (await send(bob.agent, 'patch', `/api/cases/${caseId}`, bob.token, { label: 'stolen' })).status,
    ).toBe(404);
    expect(
      (await send(bob.agent, 'delete', `/api/cases/${caseId}`, bob.token, { confirm: true })).status,
    ).toBe(404);
  });

  it('creates, reads, edits, uploads, downloads and deletes an owned case/document', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'owner@example.test');
    const caseId = await createCase(alice.agent, alice.token, 'Private case');
    const file = await pdf();
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', file, 'fictional.pdf');
    expect(upload.status).toBe(201);
    const document = (upload.body as { document: { id: string } }).document;
    expect(upload.body).toMatchObject({
      document: {
        originalName: 'fictional.pdf',
        mimeType: 'application/pdf',
        size: file.length,
      },
    });

    const list = await alice.agent.get(`/api/cases/${caseId}/documents`).set('Host', HOST);
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ documents: [{ id: document.id }] });

    const detail = await alice.agent
      .get(`/api/cases/${caseId}/documents/${document.id}`)
      .set('Host', HOST);
    expect(detail.status).toBe(200);

    const download = await alice.agent
      .get(`/api/cases/${caseId}/documents/${document.id}/download`)
      .set('Host', HOST);
    expect(download.status).toBe(200);
    expect(Buffer.compare(download.body as Buffer, file)).toBe(0);
    expect(download.headers['content-type']).toMatch(/application\/pdf/);
    expect(download.headers['content-disposition']).toMatch(/attachment/i);
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(download.headers['cache-control']).toBe('no-store');

    const edit = await send(alice.agent, 'patch', `/api/cases/${caseId}`, alice.token, {
      label: 'Edited label',
      jurisdiction: null,
    });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ case: { label: 'Edited label', jurisdiction: null } });

    expect(
      (await send(alice.agent, 'delete', `/api/cases/${caseId}/documents/${document.id}`, alice.token, {
        confirm: true,
      })).status,
    ).toBe(204);
    expect(
      (await alice.agent
        .get(`/api/cases/${caseId}/documents/${document.id}/download`)
        .set('Host', HOST)).status,
    ).toBe(404);

    expect(
      (await send(alice.agent, 'delete', `/api/cases/${caseId}`, alice.token, { confirm: true }))
        .status,
    ).toBe(204);
    expect((await alice.agent.get(`/api/cases/${caseId}`).set('Host', HOST)).status).toBe(404);
  });

  it('rejects unauthenticated, missing-CSRF and foreign-Origin private mutations', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'csrf@example.test');
    const anonymous = request.agent(h.app);
    expect((await anonymous.get('/api/cases').set('Host', HOST)).status).toBe(401);

    const noCsrf = await alice.agent
      .post('/api/cases')
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .send({ label: 'no csrf' });
    expect(noCsrf.status).toBe(403);

    const foreign = await alice.agent
      .post('/api/cases')
      .set('Host', HOST)
      .set('Origin', 'https://evil.example')
      .set('x-csrf-token', alice.token)
      .send({ label: 'foreign' });
    expect(foreign.status).toBe(403);

    const noConfirm = await send(alice.agent, 'delete', '/api/cases/case_missing', alice.token, {});
    expect(noConfirm.status).toBe(400);
  });

  it('rejects invalid, spoofed, oversize, multiple-file and traversal uploads without publishing', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'upload@example.test');
    const caseId = await createCase(alice.agent, alice.token);

    const spoof = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', Buffer.from('not a pdf'), 'fake.pdf');
    expect(spoof.status).toBe(400);

    const traversal = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .set('Content-Type', 'multipart/form-data; boundary=----psc-test')
      .send(
        Buffer.concat([
          Buffer.from(
            '------psc-test\r\nContent-Disposition: form-data; name="file"; filename="../escape.pdf"\r\nContent-Type: application/pdf\r\n\r\n',
          ),
          await pdf(),
          Buffer.from('\r\n------psc-test--\r\n'),
        ]),
      );
    expect([400, 413]).toContain(traversal.status);

    const oversize = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.pdf');
    expect(oversize.status).toBe(413);

    const multiple = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', await pdf(), 'one.pdf')
      .attach('file', await pdf(), 'two.pdf');
    expect(multiple.status).toBe(400);

    const noFile = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .field('note', 'no file');
    expect(noFile.status).toBe(400);

    expect((await alice.agent.get(`/api/cases/${caseId}/documents`).set('Host', HOST)).body).toEqual({
      documents: [],
    });
  });

  it('returns a generic failure without plaintext when a blob is tampered', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'tamper@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    const file = await pdf();
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', file, 'tamper.pdf');
    const docId = (upload.body as { document: { id: string } }).document.id;
    const row = h.auth.accountStore.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(docId) as { blob_name: string };
    const path = join(h.dataDir, 'blobs', row.blob_name.slice(0, 2), `${row.blob_name}.psc`);
    const envelope = readFileSync(path);
    const last = envelope.length - 1;
    envelope[last] = (envelope[last] ?? 0) ^ 0x01;
    writeFileSync(path, envelope);

    const response = await alice.agent
      .get(`/api/cases/${caseId}/documents/${docId}/download`)
      .set('Host', HOST);
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toMatch(/PDF|canary|node_modules/i);
  });

  it('rejects expired sessions before private data access', async () => {
    let now = Date.now();
    const h = await harness({ now: () => now, absoluteTtlMs: 1_000 });
    const alice = await registerAndLogin(h, 'expired@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    expect((await alice.agent.get(`/api/cases/${caseId}`).set('Host', HOST)).status).toBe(200);
    now += 2_000;
    expect((await alice.agent.get(`/api/cases/${caseId}`).set('Host', HOST)).status).toBe(401);
    expect((await alice.agent.get('/api/cases').set('Host', HOST)).status).toBe(401);
  });

  it('rejects disabled-account private access after a previously valid session', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'disabled-private@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    h.auth.accountStore.disable(alice.id);
    expect((await alice.agent.get(`/api/cases/${caseId}`).set('Host', HOST)).status).toBe(401);
  });

  it('does not claim deletion success when managed blob removal fails', async () => {
    const h = await harness({
      fileOps: {
        unlink: () => {
          throw new Error('sharing violation');
        },
      },
    });
    const alice = await registerAndLogin(h, 'delete-fault@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', await pdf(), 'delete-fault.pdf');
    const docId = (upload.body as { document: { id: string } }).document.id;

    const deletion = await send(
      alice.agent,
      'delete',
      `/api/cases/${caseId}/documents/${docId}`,
      alice.token,
      { confirm: true },
    );
    expect(deletion.status).toBe(503);
    expect(
      (await alice.agent
        .get(`/api/cases/${caseId}/documents/${docId}/download`)
        .set('Host', HOST)).status,
    ).toBe(404);
  });

  it('rechecks authorization at the private publication boundary', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'boundary@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    h.auth.isAuthorized = () => false;
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', await pdf(), 'boundary.pdf');
    expect(upload.status).toBe(401);
    expect((await alice.agent.get(`/api/cases/${caseId}/documents`).set('Host', HOST)).body).toEqual({
      documents: [],
    });
  });

  it('fails closed on a wrong key and preserves readable data with the right key after restart', async () => {    const h = await harness();
    const alice = await registerAndLogin(h, 'restart@example.test');
    const caseId = await createCase(alice.agent, alice.token, 'Restart case');
    const file = await pdf();
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', file, 'restart.pdf');
    const docId = (upload.body as { document: { id: string } }).document.id;

    expect(() =>
      createPrivateStore({
        db: h.auth.accountStore.db,
        keys: loadPrivateKeys(join(h.root, 'wrong-keys'), { allowCreate: true }),
        dataDir: h.dataDir,
      }),
    ).toThrow(PrivateStorageError);

    const reopened = createPrivateStore({
      db: h.auth.accountStore.db,
      keys: loadPrivateKeys(h.keyDir, { allowCreate: false }),
      dataDir: h.dataDir,
    });
    expect(reopened.getCase(alice.id, caseId)?.label).toBe('Restart case');
    expect(reopened.openDocument(alice.id, caseId, docId).bytes.equals(file)).toBe(true);
  });

  it('does not publish a successful upload when staging/write fails', async () => {
    const h = await harness({
      fileOps: {
        writeFile: (path, data) => {
          if (path.includes('.psc-store-identity')) {
            writeFileSync(path, data, { mode: 0o600 });
            return;
          }
          throw new Error('disk full');
        },
      },
    });
    const alice = await registerAndLogin(h, 'fault@example.test');
    const caseId = await createCase(alice.agent, alice.token);
    const response = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', await pdf(), 'fault.pdf');
    expect(response.status).toBe(503);
    expect((await alice.agent.get(`/api/cases/${caseId}/documents`).set('Host', HOST)).body).toEqual({
      documents: [],
    });
  });

  it('keeps only ciphertext and encrypted metadata on disk and in the DB', async () => {
    const h = await harness();
    const alice = await registerAndLogin(h, 'canary@example.test');
    const caseId = await createCase(alice.agent, alice.token, 'CASE-METADATA-CANARY-77a1');
    const document = await PDFDocument.create();
    document.setTitle('DOCUMENT-CONTENT-CANARY-33f2');
    document.addPage();
    const file = Buffer.from(await document.save());
    const upload = await alice.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', alice.token)
      .attach('file', file, 'CANARY-NAME.pdf');
    expect(upload.status).toBe(201);

    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else files.push(path);
      }
    };
    walk(h.root);
    for (const path of files) {
      const bytes = readFileSync(path);
      for (const canary of [
        'CASE-METADATA-CANARY-77a1',
        'DOCUMENT-CONTENT-CANARY-33f2',
        'CANARY-NAME.pdf',
      ]) {
        expect(bytes.includes(Buffer.from(canary)), `${path} leaked ${canary}`).toBe(false);
      }
    }
  });
});
