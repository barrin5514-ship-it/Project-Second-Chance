/**
 * Regression tests from the E1-S2 review. Fictional data in disposable temp
 * directories only.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { createApp, LOCAL_ORIGINS } from '../app';
import { AttemptRegistry } from '../avatar/attemptRegistry';
import { createAuth, type AuthDependencies } from '../auth/auth';
import { loadPrivateKeys } from './crypto';
import { initializePrivateStore } from './privateConfig';
import { createPrivateStore, type PrivateStore } from './privateStore';
import { createPrivateRouter, MAX_CONCURRENT_UPLOADS_PER_USER } from './privateRoutes';
import * as validation from './uploadValidation';

const HOST = '127.0.0.1:3001';
const ORIGIN = LOCAL_ORIGINS[0];
const PASSWORD = 'correct horse battery staple';
const SECRET = 'test-only-private-session-secret-value-32-bytes';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==',
  'base64',
);

interface Harness {
  root: string;
  dataDir: string;
  keyDir: string;
  auth: AuthDependencies;
  store: PrivateStore;
  app: ReturnType<typeof createApp>;
}

const open: Harness[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const h of open.splice(0)) {
    h.auth.close();
    rmSync(h.root, { recursive: true, force: true });
  }
});

function harness(options: { now?: () => number; absoluteTtlMs?: number } = {}): Harness {
  const root = mkdtempSync(join(tmpdir(), 'psc-private-hardening-'));
  const dataDir = join(root, 'private');
  const keyDir = join(root, 'keys');
  const auth = createAuth({
    databasePath: join(root, 'auth.sqlite'),
    sessionSecret: SECRET,
    now: options.now,
    absoluteTtlMs: options.absoluteTtlMs,
  });
  const keys = loadPrivateKeys(keyDir, { allowCreate: true });
  const store = createPrivateStore({ db: auth.accountStore.db, keys, dataDir });
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
  const h = { root, dataDir, keyDir, auth, store, app };
  open.push(h);
  return h;
}

async function signIn(h: Harness, email = 'review@example.test') {
  const agent = request.agent(h.app);
  const bootstrap = await agent.get('/api/auth/csrf').set('Host', HOST);
  const post = (path: string, token: string, body: object) =>
    agent
      .post(path)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', token)
      .send(body);
  await post('/api/auth/register', bootstrap.body.csrfToken as string, {
    email,
    password: PASSWORD,
  });
  const login = await post('/api/auth/login', bootstrap.body.csrfToken as string, {
    email,
    password: PASSWORD,
  });
  expect(login.status).toBe(200);
  const token = login.body.csrfToken as string;
  const id = login.body.user.id as string;
  const get = (path: string) => agent.get(path).set('Host', HOST);
  const upload = (caseId: string, bytes: Buffer, filename: string) =>
    agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', token)
      .attach('file', bytes, filename);
  const createCase = async (label = 'Fictional case'): Promise<string> => {
    const response = await post('/api/cases', token, { label });
    expect(response.status).toBe(201);
    return response.body.case.id as string;
  };
  return { agent, token, id, post, get, upload, createCase };
}

function documentRows(h: Harness): number {
  return (
    h.auth.accountStore.db.prepare('SELECT COUNT(*) AS n FROM private_documents').get() as {
      n: number;
    }
  ).n;
}

/** Holds the upload between content validation and publication. */
function gateValidation(): { entered: Promise<void>; release: () => void } {
  const original = validation.validateUpload;
  let arrived!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(validation, 'validateUpload').mockImplementation(async (input) => {
    const result = await original(input);
    arrived();
    await gate;
    return result;
  });
  return { entered, release };
}

/** Holds exactly the first `count` uploads between validation and publication. */
function gateValidationCount(count: number): { entered: Promise<void>; release: () => void } {
  const original = validation.validateUpload;
  let arrived = 0;
  let markEntered!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(validation, 'validateUpload').mockImplementation(async (input) => {
    const result = await original(input);
    arrived += 1;
    if (arrived >= count) markEntered();
    await gate;
    return result;
  });
  return { entered, release };
}

