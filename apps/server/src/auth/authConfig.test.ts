import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAuthSettings } from './authConfig';
import { loadPrivatePaths } from '../private/privateConfig';

const dirs: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'psc-auth-config-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('auth runtime settings', () => {
  it('generates a long secret once into the ignored runtime directory and reuses it', () => {
    const root = tempRoot();
    const first = loadAuthSettings(root);
    const second = loadAuthSettings(root);

    expect(first.sessionSecret.length).toBeGreaterThanOrEqual(32);
    expect(first.sessionSecret).toBe(second.sessionSecret);
    expect(first.databasePath).toBe(join(root, 'runtime', 'psc-auth.sqlite'));
    expect(readFileSync(join(root, 'runtime', 'auth-session-secret'), 'utf8').trim()).toBe(
      first.sessionSecret,
    );
  });

  it('rejects E2E mode without an isolated runtime before touching the project runtime', () => {
    const root = tempRoot();
    expect(() =>
      loadAuthSettings(root, { PSC_E2E_NO_KEY: '1', PSC_E2E_AUTH_RELAXED: '1' }),
    ).toThrow(/PSC_RUNTIME_DIR/);
    expect(() => loadAuthSettings(root, { PSC_E2E_AUTH_RELAXED: '1' })).toThrow(
      /PSC_RUNTIME_DIR/,
    );
  });

  it('fails closed for an existing short secret instead of replacing it', () => {
    const root = tempRoot();
    loadAuthSettings(root);
    writeFileSync(join(root, 'runtime', 'auth-session-secret'), 'too-short');
    expect(() => loadAuthSettings(root)).toThrow(/too short/i);
  });

  it('moves auth database/secret, private keys and blobs together under PSC_RUNTIME_DIR', () => {
    const root = tempRoot();
    const isolated = join(root, 'isolated-runtime');
    const env = { PSC_RUNTIME_DIR: isolated };
    const settings = loadAuthSettings(root, env);
    const paths = loadPrivatePaths(root, env);

    expect(settings.databasePath).toBe(join(isolated, 'psc-auth.sqlite'));
    expect(settings.databasePath.startsWith(join(root, 'runtime'))).toBe(false);
    expect(paths.dataDir).toBe(join(isolated, 'private'));
    expect(paths.keyDir).toBe(join(isolated, 'keys'));
    expect(readFileSync(join(isolated, 'auth-session-secret'), 'utf8').trim()).toBe(
      settings.sessionSecret,
    );
  });
});
