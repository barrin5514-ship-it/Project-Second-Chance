# E1-S2 independent Claude review — 03b1bb8 plus uncommitted corrections

Date: November 25, 2026. Reviewer: Claude (Claude Code, Claude Sonnet 5.5). Companion: `E1-S2-claude-review-03b1bb8-worktree-2026-11-25-checks.txt` (probe sources and outputs).

## 1. Disposition

**Changes requested. Return to DeepSeek.** This is not owner approval, a waiver, merge approval or E1-S2 completion.

The five CV-3-R2 paths and the original seven CV assertions pass in my own runs. I found no server cross-account disclosure. Two items block acceptance:

- **CR-1:** the uncommitted CV-5 fix introduces a session-reconciliation regression. I reproduced it, and the committed page passes the same probes.
- **CR-2:** I reverted the CV fixes one change set at a time. The maintained suite stayed at 348/348 every time.

Four P3 defects follow. Some predate this diff.

## 2. Independence, identity and scope

- This session started without earlier context and wrote no application code. It wrote only this report, its companion, and probes in a disposable copy.
- The earlier Claude report discloses that **that Claude session wrote `caee540`**, which is in `HEAD`'s ancestry. I reviewed the uncommitted diff and the current source it touches. I did **not** do a separate commit-level review of `caee540`, so do not treat this report as closing that independence gap.
- Root: `<repo>`. Branch `feature/e1-s2-private-documents`. HEAD `03b1bb8aee712db73d4c690be850030e050e6361`. Local main `e2edea5a11ba250b881449acaa951844e38abba0`. Nothing staged.
- All 21 manifest SHA-256 hashes match, and the manifest covers exactly the 21 modified tracked files. Manifest hash `481079317C5D1811FDF116FE44055D38CF1D430EFCD7D70ADEDBEB5E9AEA3988`.
- Read: AGENTS.md; the R2 report, output file and manifest; the builder's CV report; the Codex `3600dd6`, corrective, CV-retest and provenance reports; the prior Claude report; story and spec; ADR-0003/0004 and the ADR-0002 diff; the README, builder, delivery, risk and threat-model diffs, plus the relevant risk rows. I did **not** re-read the full PRD or Architecture Spine. Requirement links rely on the story's P1–P11 table.
- Not opened: `.env`, `.vscode/`, owner runtime contents, keys or records. Owner runtime **metadata** (names, sizes, modification times) was identical before and after: 10 files, 4,377,586 bytes. This is not a content comparison. 85 files under `tests/independent/` and `docs/evidence/` that existed before my probes kept their hashes.
- No application or existing test edit in the repository, and no migration, commit, push, merge, deployment or E1-S3 work.

Evidence labels: **Executed** means I ran it. **Inspection** means I read the source and did not run that behavior. **Unverified** means neither establishes it.

## 3. Checks actually run

Disposable copy: `git archive HEAD` plus the 21 working files and `tests/independent/`, with no `.env` or `runtime/`. For the legacy test I added `privateStore.ts` and `crypto.ts` from `3600dd6`. I also copied the preserved `.setup` probe files. Dependencies came through a junction (not a clean install; tool caches may have been written under `node_modules`). I removed the junction afterwards. Windows, Node 26.13.0, npm 11.20.0. Fictional data only. No test-port listener remained.

| Check | Exit | My result |
| --- | --- | --- |
| `npm test` | 0 | 348 passed / 32 files |
| `npm run test:api` | 0 | 213 / 18 files |
| `npm run test:e2e` | 0 | 56 passed |
| `npm run typecheck`; `npm run build` | 0 | pass |
| Provenance; R2 lifecycle; CV retest | 0 | 16/16; 4/4; 3/3 |
| Seven original CV assertions | 0 | 7 passed / 21 skipped |
| Supplementary suite | 1 | **27/28** (an earlier run without the legacy fixture was 26/28, a setup failure) |
| Original independent suite | 1 | **9/11** |
| Preserved private / auth / foundation / SDK / Mira probes | 0 | 6 / 8 / 6 / 3 / 2 |
| Preserved cookie-race probe | 0 | 1 passed |
| `download-control.mjs` (no application) | 1 | `CONTROL_DOWNLOAD_ERROR EPERM` |
| Unchanged download spec (Codex did not rerun it this cycle) | 1 | 2 failed, EPERM reading the artifact |
| `npm run test:secrets`; `npm audit --omit=dev` | 0 | 7 passed; 0 vulnerabilities |
| `npm run verify:secrets`; `git diff --check` (original repository) | 0 | pass within scope |
| Reverting fixes against the maintained suite | — | 8 variants, **all 348/348** |
| The same reverts against independent tests | — | each detected by at least one suite |
| My UI probes, working tree | 1 | 5 passed / 9 failed |
| The same UI probes with the `HEAD` page | 1 | 6 identity probes pass; 8 fail: 6 write-reporting probes (CR-3) and 2 CR-4 characterizations that wait for a message `HEAD` does not have |
| My reconciliation probes | 1 | 3 failed, 1 control passed |
| My account-switch API probe | 0 | passed |
| My real-server late-408 probe (run twice) | 0 | behavior in CR-6 reproduced |