describe('authorization is rechecked before publication', () => {
  it('does not publish when the session is logged out while the upload is pending', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const gate = gateValidation();

    const pending = owner.upload(caseId, PNG, 'pending.png').then((response) => response);
    await gate.entered;
    expect((await owner.post('/api/auth/logout', owner.token, {})).status).toBe(204);
    gate.release();

    expect((await pending).status).toBe(401);
    expect(documentRows(h)).toBe(0);
  });

  it('does not re-send a logged-out session cookie from the late upload response', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const gate = gateValidation();

    const pending = owner.upload(caseId, PNG, 'pending.png').then((response) => response);
    await gate.entered;
    await owner.post('/api/auth/logout', owner.token, {});
    gate.release();

    // A late Set-Cookie could overwrite a newer sign-in in the same browser.
    expect((await pending).headers['set-cookie']).toBeUndefined();
  });

  it('does not publish when the account is disabled while the upload is pending', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const gate = gateValidation();

    const pending = owner.upload(caseId, PNG, 'pending.png').then((response) => response);
    await gate.entered;
    h.auth.accountStore.disable(owner.id);
    gate.release();

    expect((await pending).status).toBe(401);
    expect(documentRows(h)).toBe(0);
  });

  it('does not publish after the upload window already answered 408', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const gate = gateValidation();
    const realSetTimeout = globalThis.setTimeout;
    let expire: (() => void) | undefined;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      callback: () => void,
      delay?: number,
    ) => {
      if (delay === 30_000) expire = callback;
      return realSetTimeout(callback, delay);
    }) as typeof setTimeout);

    const pending = owner.upload(caseId, PNG, 'slow.png').then((response) => response);
    await gate.entered;
    expire!();
    expect((await pending).status).toBe(408);
    gate.release();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(documentRows(h)).toBe(0);
  });
});

describe('upload concurrency', () => {
  it('limits each user to two concurrent uploads and releases slots after completion', async () => {
    expect(MAX_CONCURRENT_UPLOADS_PER_USER).toBe(2);
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const gate = gateValidationCount(2);

    const first = owner.upload(caseId, PNG, 'first.png').then((response) => response);
    const second = owner.upload(caseId, PNG, 'second.png').then((response) => response);
    await gate.entered;

    const third = await owner.upload(caseId, PNG, 'third.png');
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: 'too-many-uploads' });
    expect(third.headers['retry-after']).toBe('1');

    gate.release();
    expect((await first).status).toBe(201);
    expect((await second).status).toBe(201);

    const fourth = await owner.upload(caseId, PNG, 'fourth.png');
    expect(fourth.status).toBe(201);
    expect(documentRows(h)).toBe(3);
  });
  it('does not count a second account against the first account upload limit', async () => {
    const h = harness();
    const alice = await signIn(h, 'alice-concurrent@example.test');
    const bob = await signIn(h, 'bob-concurrent@example.test');
    const aliceCase = await alice.createCase();
    const bobCase = await bob.createCase();
    const gate = gateValidationCount(3);

    const aliceFirst = alice.upload(aliceCase, PNG, 'alice-one.png').then((response) => response);
    const aliceSecond = alice.upload(aliceCase, PNG, 'alice-two.png').then((response) => response);
    const bobUpload = bob.upload(bobCase, PNG, 'bob.png').then((response) => response);
    await gate.entered;

    const aliceThird = await alice.upload(aliceCase, PNG, 'alice-three.png');
    expect(aliceThird.status).toBe(429);

    gate.release();
    expect((await aliceFirst).status).toBe(201);
    expect((await aliceSecond).status).toBe(201);
    expect((await bobUpload).status).toBe(201);
  });
});

