# BGLAD local agent coordinator

This is a project-local **orchestration adapter**, not a new application or model service. It uses the installed supported noninteractive interfaces:

- DeepSeek: `dsh --profile headless` with the non-secret `bglad/headless-account.patch.yml` overlay. The overlay selects the installed `deepseek-account`/authorization/credential plugins, so no API key is stored in the project. The executable is resolved from the DeepSeek Harness installation, not PATH.
- Codex: `codex exec --json --ephemeral -s read-only` (or `workspace-write` only for an explicitly disposable test copy)
- Claude Code: `claude -p --output-format json --no-session-persistence --permission-mode default --allowedTools Read,Glob,Grep`

Existing BMAD 6.12.4 skills, BGLAD Continue aliases, AGENTS.md and all application policies remain authoritative.

## Owner submission

The owner gives **one assignment** to DeepSeek. DeepSeek implements it using the approved story/BMAD/TDD process, then invokes:

```powershell
node bglad/orchestrator.mjs run --task bglad/task.json
```

Codex tests the exact working-tree checkpoint. On PASS, Claude reviews it. Findings are written to `.bglad/state/<task-id>.json` and `.bglad/runs/<task-id>-<time>/`.

If `--builder-dsh` is supplied, the coordinator invokes DeepSeek headless through the installed Harness account route for an initial build and automatic corrections, up to `maxCycles` (default 2). This was verified with the non-secret `bglad/headless-account.patch.yml` overlay; it does not require or store `DEEPSEEK_API_KEY`. Without `--builder-dsh`, the coordinator runs external-builder mode: DeepSeek is the current builder, and any Codex/Claude findings stop as `CHANGES_REQUIRED` for the current DeepSeek session to correct. It never silently changes or approves the application itself.

## Commands

```powershell
node bglad/orchestrator.mjs preflight
node bglad/orchestrator.mjs status --task-id task-01-session-expiration
node bglad/orchestrator.mjs run --task bglad/task.json
node bglad/orchestrator.mjs run --task bglad/task.json --builder-dsh
```

`run` exits 0 only for a verified PASS; 2 for BLOCKED/CHANGES_REQUIRED; 64 for usage.

## State and safety

- One lock: `.bglad/state/active.lock`; a second concurrent writer is rejected.
- A fixed task ID has durable JSON state and run logs.
- The tester is read-only and never commits, pushes, merges, deploys or accesses owner runtime data.
- The reviewer is read-only and does not edit application code.
- No command pushes, merges, deploys, migrates or rewrites history.
- The coordinator records HEAD/branch/status and a SHA-256 manifest over the diff, status and sorted untracked-file content. A checkpoint is rejected on branch mismatch; unexpected source changes are visible in the next run state.
- No source manifests are committed; `.bglad/` is ignored.
- The coordinator does not read `.env`, keys, databases, documents or owner runtime content.

## Windows Codex behavioral test runner

The failure was specific to the **elevated Windows sandbox** and esbuild’s access to the user-profile root (`<owner-home>`): the sandbox reserves that root even when a broader read rule is granted. MXC could read the runner but rejected the repository’s required directory-junction tests; `unelevated` could create junctions but could not spawn esbuild.

Verified minimum-permission method:

1. Create an isolated source copy under a non-user-profile path, e.g. `<isolated-copy>`.
2. Do not copy `.env`, `runtime/`, databases, keys or owner content; expose dependencies with a `node_modules` junction if needed.
3. Run Codex with its installed default workspace profile (task field `codexSandbox: "profile"`; do not pass `-s`).
4. Run `npm.cmd test -- --no-cache` and `npm.cmd run test:api -- --no-cache` so Vitest does not write its cache through the read-only junction.
5. Confirm the copy’s source hashes match the real checkpoint, and confirm `git status` remains clean after testing.

This method passed the Task 01 gate: maintained **398/398**, API **227/227**, typecheck exit 0, followed by Claude PASS. It uses no `danger-full-access`, no custom broad read root and no credential access. Delete the copy (remove the junction first) after verification.

## Current environment limitations

Claude Code authentication is valid and a harmless noninteractive invocation succeeded. DeepSeek headless works through the installed account route; the project patch contains no credential. Codex authentication and ordinary command execution work. The former elevated-sandbox test-runner failure is resolved by the isolated-copy method above; do not bypass the sandbox.

## Resume

An interrupted `run` leaves `active.lock` with a PID/timeout; a later invocation may remove it only after the 12-hour stale threshold or when the PID is not alive. State is preserved in `.bglad/state`. Inspect the last state/log before re-running; do not repeat completed implementation or overwrite findings.
