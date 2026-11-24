import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAuthSettings } from './authConfig';

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

  it('fails closed for an existing short secret instead of replacing it', () => {
    const root = tempRoot();
    loadAuthSettings(root);
    writeFileSync(join(root, 'runtime', 'auth-session-secret'), 'too-short');
    expect(() => loadAuthSettings(root)).toThrow(/too short/i);
  });
});
