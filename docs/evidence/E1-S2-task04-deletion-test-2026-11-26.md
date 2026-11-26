# E1-S2 Task 04 — deleted-document regression protection

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`. Actual starting HEAD verified as `1dd128d` (Task 03); the reported checkpoint was correct. No owner runtime, `.env`, key, database or real record was accessed. Fictional data only. This is builder evidence plus independent Codex/Claude verification.

## Root cause of the ineffective test

The old test asserted:

```ts
expect(screen.queryByText(DOC.originalName)).not.toBeInTheDocument();
```

`DOC.originalName` is `fictional.pdf`, but `CasesPage.tsx` renders one text node:

```text
fictional.pdf — application/pdf — 42 bytes
```

Testing Library’s exact-text query therefore never matched that row even when it was present. The assertion was vacuous: removing the local document-removal code did not make the old test fail.

## Test-only correction

Changed only `apps/web/src/cases/CasesPage.test.tsx` for Task 04:

- locates the actual rendered document row and proves `fictional.pdf` is visible before deletion;
- scopes the delete button to that row (avoiding the unrelated-document button);
- asserts the targeted row disappears after confirmed deletion while the unrelated `keep.pdf` row remains;
- adds a failed-deletion control that retains the document and reports the error;
- retains the existing truthful confirmed-deletion message test and session/account/case tests.

No application code was changed.

A separate test-harness correction was needed because Task 03’s shutdown test killed a restarted child without awaiting exit before removing its temp directory; that caused an intermittent `EPERM` cleanup failure in Codex’s full run. `apps/server/src/shutdown.test.ts` now awaits the child exit and uses bounded `rmSync` retries. This does not change Task 03 application behavior.

`bglad/orchestrator.mjs` now instructs the tester to run listed commands sequentially, after Codex’s earlier concurrent full/API run produced resource-contention failures.

## Defective-implementation evidence

In the isolated copy, removing the post-delete local filter block from `CasesPage.tsx` made the improved focused test fail for the intended reason:

```text
expect(element).not.toBeInTheDocument()
expected document not to contain element, found <span>
  fictional.pdf — application/pdf — 42 bytes
</span>
```

Result: **1 failed / 37 skipped** for the targeted test. The implementation was restored byte-for-byte; the copy remained clean. Log: `.setup/task04-reversion.log`.

## Restored implementation — GREEN

- Focused `CasesPage.test.tsx`: **38/38**
- Full maintained suite: **406/406, 36 files**
- API suite: **234/234, 21 files**
- Typecheck: exit 0
- `git diff --check`: clean
- One-worker full suite also passed **406/406**.

## Independent gate — PASS

Codex initially exhausted its workspace credits after inspecting the checkpoint; the owner refilled them. The retry ran the single-worker sequential command on the exact isolated copy:

- maintained suite **406/406, 36 files**;
- API **234/234, 21 files**;
- typecheck exit 0;
- branch/HEAD clean before and after.

Codex **PASS**: all four strengthened deletion scenarios and controls behaved as asserted; no source changed.

Claude **PASS** after source review, confirming the row is visible before deletion, the delete button is row-scoped, the failed-refresh path removes only the deleted row, the unrelated row remains, the failed-deletion path retains its document, and successful deletion messaging remains truthful. Claude disclosed it could not execute npm; execution evidence is Codex’s.

State: `.bglad/state/e1-s2-task04-deletion-test-retry.json`, run `.bglad/runs/e1-s2-task04-deletion-test-retry-1795725381814/`.

## Checkpoint and preservation

- Task 04 test/evidence checkpoint: `ac296f9`.
- No application source changed. The scoped local checkpoint contains the test-only deletion correction, the Task 03 shutdown-test cleanup stabilization, and this report.
- Task 01–03 application checkpoints and all historical evidence are preserved.
- Owner runtime metadata: **10 files / 4,377,586 bytes**, hash `679F6FF1EE54B73FBB2862D8A2A0AC28E767325F0E5B5F9BD965A4428FAB29B1`, unchanged.
- Isolated copy had no `.env`/`runtime` and was removed.
- No push, merge, migration, deployment, E1-S3, Task 05 or history rewrite.

## Recorded open items for final acceptance reconciliation

- Task 03 report contains an inconsistent NR-3 status reference; this is not silently closed here.
- Dedicated active-upload-during-shutdown coverage remains outstanding from Task 03.
- NR-3, NR-4, NR-6, NR-7, NR-8, browser-artifact bytes, owner key/retention/readiness decisions and merge approval remain open.

**Status: Task 04 deletion-regression correction independently verified and PASS; E1-S2 is not approved and no merge is claimed.**
