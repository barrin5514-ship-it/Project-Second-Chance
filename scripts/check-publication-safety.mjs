#!/usr/bin/env node
/**
 * Publication-safety check.
 *
 * Scans tracked and untracked (non-ignored) working files for prohibited
 * content. It never prints a matched value: only the file and category.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_RULES = [
  { id: 'absolute-user-path', re: /[A-Za-z]:[\\/]{1,2}Users[\\/]/i },
  { id: 'posix-user-path', re: /\/Users\/[^/\s]+\// },
  { id: 'private-key-marker', re: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'github-token', re: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { id: 'generic-secret-token', re: /sk-[A-Za-z0-9]{20,}/ },
];

const PROHIBITED_NAMES = [
  { id: 'environment-file', re: /(^|\/)\.env(?:$|\.)/ },
  { id: 'database-file', re: /\.(?:db|sqlite|sqlite3)(?:$|-)/i },
  { id: 'private-key-file', re: /\.(?:key|pem|p12|pfx)$/i },
  { id: 'managed-ciphertext', re: /\.psc$/i },
  { id: 'runtime-directory', re: /(^|\/)(?:runtime|keys|test-results|playwright-report)\//i },
];

export function scanText(text) {
  const findings = [];
  for (const rule of CONTENT_RULES) {
    if (rule.re.test(text)) findings.push({ category: rule.id });
  }
  return findings;
}

export function prohibitedPath(path) {
  if (path === '.env.example') return [];
  return PROHIBITED_NAMES.filter((rule) => rule.re.test(path)).map((rule) => ({
    category: rule.id,
  }));
}

function allowedPath(path) {
  return !path.startsWith('.git/') && !path.startsWith('node_modules/');
}

export function scanRoot(root) {
  const cwd = resolve(root);
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(allowedPath)
    .sort();
  const findings = [];
  for (const path of paths) {
    const absolute = resolve(cwd, path);
    try {
      if (!statSync(absolute).isFile() || statSync(absolute).size > 5_000_000) continue;
    } catch {
      continue;
    }
    findings.push(...prohibitedPath(path).map((entry) => ({ path, ...entry })));
    let text;
    try {
      text = readFileSync(absolute, 'utf8');
    } catch {
      continue;
    }
    findings.push(...scanText(text).map((entry) => ({ path, ...entry })));
  }
  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = scanRoot(process.cwd());
  if (findings.length === 0) {
    console.log('publication-safety: no prohibited content found in tracked/untracked working files.');
    process.exit(0);
  }
  for (const finding of findings) {
    console.error(`publication-safety: ${relative(process.cwd(), finding.path)}: ${finding.category}`);
  }
  process.exit(1);
}
