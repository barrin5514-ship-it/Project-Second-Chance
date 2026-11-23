import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findLeaks } from './verify-secrets.mjs';

/**
 * The secrets check is a source-inspection guard, not a security proof and not
 * a TDD behaviour test of the app. It runs against throwaway fixtures in the
 * OS temp directory; no real credential is used or needed.
 */

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'psc-secrets-'));
  for (const [relative, contents] of Object.entries(files)) {
    const full = join(root, relative);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
}

describe('findLeaks', () => {
  it('flags a Nuance API key pasted into source', () => {
    const root = project({
      'apps/web/src/bad.ts': "const key = 'nk_live_0123456789abcdefghij';\n",
    });
    const leaks = findLeaks({ root });
    assert.equal(leaks.length, 1);
    assert.equal(leaks[0].file, 'apps/web/src/bad.ts');
    assert.equal(leaks[0].rule, 'nuance-api-key');
  });

  it('flags a browser-side reference to a server-only environment value', () => {
    const root = project({
      'apps/web/src/worse.ts': 'const k = import.meta.env.NUANCE_API_KEY;\n',
    });
    const rules = findLeaks({ root }).map((leak) => leak.rule);
    assert.ok(rules.includes('browser-env-secret'), `got ${rules.join(',')}`);
  });

  it('flags a committed .env file', () => {
    const root = project({ '.env': 'NUANCE_API_KEY=nk_test_fixture\n' });
    assert.deepEqual(
      findLeaks({ root }).map((leak) => leak.rule),
      ['env-file'],
    );
  });

  it('does not flag synthetic test credentials, placeholders or names', () => {
    const root = project({
      'apps/server/src/routes.test.ts': "const FAKE_KEY = 'nk_test_000000000000000000000000';\n",
      '.env.example': 'NUANCE_API_KEY=\n',
      'apps/server/src/config.ts': "const NAME = 'NUANCE_API_KEY';\n",
    });
    assert.deepEqual(findLeaks({ root }), []);
  });

  it('reports a line number but never the matched value', () => {
    const root = project({
      'apps/server/src/leak.ts':
        "export const x = 1;\nexport const k = 'nk_live_0123456789abcdefghij';\n",
    });
    const [leak] = findLeaks({ root });
    assert.equal(leak.line, 2);
    assert.ok(!JSON.stringify(leak).includes('0123456789abcdefghij'));
  });

  it('scopes to tracked files when a Git repository is present', () => {
    const root = project({ 'apps/web/src/app.ts': 'export const ok = 1;\n' });
    // An ignored local `.env` is expected beside the code, not a finding...
    writeFileSync(join(root, '.env'), 'NUANCE_API_KEY=nk_fixture_value_not_read\n');
    writeFileSync(join(root, '.gitignore'), '.env\n');
    // ...while a tracked key-looking literal is one.
    writeFileSync(join(root, 'leaky.ts'), "const k = 'nk_live_0123456789abcdefghij';\n");
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['add', '.gitignore', 'leaky.ts', 'apps'], { cwd: root });

    const findings = findLeaks({ root });
    assert.deepEqual(
      findings.map((leak) => `${leak.file}:${leak.rule}`),
      ['leaky.ts:nuance-api-key'],
    );
  });

  it('never reads the real .env to compare values', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('./verify-secrets.mjs', import.meta.url), 'utf8');
    // It may IGNORE a .env file, but must never read or parse one.
    assert.ok(!/readFileSync\([^)]*\.env['"]?\s*\)/.test(source));
  });
});
