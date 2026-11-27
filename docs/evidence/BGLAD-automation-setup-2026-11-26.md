# BGLAD automated agent workflow setup — November 26, 2026

Builder/operator: DeepSeek. Project: `<repo>`. Branch `feature/e1-s2-private-documents`; HEAD `03b1bb8`; local main `e2edea5`. **No application code was changed in this setup.** All existing uncommitted application corrections, evidence, independent tests and `.vscode/` were preserved. No commit, push, PR, merge, deployment, migration or E1-S3 work occurred.

## 1. Previous handoff failure

The project contained evidence of prior noninteractive Claude CLI runs (`.setup/claude-*-prompt.txt`, `-result.json`, `-error.txt`) and a project-local Continue/BGLAD bridge (`.continue/`), but **no retained Codex→Claude coordinator script or supported agent-to-agent API**.

- The most recent prior Claude E1-S2 result, `.setup/claude-e1-s2-review-result.json`, is an error envelope: `api_error_status: 429`, `usage_limit_reached`, `is_error:true`. That is a subscription usage/authentication limitation, not a cybersecurity restriction.
- Current Claude CLI `claude auth status` reports `loggedIn:false`; a harmless `claude -p` probe returns: `Failed to authenticate: OAuth session expired and could not be refreshed`.
- Codex CLI is installed/authenticated (`codex-cli 0.166.0`, “Logged in using ChatGPT”) and noninteractive `codex exec` works.
- DeepSeek headless exists at `%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` (`dsh --profile headless`), but currently returns `MISSING_CREDENTIAL: ... DEEPSEEK_API_KEY` because the GUI's credential is not exported to the CLI environment.

No safe bypass was attempted.

## 2. Verified capabilities

| Agent | Interface | Result |
| --- | --- | --- |
| DeepSeek | `dsh --profile headless [--permission-mode]` | Interface exists and supports workspace-write + JSON/session options; live use **BLOCKED** by missing `DEEPSEEK_API_KEY` in the CLI environment |
| Codex | `codex exec --json --ephemeral -s read-only -C <dir>` | **Works**; live smoke returned `CODEX_OK`; independent finding test returned `CHANGES_REQUIRED` with a file/evidence finding |
| Claude Code | `claude -p --output-format json --no-session-persistence --allowedTools Read,Glob,Grep` | Interface exists (Claude Code 2.1.312); live reviewer **BLOCKED** by expired OAuth/login |
| BMAD | installed 6.12.4 under `.agents/skills` | Preserved; not reinstalled or replaced |
| BGLAD | `.continue/` aliases and rules | Preserved; coordinator added alongside, not as a replacement |

Codex and Claude were invoked through their actual supported CLIs; no simulated agent/persona result is reported as a pass.

## 3. Implemented coordinator

Created:

- `bglad/orchestrator.mjs` — local sequential coordinator with:
  - one-writer lock (`.bglad/state/active.lock`) and stale-PID recovery;
  - source checkpoint capture (HEAD, branch, status, SHA-256 diff hash);
  - Codex read-only tester prompt + structured JSON result;
  - Claude read-only reviewer prompt + structured JSON result;
  - bounded correction cycles (default 2);
  - optional `--builder-dsh` DeepSeek headless builder/correction adapter;
  - external-builder mode for the current DeepSeek session;
  - durable `.bglad/state/<task>.json` and `.bglad/runs/...` logs;
  - branch mismatch, checkpoint drift and overlap blocking;
  - no push/merge/deploy/migrate/secret access.
- `bglad/README.md`, `bglad/task.example.json`.
- `.bglad/` added to `.gitignore`.
- A short pointer appended to `AGENTS.md` and `.continue/BGLAD_SETUP.md`.

Owner workflow:

```powershell
node bglad/orchestrator.mjs run --task bglad/task.json
```

With a valid headless DeepSeek credential, add `--builder-dsh` to allow automatic builder/correction invocation: `node bglad/orchestrator.mjs run --task bglad/task.json --builder-dsh`.

`preflight` and `status --task-id <id>` provide machine-readable checks/state.

## 4. End-to-end demonstrations (actual invocations)

All fixtures were disposable `%TEMP%` Git projects, fictional data, no owner runtime.

| Test | Result |
| --- | --- |
| **A — success workflow** | **BLOCKED**: Codex passed the disposable success control; Claude then failed OAuth. No final PASS report is claimed. |
| **B — Codex detects defect** | **PARTIAL/BLOCKED**: Codex independently ran the control, returned `CHANGES_REQUIRED` with a specific finding (`check.mjs` exits 1), and coordinator stored it. Automatic DeepSeek correction was not available because `DEEPSEEK_API_KEY` is absent; state stopped at `CHANGES_REQUIRED`. |
| **C — Claude-requested correction** | **BLOCKED**: Claude review cannot authenticate; no reviewer finding/correction loop was executed. |
| **D — unavailable agent / permission** | **PASS (safe stop)**: Codex PASS followed by Claude auth failure produced `status:BLOCKED`, preserved source/state/logs, and exit 2; no source was modified. |
| **E — interrupted execution** | **PASS (state/resume)**: coordinator killed during `codex-test`; state showed `RUNNING`, phase `codex-test`, lock retained. Relaunch removed the dead-PID lock and resumed with Codex, then stopped at Claude auth. No builder work was repeated. |
| **F — scope/checkpoint protection** | **PASS in tested controls**: branch mismatch blocked before agents; active lock blocked a second writer; modifying the disposable source during tester execution caused Codex/checkpoint drift blocking. Unrelated fixture files were not modified by the coordinator. |

Counts are not aggregated: these are orchestration controls, not application tests.

## 5. Application preservation

The existing 25 modified tracked files, untracked maintained tests, all historical evidence, independent tests and `.vscode/` remain. No application file was touched by this BGLAD setup. Owner runtime metadata was **10 files / 4,377,586 bytes**, hash `679F6FF1…29B1`; no owner contents, keys, credentials or records were opened.

The coordinator state/logs are ignored under `.bglad/` and contain only fictional test prompts/results and local paths.

## 6. Remaining blockers and owner action

1. **Claude Code login:** establish a valid Claude Code session in the environment, e.g. the supported interactive `claude auth login` flow (or an owner-approved supported token/credential); then rerun the probe. Do not bypass auth.
2. **DeepSeek headless credential:** configure the supported `DEEPSEEK_API_KEY` credential/environment for the coordinator (or run external-builder mode). Do not copy the GUI credential into project files or logs.
3. GitHub publication remains blocked by the six published files containing absolute owner paths and unpublished history; no push was attempted. The forward-only redaction proposal remains an owner decision.

## 7. Status

**BLOCKED.** The coordinator, Codex routing, safe-stop, lock, checkpoint and resume behavior are implemented and actually exercised. The full required three-agent PASS workflow and automatic correction loop were **not** demonstrated because Claude authentication and the DeepSeek headless credential are unavailable.

Because orchestration verification did not pass, the authorized Task 01 session-expiration development was **not started**; the existing application was preserved. No E1-S2 approval or completion is claimed.

Relevant command state: `.bglad/state/bglad-smoke-*.json`, `.bglad/runs/`, `.setup/bglad-smoke-*.log` (ignored). Do not treat those fictional smoke results as Project Second Chance verification.
