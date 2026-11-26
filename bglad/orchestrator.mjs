#!/usr/bin/env node
/*
 * Project-local BGLAD coordinator.
 *
 * The owner gives one assignment to DeepSeek. The builder implements it, then
 * runs this coordinator against the exact working-tree checkpoint. The
 * coordinator invokes Codex (non-interactive tester) and Claude Code
 * (non-interactive reviewer), retains machine-readable state/logs, enforces
 * bounded corrective attempts and stops safely when an agent cannot run.
 *
 * It never merges, pushes, deploys, migrates, or reads application secrets.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BG = resolve(HERE, '..');
const STATE_DIR = join(DEFAULT_BG, '.bglad', 'state');
const RUNS_DIR = join(DEFAULT_BG, '.bglad', 'runs');
const LOCK_PATH = join(STATE_DIR, 'active.lock');
const DSH_PATCH_PATH = join(HERE, 'headless-account.patch.yml');
const DSH_BIN_PATH = process.env.DSH_BIN || join(
  process.env.LOCALAPPDATA ?? '',
  'Programs',
  'DeepSeek Harness',
  'resources',
  'runtime',
  'cli',
  'bin',
  'dsh.cmd',
);
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

function usage() {
  console.log(`BGLAD coordinator\n\nUsage:\n  node bglad/orchestrator.mjs run --task <task.json> [--builder-external|--builder-dsh]\n  node bglad/orchestrator.mjs status --task-id <id>\n  node bglad/orchestrator.mjs preflight\n\nTask fields: id, project, assignment, acceptance, branch, baseCommit,\nverifyCommands, testRoot, reviewerPrompt, builderPrompt.`);
}

function timestamp() {
  return new Date().toISOString();
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function safeProject(input) {
  const project = resolve(input);
  if (!existsSync(join(project, 'AGENTS.md')) && !existsSync(join(project, '.git'))) {
    throw new Error(`project identity not confirmed: ${project}`);
  }
  return project;
}

function git(project, args) {
  const result = spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' });
  return { status: result.status, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

function manifest(project) {
  const diff = git(project, ['diff', '--binary', 'HEAD']);
  const status = git(project, ['status', '--porcelain=v1']);
  const head = git(project, ['rev-parse', 'HEAD']);
  const branch = git(project, ['branch', '--show-current']);
  const untracked = git(project, ['ls-files', '--others', '--exclude-standard']);
  const untrackedHashes = untracked.out
    .split(/\r?\n/)
    .filter(Boolean)
    .sort()
    .map((path) => {
      try {
        return `${path}:${sha(readFileSync(join(project, path)))}`;
      } catch {
        return `${path}:unreadable`;
      }
    })
    .join('\n');
  return {
    head: head.out || null,
    branch: branch.out || null,
    status: status.out,
    diffHash: sha(`${diff.out}\n${status.out}\n${untrackedHashes}`),
    capturedAt: timestamp(),
  };
}

function acquireLock(taskId) {
  mkdirSync(STATE_DIR, { recursive: true });
  if (existsSync(LOCK_PATH)) {
    const existing = readJson(LOCK_PATH);
    const age = Date.now() - Date.parse(existing.startedAt);
    let alive = false;
    try {
      process.kill(existing.pid, 0);
      alive = true;
    } catch {
      alive = false;
    }
    if (alive && age < 12 * 60 * 60 * 1000 && existing.pid !== process.pid) {
      throw new Error(`another coordinator run is active: task=${existing.taskId} pid=${existing.pid}`);
    }
    rmSync(LOCK_PATH, { force: true });
  }
  writeFileSync(LOCK_PATH, JSON.stringify({ taskId, pid: process.pid, startedAt: timestamp() }), {
    flag: 'wx',
    encoding: 'utf8',
  });
  return () => rmSync(LOCK_PATH, { force: true });
}

function run(command, args, options) {
  return new Promise((resolvePromise) => {
    const startedAt = timestamp();
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: true,
      windowsVerbatimArguments: options.windowsVerbatimArguments === true,
      shell: options.shell === true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = options.timeoutMs
      ? setTimeout(() => child.kill(), options.timeoutMs)
      : undefined;
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      options.onStdout?.(String(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      resolvePromise({
        status: -1,
        signal: null,
        stdout,
        stderr: `${stderr}${error instanceof Error ? error.message : String(error)}`,
        startedAt,
        endedAt: timestamp(),
      });
    });
    child.on('close', (status, signal) => {
      if (timer) clearTimeout(timer);
      resolvePromise({ status, signal, stdout, stderr, startedAt, endedAt: timestamp() });
    });
    child.stdin.end(options.input ?? '');
  });
}

function retryable(status, signal) {
  return status === 0 && !signal;
}

function parseAgentJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)); } catch {}
  }
  return null;
}

function validateResult(value, agent) {
  if (!value || typeof value !== 'object') {
    return { verdict: 'BLOCKED', summary: `${agent} did not return a structured result`, findings: [] };
  }
  const verdict = String(value.verdict ?? '').toUpperCase();
  if (!['PASS', 'CHANGES_REQUIRED', 'BLOCKED'].includes(verdict)) {
    return { verdict: 'BLOCKED', summary: `${agent} returned an invalid verdict`, findings: [] };
  }
  return {
    verdict,
    summary: typeof value.summary === 'string' ? value.summary : '',
    findings: Array.isArray(value.findings) ? value.findings : [],
    commands: Array.isArray(value.commands) ? value.commands : [],
  };
}

function testerPrompt(task, checkpoint) {
  return `You are Codex, the independent tester. Act read-only: do not modify application source or tests, do not commit, push, merge, deploy, or access real runtime data, credentials or .env. Project root: ${task.project}. Task: ${task.assignment}. Acceptance criteria: ${JSON.stringify(task.acceptance ?? [])}. Exact branch: ${checkpoint.branch}; HEAD: ${checkpoint.head}; working-tree status: ${checkpoint.status || '(clean)'}; coordinator manifest hash: ${checkpoint.diffHash}. The manifest hash is computed by the coordinator over git diff, git status and sorted untracked-file content; do NOT independently recompute that custom value and do not BLOCKED solely because you cannot reproduce it. Verify the actual branch, HEAD, status and source files are consistent with the supplied values. Tests: ${JSON.stringify(task.verifyCommands ?? [])}. Distinguish confirmed defects from setup failures. Return ONLY one JSON object: {"verdict":"PASS|CHANGES_REQUIRED|BLOCKED","summary":"...","findings":[{"id":"...","severity":"...","file":"...","issue":"...","evidence":"...","requiredAction":"..."}],"commands":[{"command":"...","exit":0,"result":"..."}],"limitations":["..."]}. Do not claim a check you did not run. If the actual source checkpoint changes unexpectedly, BLOCKED.`;
}

function reviewerPrompt(task, checkpoint, tester) {
  return `You are Claude Code, the independent reviewer. Act read-only: do not modify source/tests, commit, push, merge, deploy, or access owner runtime/keys/.env. Project root: ${task.project}. Task: ${task.assignment}. Acceptance criteria: ${JSON.stringify(task.acceptance ?? [])}. Exact branch: ${checkpoint.branch}; HEAD: ${checkpoint.head}; working-tree status: ${checkpoint.status || '(clean)'}; coordinator manifest hash: ${checkpoint.diffHash}. The manifest hash is coordinator-owned (git diff + status + sorted untracked content); do not reject solely because you cannot reproduce the custom value. Verify the actual tree/status. CODEX TESTER EVIDENCE: ${JSON.stringify(tester ?? {})}. Review the actual source and the tester evidence. Review security/privacy across the resulting source, not only changed lines. A confirmed security/privacy defect in the resulting source is CHANGES_REQUIRED even if it predates this change; report its scope/severity separately from the acceptance verdict. Assess architecture, implementation quality, acceptance criteria, regression risk and evidence integrity. Disclose if you authored any reviewed code. Distinguish confirmed issues from hypotheses and do not demand out-of-scope future features. Return ONLY one JSON object: {"verdict":"PASS|CHANGES_REQUIRED|BLOCKED","summary":"...","findings":[{"id":"...","severity":"...","file":"...","issue":"...","requiredAction":"..."}],"limitations":["..."],"independence":"..."}. Do not claim tests you did not run.`;
}

function builderCorrectionPrompt(task, findings) {
  return `You are DeepSeek, the Builder. Correct only the following independently verified findings for task ${task.id}. Use genuine RED -> GREEN -> REFACTOR and maintained regression tests; do not weaken assertions. Do not commit, push, merge, deploy, migrate, or access owner runtime/.env/keys. Preserve unrelated work. Project: ${task.project}. Findings: ${JSON.stringify(findings)}. Run the project's required checks. Return a concise summary of changed files, RED/GREEN commands and remaining limitations.`;
}

async function agentCodex(task, checkpoint, runDir) {
  const outFile = join(runDir, 'codex-last.txt');
  const prompt = testerPrompt(task, checkpoint);
  const sandbox = task.codexSandbox === 'workspace-write' ? 'workspace-write' : 'read-only';
  const args = ['exec', '--skip-git-repo-check', '--ephemeral', '--json'];
  if (task.codexSandbox !== 'profile') args.push('-s', sandbox);
  args.push('-C', task.project, '-o', outFile, '-');
  writeFileSync(join(runDir, 'codex-prompt.txt'), prompt, 'utf8');
  const result = await run(CODEX_BIN, args, {
    cwd: task.project,
    input: prompt,
    timeoutMs: task.agentTimeoutMs ?? 900000,
  });
  writeFileSync(join(runDir, 'codex-stdout.log'), result.stdout, 'utf8');
  writeFileSync(join(runDir, 'codex-stderr.log'), result.stderr, 'utf8');
  const raw = existsSync(outFile) ? readFileSync(outFile, 'utf8') : result.stdout;
  const parsed = parseAgentJson(raw);
  return { ...result, parsed: validateResult(parsed, 'Codex'), raw };
}

async function agentClaude(task, checkpoint, runDir, tester) {
  const prompt = reviewerPrompt(task, checkpoint, tester);
  writeFileSync(join(runDir, 'claude-prompt.txt'), prompt, 'utf8');
  const result = await run(CLAUDE_BIN, [
    '-p', prompt, '--output-format', 'json', '--no-session-persistence',
    '--permission-mode', 'default', '--allowedTools', 'Read,Glob,Grep',
  ], { cwd: task.project, timeoutMs: task.agentTimeoutMs ?? 900000 });
  writeFileSync(join(runDir, 'claude-stdout.log'), result.stdout, 'utf8');
  writeFileSync(join(runDir, 'claude-stderr.log'), result.stderr, 'utf8');
  const envelope = parseAgentJson(result.stdout);
  if (envelope?.is_error) {
    return { ...result, parsed: { verdict: 'BLOCKED', summary: String(envelope.result ?? 'Claude error'), findings: [] }, raw: result.stdout };
  }
  const inner = typeof envelope?.result === 'string' ? parseAgentJson(envelope.result) : envelope;
  return { ...result, parsed: validateResult(inner, 'Claude'), raw: result.stdout };
}

async function agentDshBuilder(task, prompt, runDir) {
  if (!existsSync(DSH_BIN_PATH)) {
    return { status: 1, stdout: '', stderr: `dsh executable not found: ${DSH_BIN_PATH}`, parsed: null };
  }
  if (!existsSync(DSH_PATCH_PATH)) {
    return { status: 1, stdout: '', stderr: `headless account patch not found: ${DSH_PATCH_PATH}`, parsed: null };
  }
  const psQuote = (value) => `'${value.replace(/'/g, "''")}'`;
  const command = `& ${psQuote(DSH_BIN_PATH)} --profile headless --patch ${psQuote(DSH_PATCH_PATH)} --permission-mode workspace-write --approval-policy never -`;
  const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    cwd: task.project,
    input: prompt,
    timeoutMs: task.agentTimeoutMs ?? 1800000,
  });
  writeFileSync(join(runDir, 'builder-stdout.log'), result.stdout, 'utf8');
  writeFileSync(join(runDir, 'builder-stderr.log'), result.stderr, 'utf8');
  return result;
}

function saveState(taskId, state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(join(STATE_DIR, `${taskId}.json`), JSON.stringify(state, null, 2), 'utf8');
}

function preflight() {
  const codex = spawnSync(CODEX_BIN, ['login', 'status'], { encoding: 'utf8' });
  const codexText = `${codex.stdout ?? ''}${codex.stderr ?? ''}`;
  const claude = spawnSync(CLAUDE_BIN, ['auth', 'status'], { encoding: 'utf8' });
  const claudeText = `${claude.stdout ?? ''}${claude.stderr ?? ''}`;
  let claudeLoggedIn = false;
  try { claudeLoggedIn = JSON.parse(claudeText).loggedIn === true; } catch {}
  const credentialsPath = join(process.env.DSH_HOME ?? '', '.credentials.yaml');
  const report = {
    checkedAt: timestamp(),
    codex: { path: CODEX_BIN, available: codex.status === 0, loggedIn: /Logged in|ChatGPT/i.test(codexText), text: codexText.trim().slice(0, 300) },
    claude: { path: CLAUDE_BIN, available: claudeLoggedIn, loggedIn: claudeLoggedIn, text: claudeText.trim().slice(0, 500) },
    dsh: {
      path: DSH_BIN_PATH,
      available: existsSync(DSH_BIN_PATH),
      credentialsFilePresent: existsSync(credentialsPath),
      headlessAccountPatch: existsSync(DSH_PATCH_PATH),
      accountRoute: 'deepseek-account (installed account/auth plugins; no API key stored in project)',
    },
  };
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(join(STATE_DIR, 'preflight.json'), JSON.stringify(report, null, 2), 'utf8');
  return report;
}

async function runTask(taskPath, builderMode) {
  const task = readJson(taskPath);
  for (const key of ['id', 'project', 'assignment']) {
    if (typeof task[key] !== 'string' || task[key].trim() === '') throw new Error(`task.${key} is required`);
  }
  const project = safeProject(task.project);
  task.project = project;
  const release = acquireLock(task.id);
  mkdirSync(RUNS_DIR, { recursive: true });
  const runDir = join(RUNS_DIR, `${task.id}-${Date.now()}`);
  mkdirSync(runDir, { recursive: true });
  const state = {
    taskId: task.id,
    project,
    branch: git(project, ['branch', '--show-current']).out,
    baseCommit: task.baseCommit ?? git(project, ['rev-parse', 'HEAD']).out,
    phase: 'starting',
    builderMode,
    attempt: 0,
    findings: [],
    runs: [],
    runDir,
    startedAt: timestamp(),
    updatedAt: timestamp(),
    status: 'RUNNING',
  };
  const save = () => {
    state.updatedAt = timestamp();
    saveState(task.id, state);
  };
  save();

  try {
    const pre = preflight();
    state.preflight = pre;
    state.source = manifest(project);
    save();
    if (task.branch && state.branch !== task.branch) {
      state.status = 'BLOCKED';
      state.blocker = `branch mismatch: expected ${task.branch}, got ${state.branch}`;
      save();
      return state;
    }

    if (builderMode === 'dsh') {
      state.phase = 'builder';
      save();
      const prompt = task.builderPrompt ?? `Implement the assigned task using approved BMAD/TDD: ${task.assignment}`;
      const result = await agentDshBuilder(task, prompt, runDir);
      state.runs.push({ agent: 'deepseek-builder', status: result.status, stderr: result.stderr.slice(-1000) });
      state.source = manifest(project);
      save();
      if (result.status !== 0) {
        state.status = 'BLOCKED';
        state.blocker = 'DeepSeek headless builder unavailable or failed';
        save();
        return state;
      }
    }

    for (let cycle = 0; cycle < (task.maxCycles ?? 2); cycle += 1) {
      state.attempt = cycle;
      state.phase = 'codex-test';
      save();
      const checkpoint = manifest(project);
      state.source = checkpoint;
      const tester = await agentCodex(task, checkpoint, runDir);
      state.runs.push({ agent: 'codex', status: tester.status, verdict: tester.parsed.verdict, summary: tester.parsed.summary });
      save();
      if (tester.status !== 0 || tester.parsed.verdict === 'BLOCKED') {
        state.status = 'BLOCKED';
        state.blocker = `Codex unavailable or blocked: ${tester.parsed.summary || tester.stderr.slice(-500)}`;
        save();
        return state;
      }
      if (tester.parsed.verdict !== 'PASS') {
        state.findings = tester.parsed.findings;
        if (builderMode !== 'dsh') {
          state.status = 'CHANGES_REQUIRED';
          state.blocker = 'Codex did not pass; DeepSeek builder correction requires an available builder adapter';
          save();
          return state;
        }
        state.phase = 'builder-correction';
        save();
        await agentDshBuilder(task, builderCorrectionPrompt(task, state.findings), runDir);
        state.source = manifest(project);
        save();
        continue;
      }
      const afterTester = manifest(project);
      if (
        afterTester.head !== checkpoint.head ||
        afterTester.branch !== checkpoint.branch ||
        afterTester.diffHash !== checkpoint.diffHash
      ) {
        state.status = 'BLOCKED';
        state.blocker = 'source checkpoint changed during independent Codex testing';
        state.source = afterTester;
        save();
        return state;
      }

      state.phase = 'claude-review';
      save();
      const reviewer = await agentClaude(task, checkpoint, runDir, tester.parsed);
      state.runs.push({ agent: 'claude', status: reviewer.status, verdict: reviewer.parsed.verdict, summary: reviewer.parsed.summary });
      save();
      if (reviewer.status !== 0 || reviewer.parsed.verdict === 'BLOCKED') {
        state.status = 'BLOCKED';
        state.blocker = `Claude unavailable or blocked: ${reviewer.parsed.summary || reviewer.stderr.slice(-500)}`;
        save();
        return state;
      }
      if (reviewer.parsed.verdict !== 'PASS') {
        state.findings = reviewer.parsed.findings;
        if (builderMode !== 'dsh') {
          state.status = 'CHANGES_REQUIRED';
          state.blocker = 'Claude did not pass; DeepSeek builder correction requires an available builder adapter';
          save();
          return state;
        }
        state.phase = 'builder-correction';
        save();
        await agentDshBuilder(task, builderCorrectionPrompt(task, state.findings), runDir);
        state.source = manifest(project);
        save();
        continue;
      }
      const afterReviewer = manifest(project);
      if (
        afterReviewer.head !== checkpoint.head ||
        afterReviewer.branch !== checkpoint.branch ||
        afterReviewer.diffHash !== checkpoint.diffHash
      ) {
        state.status = 'BLOCKED';
        state.blocker = 'source checkpoint changed during independent Claude review';
        state.source = afterReviewer;
        save();
        return state;
      }

      state.status = 'PASS';
      state.phase = 'complete';
      state.completedAt = timestamp();
      state.finalCheckpoint = manifest(project);
      save();
      return state;
    }

    state.status = 'BLOCKED';
    state.blocker = 'maximum correction cycles exhausted';
    save();
    return state;
  } finally {
    writeFileSync(join(runDir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
    release();
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'preflight') {
    console.log(JSON.stringify(preflight(), null, 2));
  } else if (command === 'run') {
    const taskIndex = rest.indexOf('--task');
    if (taskIndex < 0 || !rest[taskIndex + 1]) throw new Error('--task <task.json> is required');
    const builderMode = rest.includes('--builder-dsh') ? 'dsh' : 'external';
    const state = await runTask(rest[taskIndex + 1], builderMode);
    console.log(JSON.stringify(state, null, 2));
    process.exitCode = state.status === 'PASS' ? 0 : 2;
  } else if (command === 'status') {
    const idIndex = rest.indexOf('--task-id');
    if (idIndex < 0 || !rest[idIndex + 1]) throw new Error('--task-id <id> is required');
    console.log(readFileSync(join(STATE_DIR, `${rest[idIndex + 1]}.json`), 'utf8'));
  } else {
    usage();
    process.exitCode = 64;
  }
} catch (error) {
  console.error(`BGLAD_BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