## 4. Findings

### CR-1 — P2, blocking. Regression in this diff: a definite upload failure skips identity reconciliation after a case switch

`apps/web/src/cases/CasesPage.tsx:387-390`. **Executed.**

The new `if (selectedRef.current !== selected.id) return;` runs **before** `handleError`. `handleError` is what calls `me()` and `endSession()` for 401, 403 and 404.

Sequence: start an upload, select another case, lose or change the session, then the upload is rejected.

| Rejection | Same case (control) | Switched case, working tree | Switched case, `HEAD` page |
| --- | --- | --- | --- |
| 401, session ended | signed out | **A's email and case list remain; `me()` not rechecked; no message** | signed out |
| 403, account B signed in | signed out | **same failure** | signed out |
| 404, account B signed in | signed out | **same failure** | signed out |

The server does return 401 for a late upload after logout (maintained hardening test). A refresh that fails inside the upload's `try` reaches the same branch (Inspection).

This conflicts with P9, P10 and the spec's `EXPIRY/REVOKE` row (R05/R11/R20). **Limits:** controlled client, not a real browser. No account B data appeared, and no server bypass is shown. The next protected request should reconcile.

**Bounded regression for DeepSeek:** the three switched-case rows must end the session, and the three controls must stay green. The original CV-5 assertion must also stay green: when identity is unchanged, show no error under the other case. Reconcile identity first, then suppress only the message.

### CR-2 — P2, blocking evidence gap: the maintained suite does not protect the CV corrections

**Executed.** In the disposable copy I made each change below, ran all maintained tests, then restored the file. The copy matched the manifest afterwards.

| Reverted | Maintained | Independent detection |
| --- | --- | --- |
| CV-1 E2E guards | 348/348 | seven-CV set fails 1 |
| CV-2 old `removeManaged` | 348/348 | seven-CV fails 1 |
| CV-3 `/me` identity comparison | 348/348 | provenance fails 1 (seven-CV stays green) |
| CV-3-R1/R2 provenance comparisons | 348/348 | provenance fails 8; CV retest fails 1 |
| Both CV-3 groups together | 348/348 | not run separately |
| CV-4 late recheck | 348/348 | seven-CV fails 1 |
| CV-5 selection guard | 348/348 | seven-CV fails 1 |
| CV-6 early settlement | 348/348 | seven-CV fails 1 |

`vitest.config.ts` includes only `apps/**`, and `tests/independent/` is untracked. The only new maintained assertions cover the server's `accountId` field and the client parsing it. The new factory at `CasesPage.test.tsx:49-54` always supplies **matching** provenance, so no maintained UI test sees a mismatch. `npm test` passing is therefore not evidence for these fixes. The builder report's maintained-coverage statement is accurate only for the field and the parser.

This is a test-protection gap, not a behavior defect. The corrections themselves are supported by preserved Codex failing-then-passing evidence, which I did not witness on the earlier trees but whose current passes I reproduced.

**Required:** DeepSeek adds maintained tests under `apps/` for CV-1–CV-6 and R1/R2, and shows that each fails with its fix reverted. Label them post-implementation regression protection, not historical RED. At the next authorized checkpoint the owner should also decide on committing `tests/independent/` and the reports.

### CR-3 — P3. A confirmed write is reported as failed when only the refresh fails (predates this diff)

`CasesPage.tsx:292-310` (edit), `319-340` (case delete), `430-448` (document delete). **Executed**, working tree and `HEAD` page.

The write resolves, then the list refresh returns 503 or times out. All six combinations show "Private storage is unavailable. Try again shortly." or "The request timed out… Try again." After case deletion the deleted case remains open. Correction to my own harness: in the first run, the injected failure covered only the provenance method. The `HEAD` page refreshes through `listCases()`, so that run showed nothing about `HEAD`. I applied the failure to both methods and reran both pages. The statement above and the counts in section 3 come from the corrected rerun. Upload and create show "uncertain" (Inspection), which does not claim failure.