describe('request boundary', () => {
  it('checks case ownership before parsing or validating an upload', async () => {
    const h = harness();
    const alice = await signIn(h, 'alice@example.test');
    const bob = await signIn(h, 'bob@example.test');
    const caseId = await alice.createCase();
    const spy = vi.spyOn(validation, 'validateUpload');

    const response = await bob.upload(caseId, Buffer.from('not a document'), 'x.pdf');

    expect(response.status).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });

  it('marks every private JSON response no-store', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const uploaded = await owner.upload(caseId, PNG, 'one.png');
    const documentId = uploaded.body.document.id as string;

    for (const path of [
      '/api/cases',
      `/api/cases/${caseId}`,
      `/api/cases/${caseId}/documents`,
      `/api/cases/${caseId}/documents/${documentId}`,
    ]) {
      expect((await owner.get(path)).headers['cache-control'], path).toBe('no-store');
    }
    expect(uploaded.headers['cache-control']).toBe('no-store');
  });

  it('answers a malformed multipart body with a generic 400, not a 500', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();

    const response = await owner.agent
      .post(`/api/cases/${caseId}/documents`)
      .set('Host', HOST)
      .set('Origin', ORIGIN)
      .set('x-csrf-token', owner.token)
      .set('Content-Type', 'multipart/form-data; boundary=psc-cut')
      .send(
        '--psc-cut\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\n\r\npartial',
      );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid-upload' });
    expect(documentRows(h)).toBe(0);
  });

  it('keeps a non-ASCII filename intact', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();

    const response = await owner.upload(caseId, PNG, 'résumé-ficticio.png');

    expect(response.status).toBe(201);
    expect(response.body.document.originalName).toBe('résumé-ficticio.png');
  });
});

describe('upload validation', () => {
  async function accepts(buffer: Buffer, originalName: string): Promise<boolean> {
    return validation.validateUpload({ buffer, originalName }).then(
      () => true,
      () => false,
    );
  }

  it('rejects a PNG cut off inside its pixel data', async () => {
    expect(await accepts(PNG.subarray(0, 41), 'cut.png')).toBe(false);
  });

  it('rejects a PNG with no end chunk', async () => {
    expect(await accepts(PNG.subarray(0, PNG.length - 12), 'no-end.png')).toBe(false);
  });

  it('rejects a PNG whose chunk checksum does not match', async () => {
    const damaged = Buffer.from(PNG);
    damaged[45] = (damaged[45] ?? 0) ^ 0xff;
    expect(await accepts(damaged, 'damaged.png')).toBe(false);
  });

  it('rejects a JPEG with no end-of-image marker', async () => {
    expect(await accepts(JPEG.subarray(0, JPEG.length - 2), 'cut.jpg')).toBe(false);
  });

  it('rejects a JPEG cut off before its image data', async () => {
    expect(await accepts(JPEG.subarray(0, 200), 'header-only.jpg')).toBe(false);
  });

  it('accepts a complete JPEG with camera data after the end marker', async () => {
    expect(await accepts(Buffer.concat([JPEG, Buffer.from('trailer')]), 'camera.jpg')).toBe(true);
  });

  it('rejects a PDF cut off halfway', async () => {
    const document = await PDFDocument.create();
    document.addPage();
    const bytes = Buffer.from(await document.save());
    expect(await accepts(bytes.subarray(0, Math.floor(bytes.length / 2)), 'cut.pdf')).toBe(false);
  });

  it('rejects a PDF whose end-of-file marker was cut off', async () => {
    const document = await PDFDocument.create();
    for (let page = 0; page < 5; page += 1) document.addPage();
    const bytes = Buffer.from(await document.save());
    expect(await accepts(bytes, 'whole.pdf')).toBe(true);
    expect(await accepts(bytes.subarray(0, bytes.lastIndexOf('%%EOF')), 'cut.pdf')).toBe(false);
  });

  it('rejects a filename extension that does not match the content', async () => {
    for (const name of ['page.html', 'tool.exe', 'photo.pdf', 'noextension']) {
      expect(await accepts(PNG, name), name).toBe(false);
    }
  });

  it('accepts matching extensions regardless of letter case', async () => {
    expect(await accepts(PNG, 'SCAN.PNG')).toBe(true);
    expect(await accepts(JPEG, 'photo.JPEG')).toBe(true);
  });

  it('rejects bidirectional-override characters that disguise a filename', async () => {
    expect(await accepts(PNG, 'invoice‮gnp.png')).toBe(false);
  });
});

