import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { prohibitedPath, scanText } from './check-publication-safety.mjs';

// Construct synthetic values at runtime so this test file itself does not
// contain the prohibited literal it is testing.
const syntheticUserPath = ['C:', 'Users', 'some-user', 'Documents', 'project'].join('\\');
const syntheticPublicPath = ['C:', 'Users', 'Public', 'example'].join('\\');
const syntheticKeyMarker = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
const syntheticGithubToken = ['ghp_', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('');

test('detects an absolute Windows user path without printing it', () => {
  const findings = scanText(`owner workspace: ${syntheticUserPath}`);
  assert.ok(findings.some((finding) => finding.category === 'absolute-user-path'));
  // JSON manifests store the same path with doubled backslashes.
  const jsonFindings = scanText(JSON.stringify({ path: syntheticUserPath }));
  assert.ok(jsonFindings.some((finding) => finding.category === 'absolute-user-path'));
});

test('detects a private-key marker and a high-confidence token', () => {
  const findings = scanText(`${syntheticKeyMarker}\nAAAA\n${syntheticGithubToken}`);
  assert.ok(findings.some((finding) => finding.category === 'private-key-marker'));
  assert.ok(findings.some((finding) => finding.category === 'github-token'));
});

test('accepts portable placeholders and rejects absolute user paths', () => {
  assert.deepEqual(scanText('<repo>/docs/evidence/example.md and <isolated-copy>/test'), []);
  assert.deepEqual(scanText(syntheticPublicPath), [{ category: 'absolute-user-path' }]);
  assert.deepEqual(prohibitedPath('docs/evidence/example.md'), []);
  assert.deepEqual(prohibitedPath('.env.example'), []);
});

test('rejects environment/database/key/ciphertext paths but not the example file', () => {
  assert.ok(prohibitedPath('.env').some((finding) => finding.category === 'environment-file'));
  assert.ok(prohibitedPath('data/store.sqlite').some((finding) => finding.category === 'database-file'));
  assert.ok(prohibitedPath('keys/master.key').some((finding) => finding.category === 'private-key-file'));
  assert.ok(
    prohibitedPath('runtime/blobs/aa/blob.psc').some(
      (finding) => finding.category === 'managed-ciphertext' || finding.category === 'runtime-directory',
    ),
  );
  assert.deepEqual(prohibitedPath('.env.example'), []);
});

test('CLI exits nonzero for a synthetic violation and explains only the category', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-publication-cli-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    writeFileSync(join(root, 'synthetic.txt'), `private path: ${syntheticUserPath}\n`);
    writeFileSync(join(root, 'synthetic.json'), JSON.stringify({ path: syntheticUserPath }));
    const result = spawnSync(process.execPath, [resolve('scripts/check-publication-safety.mjs')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /synthetic\.txt: absolute-user-path/);
    assert.match(result.stderr, /synthetic\.json: absolute-user-path/);
    assert.doesNotMatch(result.stderr, /some-user/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits zero for a clean fixture with portable placeholders', () => {
  const root = mkdtempSync(join(tmpdir(), 'psc-publication-clean-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    writeFileSync(join(root, 'README.md'), '<repo>/docs/evidence/example.md\n');
    const result = spawnSync(process.execPath, [resolve('scripts/check-publication-safety.mjs')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /publication-safety: no prohibited content/);
    assert.equal(result.stderr, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
