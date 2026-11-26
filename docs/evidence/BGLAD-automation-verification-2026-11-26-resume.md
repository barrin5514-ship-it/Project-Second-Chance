# BGLAD automation verification — resumed November 26, 2026

Project: `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance`. Branch `feature/e1-s2-private-documents`; base HEAD `03b1bb8`; Task 01 checkpoint `f1b18e0`. This report supplements, and does not overwrite, `docs/evidence/BGLAD-automation-setup-2026-11-26.md`. No push, merge, deployment, migration, E1-S3 work or owner-runtime read occurred. No simulated agent result is reported as a pass.

## 1. Authentication and executable discovery

| Item | Actual result |
| --- | --- |
| Claude Code | `claude auth status`: `loggedIn:true`, `authMethod:claude.ai`, subscription `pro`. Harmless `claude -p` returned `CLAUDE_OK` with exit 0. Noninteractive operation is available. |
| Codex | `codex login status`: logged in using ChatGPT. `codex exec` works. |
| DSH executable | Installed at `%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd`; CLI reports `0.2.3-alpha.2`. It is absent from the regular PowerShell PATH because the Harness installer does not add that directory. This is not a broken installation. |
| DSH GUI | Harness version 44.11.5; `DSH_HOME=<owner-home>\.dsh`, profile `desktop`. |
| Headless authentication | The headless profile's `deepseek-official` route requires a separate API key. The already-authenticated account was reused by enabling the installed `deepseek-account`, authorization and credential plugins with the project-local non-secret patch `bglad/headless-account.patch.yml`. No credential was read, copied or logged. |

Actual headless smoke result: `DSH_ACCOUNT2_OK`, exit 0. The patch was then wired into the coordinator via the PowerShell wrapper (Windows `.cmd` cannot be spawned directly by Node without a shell). No `DEEPSEEK_API_KEY` is required or stored in the project for this route.

## 2. Coordinator changes

The existing `bglad/orchestrator.mjs` was extended, not replaced:

- absolute DSH discovery and `--patch bglad/headless-account.patch.yml` account route;
- PowerShell invocation for the `.cmd` launcher;
- `CODEX_BIN`, `CLAUDE_BIN`, `DSH_BIN` overrides;
- optional `codexSandbox: "workspace-write"` for an explicitly disposable test copy;
- child-process `error` handling;
- source manifest now includes `git status` and sorted untracked-file content, not only `git diff`;
- Codex tester evidence is passed into the Claude review prompt;
- reviewer instruction requires a confirmed security/privacy defect in the resulting source to be CHANGES_REQUIRED even if pre-existing, while separating scope.

The old historical report remains unchanged. `AGENTS.md`, `.continue/BGLAD_SETUP.md`, `bglad/README.md` and `.gitignore` were updated to point at this verified behavior; no application source was changed by the orchestration setup.

## 3. Acceptance demonstrations

All fixtures were isolated fictional projects or disposable copies; no owner runtime, `.env`, key or real record was used.

| Test | Actual result |
| --- | --- |
| A — full workflow | **PASS**. `bglad-smoke-full-a`: DeepSeek headless built `check.mjs`; Codex verified; Claude reviewed; coordinator status `PASS`, exit 0. |
| B — Codex finding returns to DeepSeek | **PASS**. `bglad-smoke-auto-b2`: Codex returned `CHANGES_REQUIRED` with the controlled `DEFECT_PRESENT` finding; the coordinator invoked DeepSeek headless correction; Codex retested `PASS`; Claude reviewed `PASS`; status `PASS`, attempt 1. |
| C — Claude finding returns to DeepSeek | **PASS**. `bglad-smoke-auto-c6`: Claude returned `CHANGES_REQUIRED` for `eval(process.env.FICTIONAL_INPUT)`; DeepSeek removed the `eval`; Codex retested `PASS`; Claude reviewed the corrected checkpoint `PASS`; status `PASS`, attempt 1. |
| D — unavailable agent safe stop | **PASS**. `bglad-smoke-d-unavailable`: `CODEX_BIN` pointed to an absent executable; coordinator recorded `BLOCKED` with status -1 and exited 2; no source mutation. |
| E — interruption/recovery | **PASS (preserved actual run)**. `bglad-smoke-e`: coordinator killed during `codex-test`; durable state `RUNNING` and lock remained; relaunch removed the dead-PID lock and resumed without repeating builder work. |
| F — checkpoint/overlap protection | **PASS**. Branch mismatch was rejected; an active lock rejected a second writer; prior source-drift test was rejected; the current manifest now also hashes untracked files. |
| G — single submission through Harness | **PASS**. The owner’s assignment was handled in this DeepSeek Harness session; DeepSeek invoked the coordinator and the full chain ran without an owner terminal command or manual prompt transfer. |

