#!/usr/bin/env node
/**
 * Source-inspection guard for the V0-S1 prototype.
 *
 * This is NOT a security proof and NOT a test of application behaviour. It
 * looks for obvious credential leaks in TRACKED source: a Nuance key pasted
 * into code, a server-only environment value referenced from browser code, or
 * a tracked `.env` / key file.
 *
 * Scope: when Git is available the list of files comes from
 * `git ls-files`, so untracked and ignored files (the real `.env`, local keys,
 * setup scratch) are out of scope and are never opened. A local `.env` beside
 * the code is expected; a committed one is not. With no Git repository the
 * walker falls back to skipping ignored/known-local paths.
 *
 * It never opens a `.env` file, never reads the process environment and never
 * prints a matched value: only the file, line and rule. Findings are reported
 * as `file:line rule`, which is enough to locate a leak without reproducing it.
 *
 * Usage: npm run verify:secrets   (exit 0 clean, exit 1 on any finding)
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Directories that are never project source. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'test-results',
  'playwright-report',
  '.agents',
  '_bmad',
  '_bmad-output',
  '.setup',
  '.vscode',
  'coverage',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const KEY_EXTENSIONS = ['.key', '.pem', '.p12', '.pfx'];
const MAX_BYTES = 512 * 1024;

/** A `.env` file is a leak merely by being committed (examples are fine). */
const ENV_FILE = /^\.env(\.(?!example$)[\w.-]+)?$/;

/** This guard's own test file holds synthetic look-alikes on purpose. */
const FIXTURE_FILE = 'scripts/verify-secrets.test.mjs';

/**
 * Rules run per line. `pattern` matches; `allow` opts a line back out (test
 * doubles, placeholders, assertions that merely mention a synthetic value).
 */
const RULES = [
  {
    rule: 'nuance-api-key',
    pattern: /\bnk_[A-Za-z0-9_]{16,}\b/,
    allow: /\bnk_test_/,
  },
  {
    rule: 'browser-env-secret',
    pattern: /import\.meta\.env\.[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*/,
  },
  {
    rule: 'session-token-literal',
    pattern: /['"`]st_[A-Za-z0-9_]{16,}['"`]/,
    allow: /st_test_|FAKE_TOKEN|tokens\.push|toBe\(|toEqual\(|expect\(/,
  },
];

/** Browser code must never name a server-only credential. */
function isBrowserPath(projectRelative) {
  const parts = projectRelative.split('/');
  return parts[0] === 'apps' && parts[1] === 'web';
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function checkFile(full, projectRelative, findings) {
  if (KEY_EXTENSIONS.some((extension) => projectRelative.endsWith(extension))) {
    findings.push({ file: projectRelative, line: 0, rule: 'key-file' });
    return;
  }
  if (!SOURCE_EXTENSIONS.some((extension) => projectRelative.endsWith(extension))) return;
  if (projectRelative === FIXTURE_FILE) return;

  const browser = isBrowserPath(projectRelative);
  const lines = readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((text, index) => {
    for (const { rule, pattern, allow } of RULES) {
      if (rule === 'browser-env-secret' && !browser) continue;
      if (!pattern.test(text)) continue;
      if (allow !== undefined && allow.test(text)) continue;
      findings.push({ file: projectRelative, line: index + 1, rule });
    }
  });
}

/** Tracked paths, or null when this is not a Git working tree. */
function trackedFiles(root) {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.split('\0').filter((entry) => entry.length > 0).map(toPosix);
  } catch {
    return null;
  }
}

function walk(root, dir, findings) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const relativePath = toPosix(relative(root, full));
    if (SKIP_DIRS.has(entry)) continue;
    if (ENV_FILE.test(basename(entry))) {
      findings.push({ file: relativePath, line: 0, rule: 'env-file' });
      continue;
    }
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(root, full, findings);
      continue;
    }
    if (stats.size > MAX_BYTES) continue;
    checkFile(full, relativePath, findings);
  }
}

/**
 * Scans `root` (default: this project) and returns findings. Exported so the
 * check can be exercised against throwaway fixtures without touching this
 * repository or any real credential.
 */
export function findLeaks({ root = ROOT } = {}) {
  const findings = [];
  const tracked = trackedFiles(root);
  if (tracked === null) {
    walk(root, root, findings);
  } else {
    for (const projectRelative of tracked) {
      const name = basename(projectRelative);
      if (ENV_FILE.test(name)) {
        findings.push({ file: projectRelative, line: 0, rule: 'env-file' });
        continue;
      }
      const full = join(root, projectRelative);
      let stats;
      try {
        stats = statSync(full);
      } catch {
        // Listed by Git but deleted in the working tree: nothing to scan.
        continue;
      }
      if (!stats.isFile() || stats.size > MAX_BYTES) continue;
      checkFile(full, projectRelative, findings);
    }
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const findings = findLeaks();
  if (findings.length === 0) {
    console.log('verify-secrets: no credential leak patterns found in tracked source.');
    process.exit(0);
  }
  console.error(`verify-secrets: ${findings.length} finding(s). No values are printed.`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} ${finding.rule}`);
  }
  process.exit(1);
}
