import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAvatarConfig, PROJECT_ROOT } from './config';

// Synthetic fixtures only. No real credential ever enters these tests.
const FAKE_KEY = 'nk_test_000000000000000000000000';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'psc-cfg-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeEnv(dir: string, body: string): void {
  writeFileSync(join(dir, '.env'), body, 'utf8');
}

describe('loadAvatarConfig', () => {
  it('loads a .env from an explicit root independent of the process CWD', () => {
    writeEnv(tmp, `NUANCE_API_KEY=${FAKE_KEY}\n`);
    const originalCwd = process.cwd();
    process.chdir(tmpdir());
    try {
      const cfg = loadAvatarConfig({ rootDir: tmp });
      expect(cfg.hasApiKey).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('reports a missing key without throwing and without inventing one', () => {
    writeEnv(tmp, 'NUANCE_PERSONA_ID=mira\n');
    const cfg = loadAvatarConfig({ rootDir: tmp });
    expect(cfg.hasApiKey).toBe(false);
  });

  it('reports absence when no .env file exists at all', () => {
    const cfg = loadAvatarConfig({ rootDir: tmp });
    expect(cfg.hasApiKey).toBe(false);
  });

  it('never exposes the key value on the returned config object', () => {
    writeEnv(tmp, `NUANCE_API_KEY=${FAKE_KEY}\n`);
    const cfg = loadAvatarConfig({ rootDir: tmp });
    const serialized = JSON.stringify(cfg);
    expect(serialized).not.toContain(FAKE_KEY);
    expect(serialized).not.toContain('nk_');
    for (const value of Object.values(cfg)) {
      expect(String(value)).not.toContain(FAKE_KEY);
    }
  });

  it('treats a blank or whitespace-only key as missing', () => {
    writeEnv(tmp, 'NUANCE_API_KEY=   \n');
    const cfg = loadAvatarConfig({ rootDir: tmp });
    expect(cfg.hasApiKey).toBe(false);
  });

  it('resolves the project root as the directory containing package.json', () => {
    expect(PROJECT_ROOT.endsWith('ProjectSecondChance')).toBe(true);
  });

  it('does not let a synthetic key printed via toString leak through the object', () => {
    writeEnv(tmp, `NUANCE_API_KEY=${FAKE_KEY}\n`);
    const cfg = loadAvatarConfig({ rootDir: tmp });
    expect(cfg.toString()).not.toContain(FAKE_KEY);
    expect(String(cfg)).not.toContain(FAKE_KEY);
  });

  it('creates no directory and writes no file under the root', () => {
    writeEnv(tmp, `NUANCE_API_KEY=${FAKE_KEY}\n`);
    const before = readdirSafe(tmp);
    loadAvatarConfig({ rootDir: tmp });
    expect(readdirSafe(tmp)).toEqual(before);
  });
});

function readdirSafe(dir: string): string[] {
  try {
    mkdirSync(dir, { recursive: true });
    return require('node:fs').readdirSync(dir).sort();
  } catch {
    return [];
  }
}