This conflicts with truthful save and delete state (P10, NFR-13, R20/R25). **Regression:** once a write is confirmed, a refresh failure must say it was saved or deleted and that the view is not verified. A deleted case must not stay open. Do not replay the write, and keep CR-1 identity checks.

### CR-4 — P3. A refresh that proves another account does not reconcile the session

`CasesPage.tsx:168-185`, `321-335`; compare `112-115` and `210-212`. **Executed.**

After a successful upload or document delete, the list returns `accountId` B while `me()` would return B. B's list is correctly suppressed. However, A's email and case list remain, `me()` is not called, and after document deletion **the deleted document is still listed**. The initial load ends the session on the same signal.

No B data is shown, and "retain known state" was a deliberate builder choice. But a mismatch is positive evidence that the session changed, and P9 covers stale display after session loss. The retention rule is a **proposal needing disposition**. My recommendation: on a mismatch, call `me()`; end the session if it is null or different; otherwise keep the current behavior. Codex's lifecycle mismatch test supplies `me()` = A, so by inspection it stays compatible.

### CR-5 — P3. Reconciliation still treats an apparently absent blob as proof (predates this diff)

`apps/server/src/private/privateStore.ts:809-816`, `273` (recreates `blobs/`), `737` and `764` (non-ready rows allow a missing blob). **Executed** at store level with disposable stores.

1. One start where `exists()` returns false (injected fault): the document becomes `error`. After a healthy restart it is still not downloadable, although the ciphertext is intact. No code returns it to `ready`, and the UI advises deleting it.
2. `blobs/` moved away, with the correct database, key and identity marker: startup succeeds and recreates the folder. The **first** delete returns success while the ciphertext exists at the moved location.
3. Putting the folder back after that one start does not restore access.

CV-2 fixed this assumption in deletion, and the identity marker fixed the wrong-directory case. Neither covers these. **By inspection:** the API would answer 204; a later start would remove a restored blob whose row had been deleted as an orphan. A mid-run loss of the folder would give 503 and then success on retry, because a missing parent also yields `ENOENT`.

These are conditional storage faults, not ordinary use. They conflict with P7/P8 (R19/R25). **Regression:** the three failing probes plus the ordinary-restart control. Do not persist a terminal state from an unverified stat. With ready rows and a missing blob root, fail closed. Do not count `ENOENT` as verified when the containing directory cannot be verified. Keep the genuine single-missing-file retry passing.

### CR-6 — P3. Late failures after the 408 try to answer again and log stack traces

`privateRoutes.ts:279-282`, `291-297`, `301`; `auth.ts:230-241`. **Executed** against the real `main.ts` with real 30-second timers.

| Body completes after the 408 | Observed |
| --- | --- |
| Invalid file, signed in | `ERR_HTTP_HEADERS_SENT` at `privateRoutes.ts:295` |
| No file, signed in | `ERR_HTTP_HEADERS_SENT` through `privateRoutes.ts:281` |
| Invalid file, logged out first (client got 401) | `TypeError … reading 'destroy'` at `auth.ts:240`, from the second `rejectUnauthorized` |
| Second file part | `MulterError` passed to Express's default handler |

The server stayed up with health 200, and each client received only its 408 or 401. The probe sent no valid file, so it did not exercise publication (a maintained test covers a valid file after 408). It also did not test slot release afterwards. stderr held stack traces, including 22 frames with absolute local paths. That contradicts ADR-0004 D4 (no paths or stacks in logs). Line 301, added by CV-4, has the same unguarded pattern (**Inspection**; my probe did not hit it). The success path at line 306 is already guarded. **Regression:** all four cases and an unexpected validator error after 408 produce no second write and no stack output; slots are released; CV-4's pre-408 behavior is unchanged.

### P4 observations (Inspection)

- `listCasesWithProvenance` is optional, so `refreshCases` and the delete-error branch publish unverified lists without it (`108-116`, `197-219`). The production client always supplies it. Make it required and remove the fail-open branches.
- A definite upload rejection for a case you have left is now silent, even when identity is fine. Edit and delete errors can still appear under another case.
- `openCase` checks selection but no request sequence, so an older response for the same reselected case could overwrite newer documents.
- A legitimate PDF that exceeds 3 seconds on a busy machine gets the "check the fields" message.
- Documentation to correct with the fixes: threat model line 49 says successful refreshes compare with `/me` (they compare with the displayed identity; CR-4 observed no call). Line 47 claims 401/403/404 reconcile and every late error rechecks safely (CR-1, CR-6). The builder report's "all `setCases` sites… have identity/cancellation checks" omits the unverified fallbacks. The spec's checked acceptance boxes read as met while gates remain open.

