import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

const ORIGIN = 'http://127.0.0.1:5173';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const cleanup: string[] = [];
const children: ChildProcessWithoutNullStreams[] = [];

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function start(runtime: string, port: number, preload: string): ChildProcessWithoutNullStreams {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PSC_RUNTIME_DIR: runtime,
    PSC_E2E_NO_KEY: '1',
    PSC_E2E_AUTH_RELAXED: '1',
    PORT: String(port),
  };
  delete env.PSC_PRIVATE_DATA_DIR;
  delete env.PSC_PRIVATE_KEY_DIR;
  delete env.NODE_ENV;
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', '--import', pathToFileURL(preload).href, 'apps/server/src/main.ts'],
    { cwd: process.cwd(), env, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  children.push(child);
  return child;
}

async function request(
  port: number,
  cookie: string,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: Buffer,
): Promise<{ status: number; text: string; cookie: string }> {
  return await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          Host: `127.0.0.1:${port}`,
          ...(cookie === '' ? {} : { cookie }),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => (text += String(chunk)));
        res.on('end', () => {
          const next = res.headers['set-cookie']?.[0]?.split(';')[0] ?? cookie;
          resolve({ status: res.statusCode ?? 0, text, cookie: next });
        });
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

async function waitForHealth(port: number, child: ChildProcessWithoutNullStreams): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before health: ${child.exitCode}`);
    try {
      const result = await request(port, '', 'GET', '/api/health');
      if (result.status === 200) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('server did not become healthy');
}

async function stop(child: ChildProcessWithoutNullStreams): Promise<{ code: number | null; stderr: string }> {
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += String(chunk)));
  child.stdin.write('stop\n');
  const code = await Promise.race([
    new Promise<number | null>((resolve) => child.once('exit', resolve)),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 15000)),
  ]);
  if (code === 'timeout') {
    child.kill();
    throw new Error('shutdown timed out');
  }
  return { code, stderr };
}

async function runScenario(moveShard: boolean): Promise<{ code: number | null; stderr: string }> {
  const runtime = mkdtempSync(join(tmpdir(), 'psc-task03-shutdown-'));
  cleanup.push(runtime);
  const preload = join(runtime, 'emit-sigint.mjs');
  writeFileSync(
    preload,
    "process.stdin.once('data', () => { process.stdin.pause(); process.emit('SIGINT'); });\n",
  );
  const port = await freePort();
  const child = start(runtime, port, preload);
  await waitForHealth(port, child);

  let cookie = '';
  const csrfResponse = await request(port, cookie, 'GET', '/api/auth/csrf');
  cookie = csrfResponse.cookie;
  let csrf = JSON.parse(csrfResponse.text).csrfToken as string;
  const json = async (path: string, body: object): Promise<{ status: number; text: string }> => {
    const result = await request(
      port,
      cookie,
      'POST',
      path,
      { Origin: ORIGIN, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      Buffer.from(JSON.stringify(body)),
    );
    cookie = result.cookie;
    return result;
  };
  const creds = { email: `shutdown-${Date.now()}@example.test`, password: 'correct horse battery staple' };
  await json('/api/auth/register', creds);
  const login = await json('/api/auth/login', creds);
  csrf = JSON.parse(login.text).csrfToken as string;
  const created = await json('/api/cases', { label: 'Shutdown fictional' });
  const caseId = JSON.parse(created.text).case.id as string;
  const boundary = 'XFICTIONAL';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="f.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    PNG,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const uploaded = await request(
    port,
    cookie,
    'POST',
    `/api/cases/${caseId}/documents`,
    {
      Origin: ORIGIN,
      'x-csrf-token': csrf,
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
    body,
  );
  expect(uploaded.status).toBe(201);

  const shard = join(runtime, 'private', 'blobs', 'bl');
  const away = join(runtime, 'shard-away');
  if (moveShard) renameSync(shard, away);
  const result = await stop(child);
  if (moveShard) renameSync(away, shard);
  return result;
}

afterEach(() => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null) child.kill();
  }
  for (const path of cleanup.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('server shutdown with storage faults', () => {
  it('shuts down cleanly when storage is available', async () => {
    const result = await runScenario(false);
    expect(result.code).toBe(0);
    expect(result.stderr).not.toContain('PrivateStorageError');
    expect(result.stderr.split('\n').filter((line) => /^\s+at /.test(line))).toHaveLength(0);
  }, 30000);

  it('closes cleanly and reports no paths when the blob shard is unavailable', async () => {
    const result = await runScenario(true);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('Shutdown storage cleanup unavailable (unavailable)');
    expect(result.stderr).not.toContain('PrivateStorageError');
    expect(result.stderr.split('\n').filter((line) => /^\s+at /.test(line))).toHaveLength(0);
    expect(result.stderr).not.toMatch(/[A-Z]:\\/);
  }, 30000);

  it('preserves the store files and allows a later restart after restoration', async () => {
    const runtime = mkdtempSync(join(tmpdir(), 'psc-task03-restart-'));
    cleanup.push(runtime);
    const preload = join(runtime, 'emit-sigint.mjs');
    writeFileSync(
      preload,
      "process.stdin.once('data', () => { process.stdin.pause(); process.emit('SIGINT'); });\n",
    );
    const firstPort = await freePort();
    const child = start(runtime, firstPort, preload);
    await waitForHealth(firstPort, child);
    const identity = readFileSync(join(runtime, 'private', '.psc-store-identity'));
    const shard = join(runtime, 'private', 'blobs');
    const away = join(runtime, 'blobs-away');
    renameSync(shard, away);
    const stopped = await stop(child);
    expect(stopped.code).toBe(0);
    expect(existsSync(join(runtime, 'private', '.psc-store-identity'))).toBe(true);
    renameSync(away, shard);

    const restartedPort = await freePort();
    const restarted = start(runtime, restartedPort, preload);
    await waitForHealth(restartedPort, restarted);
    expect(readFileSync(join(runtime, 'private', '.psc-store-identity'))).toEqual(identity);
    restarted.kill();
  }, 30000);
});
