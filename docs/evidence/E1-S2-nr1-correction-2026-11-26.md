# E1-S2 Task 01 — NR-1 session-loss correction — November 26, 2026

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`; HEAD `03b1bb8`. This is builder evidence only, not independent verification, a security certification, an E1-S2 approval or a merge decision. No owner runtime content, `.env`, key, database or real record was accessed. No commit, push, merge, deployment or migration was made.

## Finding corrected

Claude’s CR-5-R1 review finding **NR-1** (P2, blocking): after a confirmed create, edit, upload or document delete, a 401/403/404 during the post-write refresh was swallowed by `reloadSelected`’s catch. `me()` was not called, so private content remained visible after session loss or account change. The 503 “confirmed but unverified” path was correct and had to stay.

Affected code: `apps/web/src/cases/CasesPage.tsx` (`reloadSelected`, `reconcileMismatchedIdentity`). The same helper is used by create, edit, upload and document delete; case delete already reconciled.

## TDD evidence

1. Added maintained tests in `apps/web/src/cases/CasesPage.test.tsx` for:
   - post-create case-list refresh 401;
   - post-edit case-list refresh 401;
   - post-upload case-list refresh 401;
   - post-document-delete document-list refresh 404.
2. **RED**: `npx vitest run apps/web/src/cases/CasesPage.test.tsx` exited 1: **4 failed / 33 passed (37)**. The four new tests failed because the private view remained visible; existing behavior/tests passed.
3. Minimum implementation: `reloadSelected` now calls `needsAuthoritativeCheck(error)` in its catch and runs `reconcileMismatchedIdentity`; that helper now always calls `me()` (the old provenance-function guard was removed). If `me()` is null or a different account, `endSession()` clears the view; if the same account remains, the confirmed-write message is retained. 503 remains non-authoritative and unchanged.
4. **GREEN**: same focused command exited 0: **37/37**.

## Builder regression checks

| Command | Exit | Actual result |
| --- | --- | --- |
| `npm test` | 0 | **380 passed / 34 files** |
| `npm run test:api` | 0 | **227 passed / 20 files** |
| `npm run typecheck` | 0 | pass |
| `npm run build` | 0 | pass; existing chunk-size warning only |
| `npm run test:secrets` | 0 | 7 passed |
| `git diff --check` | 0 | clean |

These are builder results; they do not replace Codex independent testing or Claude review.

## Independent gate — PASS

Codex and Claude reviewed the exact source checkpoint in an isolated copy at `<isolated-copy>` (no `.env`, no `runtime/`, node_modules junction; source hashes matched the real working tree before mutation testing).

- Codex: **PASS**. Maintained suite **398/398 (35 files)**, API **227/227 (20 files)**, typecheck exit 0; no source or tests modified. The suite included the new 18-test refresh-auth file: 13 lost/changed-session scenarios plus five 503 controls.
- Claude: **PASS**. Independently traced all four reload callers and case delete; confirmed 401/403/404 call `me()`, null/different identity ends the view, same identity retains the confirmed-but-unverified message, and 503 does not trigger reconciliation. Claude could not execute npm in its sandbox; its verdict is source review plus Codex’s captured evidence, and it disclosed that limitation.
- Regression-test effectiveness on the disposable copy:
  - removing the new `needsAuthoritativeCheck` reconciliation in `reloadSelected` produced **12 failed / 6 passed** (all 12 affected session-loss cases failed; five controls and the separate case-delete path passed);
  - removing the existing case-delete reconciliation produced a specific failure in the 13th scenario (`list-401 after confirmed delete-case`).
  - Copy restored clean afterward.

The earlier BLOCKED attempts remain recorded in `.bglad/state/e1-s2-task01-nr1-real.json` and `e1-s2-task01-nr1-copy.json`; they are superseded by the isolated-copy PASS above. No sandbox bypass or fabricated result was used.

## Scope and remaining gates

Only NR-1 was addressed. NR-2 through NR-8, the browser-artifact gate, owner decisions on key/retention/readiness and the GitHub publication blocker remain open. The existing uncommitted corrections and historical evidence were preserved. No E1-S3 work was started.

**Status: Task 01 implementation and independent gate PASSED; E1-S2 is not approved and no merge is claimed.** Owner merge approval and the remaining findings/decisions stay separate.