describe('reconciliation stays inside managed files', () => {
  const MANAGED_NAME = 'blob_AAAAAAAAAAAAAAAAAAAAAA.psc';

  function outsideCanary(h: Harness, name: string): { directory: string; file: string } {
    const directory = join(h.root, 'outside');
    mkdirSync(directory, { recursive: true });
    const file = join(directory, name);
    writeFileSync(file, 'fictional unrelated file');
    return { directory, file };
  }

  it('does not follow a directory junction under blobs', () => {
    const h = harness();
    const canary = outsideCanary(h, MANAGED_NAME);
    symlinkSync(canary.directory, join(h.dataDir, 'blobs', 'bl'), 'junction');

    h.store.reconcile();

    expect(existsSync(canary.file)).toBe(true);
  });

  it('does not follow a directory junction under staging', () => {
    const h = harness();
    const canary = outsideCanary(h, 'unrelated.txt');
    symlinkSync(canary.directory, join(h.dataDir, 'staging', 'linked'), 'junction');

    h.store.reconcile();

    expect(existsSync(canary.file)).toBe(true);
  });

  it('keeps files that do not have managed names', () => {
    const h = harness();
    const inBlobs = join(h.dataDir, 'blobs', 'unrelated-note.txt');
    const inStaging = join(h.dataDir, 'staging', 'unrelated-note.txt');
    writeFileSync(inBlobs, 'fictional note');
    writeFileSync(inStaging, 'fictional note');

    h.store.reconcile();

    expect(existsSync(inBlobs)).toBe(true);
    expect(existsSync(inStaging)).toBe(true);
  });
});

describe('startup never destroys ciphertext it cannot account for', () => {
  it('fails closed when blobs exist but the database has no key check', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const uploaded = await owner.upload(caseId, PNG, 'keep.png');
    const row = h.auth.accountStore.db
      .prepare('SELECT blob_name FROM private_documents WHERE id = ?')
      .get(uploaded.body.document.id as string) as { blob_name: string };
    const blob = join(h.dataDir, 'blobs', row.blob_name.slice(0, 2), `${row.blob_name}.psc`);

    // A reset or different database pointed at the same key and blob folders.
    const replacement = createAuth({
      databasePath: join(h.root, 'replacement.sqlite'),
      sessionSecret: SECRET,
    });
    try {
      expect(() =>
        initializePrivateStore({
          db: replacement.accountStore.db,
          paths: { dataDir: h.dataDir, keyDir: h.keyDir },
        }),
      ).toThrow(/unavailable/);
      expect(existsSync(blob)).toBe(true);
    } finally {
      replacement.close();
    }
  });

  it('does not adopt a new key when rows exist but the key check is gone', async () => {
    const h = harness();
    const owner = await signIn(h);
    await owner.createCase();
    h.auth.accountStore.db.prepare('DELETE FROM private_key_check').run();

    expect(() =>
      createPrivateStore({
        db: h.auth.accountStore.db,
        keys: loadPrivateKeys(join(h.root, 'other-keys'), { allowCreate: true }),
        dataDir: h.dataDir,
      }),
    ).toThrow(/unavailable/);
  });
});

describe('incomplete work stays hidden or denied', () => {
  it.each(['deleting', 'error'])(
    'denies download while the parent case is %s',
    async (status) => {
      const h = harness();
      const owner = await signIn(h);
      const caseId = await owner.createCase();
      const uploaded = await owner.upload(caseId, PNG, 'child.png');
      h.auth.accountStore.db
        .prepare('UPDATE private_cases SET status = ? WHERE id = ?')
        .run(status, caseId);

      const response = await owner.get(
        `/api/cases/${caseId}/documents/${uploaded.body.document.id as string}/download`,
      );

      expect(response.status).toBe(404);
    },
  );

  it('does not list or return a pending document', async () => {
    const h = harness();
    const owner = await signIn(h);
    const caseId = await owner.createCase();
    const uploaded = await owner.upload(caseId, PNG, 'half.png');
    const documentId = uploaded.body.document.id as string;
    h.auth.accountStore.db
      .prepare("UPDATE private_documents SET status = 'pending' WHERE id = ?")
      .run(documentId);

    expect((await owner.get(`/api/cases/${caseId}/documents`)).body).toEqual({ documents: [] });
    expect((await owner.get(`/api/cases/${caseId}/documents/${documentId}`)).status).toBe(404);
  });
});
