#!/usr/bin/env node
/**
 * Committed-checkpoint integrity checks for the BGLAD coordinator.
 *
 * A verification run is only meaningful against a committed snapshot. This
 * module rejects missing required files, modifications to required files, and
 * (when requested) any working-tree overlay.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function git(project, args) {
  const result = spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' });
  return { status: result.status, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

export function requiredPaths(task = {}) {
  const groups = [task.requiredFiles, task.sourceDependencies, task.testDependencies];
  return [...new Set(groups.flatMap((value) => (Array.isArray(value) ? value : [])).filter(Boolean))];
}

export function checkCheckpoint(project, task = {}) {
  const root = resolve(project);
  const errors = [];
  const warnings = [];
  const head = git(root, ['rev-parse', 'HEAD']);
  const branch = git(root, ['branch', '--show-current']);
  const status = git(root, ['status', '--porcelain=v1']);
  if (head.status !== 0 || !head.out) errors.push('HEAD is not a readable commit');
  if (task.requireCleanCheckpoint === true && status.out) {
    errors.push('checkpoint is not clean; uncommitted overlay is present');
  }
  const paths = requiredPaths(task);
  for (const path of paths) {
    const committed = git(root, ['cat-file', '-e', `HEAD:${path}`]);
    if (committed.status !== 0) {
      errors.push(`required dependency is not committed at HEAD: ${path}`);
      continue;
    }
    const tracked = git(root, ['ls-files', '--error-unmatch', '--', path]);
    if (tracked.status !== 0) errors.push(`required dependency is not tracked: ${path}`);
    const overlay = git(root, ['status', '--porcelain=v1', '--', path]);
    if (overlay.out) errors.push(`required dependency has an uncommitted overlay: ${path}`);
    const diff = git(root, ['diff', '--quiet', 'HEAD', '--', path]);
    if (diff.status === 1) errors.push(`required dependency differs from HEAD: ${path}`);
  }
  if (paths.length === 0) warnings.push('no required dependency inventory supplied');
  return {
    ok: errors.length === 0,
    head: head.out || null,
    branch: branch.out || null,
    status: status.out,
    requiredFiles: paths,
    errors,
    warnings,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const taskIndex = process.argv.indexOf('--task');
  const projectIndex = process.argv.indexOf('--project');
  const task = taskIndex >= 0 ? JSON.parse((await import('node:fs')).readFileSync(process.argv[taskIndex + 1], 'utf8')) : {};
  const result = checkCheckpoint(projectIndex >= 0 ? process.argv[projectIndex + 1] : process.cwd(), task);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
