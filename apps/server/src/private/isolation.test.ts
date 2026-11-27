import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadPrivatePaths } from './privateConfig';
import { loadAuthSettings } from '../auth/authConfig';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it('browser config neutralizes inherited private data/key overrides', async () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-config-'));
  roots.push(root);
  const { default: config } = await import('../../../../playwright.config');
  const servers = Array.isArray(config.webServer) ? config.webServer : [config.webServer];
  const server = servers[0] as { env?: Record<string, string> };
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PSC_PRIVATE_DATA_DIR: join(root, 'simulated-owner', 'private'),
    PSC_PRIVATE_KEY_DIR: join(root, 'simulated-owner', 'keys'),
    ...server.env,
  };
  const runtime = resolve(env.PSC_RUNTIME_DIR ?? '');
  const paths = loadPrivatePaths(root, env);

  expect(paths.dataDir).toBe(join(runtime, 'private'));
  expect(paths.keyDir).toBe(join(runtime, 'keys'));
  expect(paths.dataDir).not.toContain('simulated-owner');
  expect(paths.keyDir).not.toContain('simulated-owner');
});

it('fails closed when E2E mode has no runtime directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-missing-'));
  roots.push(root);
  const env = { PSC_E2E_NO_KEY: '1' };
  expect(() => loadAuthSettings(root, env)).toThrow(/requires PSC_RUNTIME_DIR/i);
  expect(() => loadPrivatePaths(root, env)).toThrow(/requires PSC_RUNTIME_DIR/i);
});

it('rejects the owner runtime even when explicitly configured', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-owner-'));
  roots.push(root);
  const env = { PSC_E2E_NO_KEY: '1', PSC_RUNTIME_DIR: join(root, 'runtime') };
  expect(() => loadAuthSettings(root, env)).toThrow(/owner runtime/i);
  expect(() => loadPrivatePaths(root, env)).toThrow(/owner runtime/i);
});

it('rejects private directories outside the isolated runtime', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-escape-'));
  roots.push(root);
  const runtime = join(root, 'test-results', 'e2e-runtime-negative');
  const env = {
    PSC_E2E_NO_KEY: '1',
    PSC_RUNTIME_DIR: runtime,
    PSC_PRIVATE_DATA_DIR: join(root, 'simulated-owner', 'private'),
  };
  expect(() => loadPrivatePaths(root, env)).toThrow(/must stay inside/i);
});

it.runIf(process.platform === 'win32')('rejects owner-runtime casing variants on Windows', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-case-'));
  roots.push(root);
  const env = {
    PSC_E2E_NO_KEY: '1',
    PSC_RUNTIME_DIR: join(root, 'RUNTIME'),
  };
  expect(() => loadPrivatePaths(root, env)).toThrow(/owner runtime/i);
});

it('rejects owner-runtime descendants whose names begin with two dots', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-dotchild-'));
  roots.push(root);
  const env = {
    PSC_E2E_NO_KEY: '1',
    PSC_RUNTIME_DIR: join(root, 'runtime', '..fictional'),
  };
  expect(() => loadPrivatePaths(root, env)).toThrow(/owner runtime/i);
});

it('rejects empty private-directory overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-empty-'));
  roots.push(root);
  const runtime = join(root, 'test-results', 'e2e-runtime-empty');
  expect(() =>
    loadPrivatePaths(root, {
      PSC_E2E_NO_KEY: '1',
      PSC_RUNTIME_DIR: runtime,
      PSC_PRIVATE_DATA_DIR: '',
    }),
  ).toThrow(/must not be empty/i);
  expect(() =>
    loadPrivatePaths(root, {
      PSC_E2E_NO_KEY: '1',
      PSC_RUNTIME_DIR: runtime,
      PSC_PRIVATE_KEY_DIR: '',
    }),
  ).toThrow(/must not be empty/i);
});

it('rejects a runtime that contains the owner runtime', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-isolation-parent-'));
  roots.push(root);
  expect(() =>
    loadPrivatePaths(root, {
      PSC_E2E_NO_KEY: '1',
      PSC_RUNTIME_DIR: root,
    }),
  ).toThrow(/owner runtime/i);
  expect(() =>
    loadPrivatePaths(root, {
      PSC_E2E_NO_KEY: '1',
      PSC_RUNTIME_DIR: root,
      PSC_PRIVATE_KEY_DIR: join(root, 'runtime', 'keys'),
    }),
  ).toThrow(/owner runtime/i);
});
