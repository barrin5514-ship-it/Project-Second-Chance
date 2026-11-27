# E1-S2 Task 05 — late-response regression protection

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`. Actual starting HEAD verified as `d20c676` (Task 04). No owner runtime, `.env`, database, key or real record was accessed. Fictional accounts and disposable storage only. This is a test-only correction; no application behavior changed.

## Root cause of ineffective coverage

Claude’s original CR-6 finding was correct: the two tests named “does not attempt a second response” asserted only that `console.error` was not called. Express does not invoke its default error logger in the test environment, so removing all three late-response guards still left the suite green even though a real-server probe produced `ERR_HTTP_HEADERS_SENT` and stack traces.

The guards are in `privateRoutes.ts`:

1. before validation after upload parsing;
2. in the validation-failure catch;
3. immediately before document publication.

## Test-only correction

`apps/server/src/private/privateHardening.test.ts` now wraps the actual Express response methods — `setHeader`, `status`, `write`, `writeHead`, and `end` — and records:

- duplicate `writeHead`/`end` after headers/end;
- `writeHead`/`write`/`end` after the response closed;
- `status` and `setHeader` attempts after headers were sent or after close;
- the request path of each close event.

New/modified coverage:

- late validation failure after a 408;
- late validation success after a 408;
- unexpected validation error with logout after a 408;
- client disconnect during late validation, waiting specifically for the upload path’s close;
- two simultaneous uploads after every late/disconnect/logout path, proving both upload slots are admitted and return 201;
- failed-deletion/unrelated-document/session controls from earlier tasks remain intact.

No application source was modified.

## RED evidence

Before the correction, the maintained suite did not detect guard removal. Reversion results against the final tests:

| Mutation | Focused result |
| --- | --- |
| Guard 2 (validation catch) removed | **2 failed / 36 passed** — late validation failure and logout-late-error |
| Guard 3 (pre-publication) removed | **4 failed / 34 passed** |
| Guards 1+2+3 removed together | **5 failed / 33 passed** |
| Guard 1 alone removed | **38 passed** — not independently observable because guards 2/3 still suppress the late response |
| `releaseUpload` finally skipped | **6 failed / 32 passed** — two-slot checks catch the leak |

The copy was restored byte-for-byte after every mutation and remained clean. Logs: `.setup/task05-guard2-final2.log`, `task05-guard3.log`, `task05-combined-final.log`, `task05-slot-leak.log`, `task05-guard1-final.log`.

## GREEN / backward compatibility

- `privateHardening.test.ts`: **38/38**
- Full maintained suite: **408/408, 36 files**
- API suite: **236/236, 21 files**
- Typecheck: exit 0
- `git diff --check`: clean
- Sequential single-worker full and API suites passed.
- Tasks 01–04 tests remain green.

## Independent verification

- **Codex — PASS** on `<isolated-copy>`, HEAD `2378b4c412ae2d6b3d92b3d83b6c1de301511353`, clean tree: no second response after 408, upload-specific close observed, no write/writeHead/end/status/setHeader after close, both slots recovered, full/API/typecheck sequential.
- **Claude — PASS** after source review. It confirmed the instrumentation observes actual calls, the four late paths assert all counters zero, the disconnect close is upload-specific, and two-slot recovery proves release. It reported only three **low, optional** residual hardening notes:
  1. disconnect path matching could also require the `POST` method;
  2. `flushHeaders`/socket-level writes are not instrumented (unused by current routes);
  3. the disconnect test does not assert `console.error` was untouched.
  None is a confirmed application defect; they are recorded rather than silently ignored.

## Local checkpoint and preservation

- Task 05 test/evidence files are checkpointed locally; no application file changed.
- Owner runtime metadata: **10 files / 4,377,586 bytes**, hash `679F6FF1EE54B73FBB2862D8A2A0AC28E767325F0E5B5F9BD965A4428FAB29B1`, unchanged.
- Isolated copy had no `.env`/`runtime` and was removed.
- No push, merge, migration, deployment, E1-S3, Task 06 or history rewrite.

## Remaining blockers / carry-forward

- Claude’s three low optional test-hardening notes remain open.
- Inconsistent NR-3 status reference and outstanding active-upload shutdown coverage from Task 03 are carried forward, not closed.
- NR-4, NR-6, NR-7, NR-8, browser-artifact bytes, owner key/retention/readiness decisions and merge approval remain open.
- GitHub publication remains blocked; no push.

**Status: Task 05 late-response regression protection independently verified and PASS; E1-S2 is not approved and no merge is claimed.**