## 5. Assessment by requested area

| Area | Assessment | Basis and limits |
| --- | --- | --- |
| Response provenance | `accountId` comes from the authenticated session, not input | Executed: provenance API test; my probe |
| Cross-account writes from a stale page | With one cookie jar moved from A to B, A's old token gets 403 for create, edit and delete | Executed at API level. Upload and document delete use the same middleware (Inspection) |
| Documents, detail, download | No `accountId`; bound by owner and parent. A's case documents return 404 under B | Executed for the list; other routes by Inspection and the foreign-ID matrix |
| Case-list publication | See table below | Mixed |
| Request generation | `reloadSelected` checks after both awaits | Executed: lifecycle 4/4. `openCase` is outside this (P4) |
| Selection handling | Delayed success does not publish documents under another case. Failure handling is defective | CR-1, CR-3 |
| Authorization | No cross-account server access reproduced | Maintained and preserved tests; not a full security assessment |
| Upload slots and worker | Validation settles after worker exit; release is in `finally` and the error handler | Executed: CV-6 and stage-aware controls. Release paths by Inspection. Stalled-body cleanup depends on Node's request timeout (**Unverified**). The limit is per user; total workers across accounts are unbounded |
| Deletion | CV-2 holds in tested scope | CR-5 residual; CR-3 reporting |
| Storage isolation | E2E overrides neutralized; guard fails before default-runtime use | Executed: seven-CV set, supplementary isolation, 56/56 in a copy. The guard acts only on flags equal to `1` and does not reject an explicit owner-runtime path; the preflight is a string match |

| `setCases` site | Check |
| --- | --- |
| `:91` | Clears state |
| `:116` initial load | Provenance; mismatch ends session; unverified fallback without the method |
| `:182` reload | Provenance and generation |
| `:219` ambiguous or delete-error | Generation, `/me`, provenance; delete-error fallback can publish unverified |
| `:325` case-delete success | Provenance and generation |
| `:251` (selection, not `setCases`) | Applies the create response before list verification; the write itself is bound by CSRF |

**No real multi-tab browser account switch has been reproduced by anyone, including me.** My API probe is one scripted cookie jar. The UI probes use controlled clients. Treat real-browser reachability of mismatched-list timing as unverified.

## 6. Preserved failing assertions: recommended test-maintenance disposition

**No waiver is declared. All three remain open failures until the owner records a decision.** None of them should drive a return to early worker settlement, early slot release or tail acceptance.

| Assertion | Why it conflicts | Not reached after the failure | Passing replacement control |
| --- | --- | --- | --- |
| Supplementary `e1-s2-corrective-worker.test.ts:26` | Reads native `resourceLimits` after exit; CV-6 requires exit first | 3000 ms deadline check; wait for exit; log | Stage-aware `e1-s2-cv-retest-worker.test.ts` (live limits, exit, timeout); idle default-deadline test in the original file |
| Original `e1-s2-codex.test.ts:118` | Expects a free slot while abandoned validation is still working | Second upload 201; three closes; row count 2 | Corrective API tests at `:123` and `:132` |
| Original `e1-s2-codex.test.ts:220` | Expects a truncated tail to be accepted | None; it is the last assertion (the complete-file control before it runs) | Corrective G/H at `:156`; maintained trailing-bytes test |

Recommended procedure:

1. Keep both files byte-identical. No edits, deletion, `skip`, `it.fails`, retries or weaker timing.
2. Before treating any as superseded, add its safety properties to the maintained suite. The stage-aware worker test does **not** check that the event loop stays available; the failing test checks that before line 26. Add it, with the default deadline, disconnect slot retention and no publication after abort. I saw no disconnect-retention test among the maintained test titles I listed.
3. Add a disposition register naming each assertion, its exact failure message, reason, unreached checks, replacements and the owner's decision and date. Status until then: "proposed superseded".
4. Keep reporting 27/28 and 9/11. If the owner accepts supersession, the gate may expect **only these named failures with these messages**. Any other or changed failure blocks.

## 7. Defects, gaps, proposals and decisions