Known setup limits: Codex’s read-only sandbox cannot execute Vitest/esbuild because it denies an ancestor directory (`Cannot read directory "../../../..": Access is denied`). This reproduced in the real tree and an isolated `.bglad` copy. It is a Codex sandbox/test-runner access limitation, not an application failure. No sandbox bypass was used.

## 4. Task 01 status

Task 01 was interpreted as Claude’s blocking **NR-1** finding: post-write refresh 401/403/404 did not reconcile identity. The correction was implemented in `apps/web/src/cases/CasesPage.tsx`, with maintained regression coverage in `apps/web/src/cases/CasesPage.test.tsx` and the new 18-test `apps/web/src/cases/CasesPage.refreshAuth.test.tsx`; see `docs/evidence/E1-S2-nr1-correction-2026-11-26.md`.

The first real-tree Codex attempts were blocked because the elevated Windows sandbox denies the user-profile home path that esbuild reads. The supported test-runner resolution was:
- an isolated source copy at `<isolated-copy>` (no `.env`/`runtime`, no user-profile ancestor);
- the installed default Codex workspace profile (no `danger-full-access`, no broad read root);
- `npm.cmd test -- --no-cache` and `npm.cmd run test:api -- --no-cache` to avoid a read-only node_modules cache write;
- source hashes matched the real working tree before mutation testing.

Final independent result: Codex **PASS** (maintained **398/398**, 35 files; API **227/227**, 20 files; typecheck exit 0; no source/tests modified), followed by Claude **PASS** (source review; it disclosed it could not run npm). The 18-test file covers all **13** original lost/changed-session scenarios and **five** 503 controls. Reversion testing on the copy failed **12/18** when the new helper reconciliation was removed; a separate mutation failed the case-delete scenario specifically. The earlier `e1-s2-task01-nr1-real` / `e1-s2-task01-nr1-copy` BLOCKED states remain in `.bglad/state` as history.

## 5. Preservation

- A scoped local Git checkpoint was created for the three Task 01 UI/test files and its evidence report: `f1b18e0` (implementation) and `3ad49f9` (report EOF/evidence). The coordinator/runbook/docs are a separate local checkpoint at `57ffea1`. No push, merge or deployment.
- Unrelated pre-existing application corrections and historical evidence remain uncommitted and preserved.
- Owner runtime metadata: 10 files / 4,377,586 bytes; hash `679F6FF1EE54B73FBB2862D8A2A0AC28E767325F0E5B5F9BD965A4428FAB29B1`, unchanged.
- No `.env`, runtime database, key, document or credential was opened by the coordinator.
- The isolated test copy contained no `.env` or `runtime`; the copy was removed after verification except for the preserved test logs in `.bglad/runs`.

## 6. Remaining blockers / owner action

1. GitHub publication remains blocked by the six tracked files containing absolute owner paths and unpublished history; no push was attempted.
2. NR-2–NR-8 and the browser-artifact gate remain separate findings/decisions. Task 01 does not approve E1-S2.
3. No additional authentication or PATH work is required; the owner is not asked to run diagnostics.

**Final status: PASS for Task 01 implementation and independent verification.** The orchestration A–G controls pass and the scoped Task 01 checkpoint is local. E1-S2 still has open findings/owner decisions and no merge approval; Task 02 was not started.
