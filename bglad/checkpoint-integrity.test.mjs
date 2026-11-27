import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkCheckpoint } from './checkpoint-integrity.mjs';

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'bglad-checkpoint-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'checkpoint@example.test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Checkpoint Test'], { cwd: root });
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'test'));
  writeFileSync(join(root, 'src', 'feature.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'test', 'feature.test.ts'), 'test("value", () => {});\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'checkpoint'], { cwd: root });
  return root;
}

test('clean committed source and test dependencies pass', () => {
  const root = repo();
  try {
    const result = checkCheckpoint(root, {
      requiredFiles: ['src/feature.ts', 'test/feature.test.ts'],
      requireCleanCheckpoint: true,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a missing committed implementation dependency fails', () => {
  const root = repo();
  try {
    const result = checkCheckpoint(root, { requiredFiles: ['src/missing.ts'] });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /not committed at HEAD/.test(error)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an uncommitted overlay on a required file fails', () => {
  const root = repo();
  try {
    writeFileSync(join(root, 'src', 'feature.ts'), 'export const value = 2;\n');
    const result = checkCheckpoint(root, {
      requiredFiles: ['src/feature.ts'],
      requireCleanCheckpoint: true,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /uncommitted overlay|differs from HEAD|not clean/.test(error)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('unrelated uncommitted work is preserved when no required path is overlaid', () => {
  const root = repo();
  try {
    writeFileSync(join(root, 'unrelated.txt'), 'preserve me\n');
    const result = checkCheckpoint(root, { requiredFiles: ['src/feature.ts'] });
    assert.equal(result.ok, true);
    assert.equal(result.status.includes('unrelated.txt'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