- **Confirmed implementation defects:** CR-1 (this diff), CR-3, CR-5, CR-6 (CR-3 and CR-5 predate the diff; CR-6's pattern was already at `03b1bb8` and CV-4 added one instance).
- **Confirmed behavior needing a policy call:** CR-4.
- **Evidence gaps:** CR-2; browser artifact bytes; no real multi-tab reproduction; only Node 26.13.0 run; key-directory power-loss behavior; scanner-produced PDF compatibility; historical TDD ordering; `caee540` review independence; earlier 54/2 browser run unexplained (56/56 today does not erase it).
- **Policy proposals and owner decisions:** below. These are recommendations, not approvals.

| Decision | Recommendation |
| --- | --- |
| Browser artifacts | Do not waive. EPERM, including without the app, shows the check cannot run here; it neither passes nor fails the app. Close it where Playwright can read artifacts, or with the manual fictional hash comparison below, recording browser and version |
| Historical TDD exceptions | Record a permanent, enumerated exception or reject it. Passing tests cannot repair ordering. Preserved before/after evidence for CV-1–CV-6 and R1/R2 does not cover earlier gaps. Require observed RED for CR fixes |
| Concurrency value 2 | Reasonable for the local fictional demo. Describe it as a per-user, per-process limit on active upload work, not a global CPU or memory bound |
| Node minimum | Label `>=22.2.0` "declared, untested"; say only 26.13.0 on Windows was run. `better-sqlite3` and `file-type` declare `>=22`; I did not independently verify the 22.2 `crc32` history. Run the suites on the floor before claiming support |
| PDF boundaries | Accept the exact-earlier-save residual only in writing for this demo. Wording: "rejects detected truncation; cannot detect a file cut at an earlier valid save". The trailing-junk rule has no scanner-output evidence |
| Key-directory durability | `crypto.ts:109-135` syncs the file, not the directory; the `EEXIST` path syncs neither. Acceptable only for disposable fictional data with that stated limit. Require a decision in E1-S3 before data worth keeping |
| Readiness and quota | Accept `/api/ready` only as initialization readiness, not ongoing health. Accept quotas as local best-effort; naming the reached quota can be deferred explicitly |
| Legacy migration | Do not build it in this correction. Limit demos to fresh disposable stores and scope migration separately. By code, a pre-identity store returns private 503; I did not open yours to confirm. Do not delete or hand-stamp it |

**Manual artifact check, if you choose it.** Use a disposable runtime, not the existing one. Run from the project root, upload and download one fictional PDF at `/cases`, leave Mira unused, then compare the two files (substitute real paths):

```powershell
Remove-Item Env:PSC_PRIVATE_DATA_DIR, Env:PSC_PRIVATE_KEY_DIR -ErrorAction SilentlyContinue
```

```powershell
$env:PSC_RUNTIME_DIR = Join-Path $env:TEMP 'psc-artifact-check'
```

```powershell
npm run dev
```

```powershell
Get-FileHash .\original.pdf, .\downloaded.pdf -Algorithm SHA256
```

Run the last command in a second terminal. Afterwards close the first terminal so the override does not carry over. The result applies only to the tree that was running, so repeat it if download code changes.

## 8. Story criteria

| Criterion | Disposition |
| --- | --- |
| P1, P2, P4 | Met in the tested local scope |
| P3 | Tested limits and CV-6 pass; PDF residual pending. CR-6 is a late-request logging defect |
| P5 | API and crypto tests pass; **saved-file bytes unverified** |
| P6 | Tested fault matrix passes; CR-5 residual |
| P7 | CV-2 passes; **not met under CR-5's blob-folder fault** |
| P8 | Ordinary restart and key cases pass; **unavailable-store handling incomplete (CR-5)** |
| P9 | **Not met: CR-1** (CR-4 pending) |
| P10 | **Not met: CR-1, CR-3**; artifact unverified |
| P11 | **Open:** CR-2, preserved failures, artifact, TDD and owner gates |

No risk is closed. This review supports no hosted, real-user, recovery, legal-accuracy or production claim.

## 9. Handoff to DeepSeek, through the coordinator

I sent nothing to anyone. Observe a failing maintained test before each behavior fix.

1. **CR-1** (blocking).
2. **CR-2** (blocking): maintained protection, each shown to fail with its fix reverted.
3. **CR-3** and **CR-5**: truthful save and delete state.
4. **CR-6**, and **CR-4** if the owner or coordinator adopts the recommendation.
5. Correct the affected documentation.

If the owner defers any P3, record it as an open limitation. Then Codex retests the new tree with a new manifest, and the changed paths return for review. Preserve all earlier reports, tests and failures.

**Stopped at review. No application edit, commit, push, merge, deployment, migration or E1-S3 work. No owner approval or completion is claimed.**
