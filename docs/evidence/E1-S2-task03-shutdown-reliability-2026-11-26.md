# E1-S2 Task 03 — shutdown reliability

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`. Actual starting HEAD verified as `2e7eb39` (Task 02 checkpoint; the prompt’s latest reported `b0a7ae7` was an earlier orchestration commit). Task 01 and Task 02 checkpoints preserved. No owner runtime, `.env`, key, database or real record was accessed. Fictional disposable storage only.

## Root cause

`apps/server/src/main.ts` shutdown called `privateStore.store.reconcile()` without a guard. After Task 02, reconciliation correctly throws `PrivateStorageError('unavailable')` when a managed root/shard is missing. That exception escaped the signal handler before `auth.close()` and `server.close()`, so Node printed an uncaught exception with a stack and absolute paths and exited 1. The database/server resources were not closed through the normal path.

No row, ciphertext, metadata or shard marker was changed on this path: reconciliation fails before its ready-document updates.

## Impact analysis

- **Ordinary shutdown:** unchanged; reconcile succeeds, auth/server close, exit 0.
- **Missing/inaccessible managed directory:** reconcile fails closed before writes; shutdown now reports only the sanitized `unavailable` code and continues closing auth/server.
- **Active uploads/pending operations:** `server.close()` stops accepting new connections and waits for existing connections before exit. No shutdown-specific active-upload fault test was added; existing upload/API lifecycle tests remain green. This is the documented safe-state behavior, not an assertion that uploads are forcibly cancelled.
- **Database/resource closure:** `auth.close()` is now always reached after reconciliation failure; `server.close()` callback exits 0.
- **Task 02 protections:** no recreation, no marker changes, no deletion/reconciliation row mutation on the failing path.
- **Restoration:** moving the original storage back and starting a new process succeeds; store identity is unchanged.
- **Information exposure:** the log contains only a fixed message and allow-listed error code; no error object, stack, path, database or key detail.
- **Exception policy:** only the storage reconciliation fault is caught; no generic suppression or cleanup-success claim is made.

## RED evidence

New real-main child-process test `apps/server/src/shutdown.test.ts` uses isolated fictional runtime, preload-emitted SIGINT, a fictional account/case/document, and a moved shard.

Pre-fix `npx vitest run apps/server/src/shutdown.test.ts`:

- ordinary shutdown control: PASS;
- shard-unavailable shutdown: **FAIL** — exit 1;
- restart after restoration: **FAIL** — exit 1.

Result: **2 failed / 1 passed (3)**. Log: `.setup/task03-red.log`.

## GREEN and compatibility

- Shutdown suite: **3/3**.
  - ordinary shutdown exit 0, no `PrivateStorageError` stack;
  - moved-shard shutdown exit 0, sanitized `Shutdown storage cleanup unavailable (unavailable)`, no stack/absolute path;
  - storage restored, identity preserved, later process starts healthy.
- `npm test`: **405/405, 36 files**.
- `npm run test:api`: **234/234, 21 files**.
- `npm run typecheck`: exit 0.
- Task 01 and Task 02 tests are included and green.

## Regression effectiveness

In the disposable isolated copy, reinstating the unguarded shutdown reproduced **2 failed / 1 passed**, exactly the two fault tests. The fixed source was restored byte-for-byte; the copy remained clean. Log: `.setup/task03-reversion.log`.

## Independent verification

- **Codex — PASS** on `<isolated-copy>` (clean, no `.env`/`runtime`, exact source hashes). Confirmed ordinary and fault shutdown exit 0, sanitized output, no stack/absolute paths, preserved rows/ciphertext/markers, healthy restart after restoration, maintained **405/405**, API **234/234**, typecheck 0. It did not modify source and did not create a second copy.
- **Claude — PASS** after source review. Confirmed the fixed message/code-only logging, `auth.close()`/`server.close()` reachability, reconcile fail-before-mutation behavior, marker/ciphertext preservation and restoration. Claude disclosed it could not execute npm; execution evidence is Codex’s.

State: `.bglad/state/e1-s2-task03-shutdown-final.json`, run `.bglad/runs/e1-s2-task03-shutdown-final-1795720957922/`.

## Local checkpoint

Task 03 application/test/evidence files are checkpointed locally in a scoped commit. No push, merge, migration, deployment, E1-S3 or Task 04 occurred. Owner runtime metadata remains **10 files / 4,377,586 bytes**, hash `679F6FF1EE54B73FBB2862D8A2A0AC28E767325F0E5B5F9BD965A4428FAB29B1`.

## Remaining gates

NR-3 (historical evidence totals), NR-4 (publication paths), NR-6 (test effectiveness), NR-7 (audit triage), NR-8, browser-artifact bytes, active-upload shutdown exercise, owner key/retention/readiness decisions and merge approval remain open. E1-S2 is not approved.

**Status: Task 03 shutdown correction independently verified and PASS; E1-S2 is not approved and no merge is claimed.**
