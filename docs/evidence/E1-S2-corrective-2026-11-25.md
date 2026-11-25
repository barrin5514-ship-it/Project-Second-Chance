# E1-S2 corrective implementation — 2026-11-25

Builder: DeepSeek. Branch: `feature/e1-s2-private-documents`. Application checkpoint before this cycle: `3600dd66d355804ac1f0232bc57594259ad75900`. Local `main`: `e2edea5a11ba250b881449acaa951844e38abba0`. This is corrective implementation evidence, not independent verification, merge approval, production readiness or authorization for real records.

## 1. Initial checkpoint

| Item | Observed |
| --- | --- |
| Absolute root | `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance` |
| Branch / HEAD | `feature/e1-s2-private-documents` / `3600dd66d355804ac1f0232bc57594259ad75900` |
| Local main | `e2edea5a11ba250b881449acaa951844e38abba0` |
| Upstream | `origin/feature/e1-s2-private-documents`; locally equal before changes, not fetched |
| Initial untracked work | `.vscode/`; `docs/evidence/E1-S2-claude-final-review-3600dd6.md`; `docs/evidence/E1-S2-codex-independent-testing-3600dd6.md`; `docs/evidence/E1-S2-codex-3600dd6-checks.txt`; `tests/independent/` |
| Initial modified files | None |

All untracked owner/independent work was preserved and not read from `.vscode/`. No reset, merge, push, force-push or deployment was performed.

## 2. Runtime preservation assessment (Priority Zero)

Metadata-only inspection; no database opened through an application/migration path, no key/document contents read.

| Path | Size | Last write (UTC) |
| --- | ---: | --- |
| `runtime/auth-session-secret` | 65 | 2026-11-24T16:38:43.3565753Z |
| `runtime/psc-auth.sqlite` | 204,800 | 2026-11-25T05:14:22.7780526Z |
| `runtime/psc-auth.sqlite-shm` | 32,768 | 2026-11-25T05:17:07.5319013Z |
| `runtime/psc-auth.sqlite-wal` | 4,136,512 | 2026-11-25T05:17:13.8766742Z |
| `runtime/keys/master-key.json` | 94 | 2026-11-24T18:41:29.1036468Z |
| Five `runtime/private/blobs/bl/*.psc` files | 669–670 each | 2026-11-24T18:43–19:17Z |

- No matching API/Vite/tsx process was found at the checkpoint.
- No backup/snapshot file was found in the repository.
- The total metadata was 10 files / 4,377,586 bytes.
- **What cannot be established:** whether Claude's earlier browser runs removed anything, whether the database is internally consistent, or how many logical accounts/documents remain. That requires opening the DB, which was deliberately not done.
- **No no-loss claim is made.**
- The existing store has no new `.psc-store-identity` marker. The corrected code therefore fails private-storage initialization closed (generic 503, `/api/ready` 503) rather than adopting it automatically. Health/auth remain live. Owner-approved migration is required before this runtime can be used with the corrected build.

**Proposed owner-approved backup/recovery procedure (not performed):** stop the API, use SQLite's backup facility or an offline copy for the DB, copy the encrypted blobs, and store the key material separately, with hashes/manifests and access controls. Do not place keys in the same snapshot. Restore only into a disposable directory, verify the DB opens, identity/marker policy, key-check and blob authentication, then seek owner approval before any live restore. This is a proposal for E1-S3/owner action; no restore was executed.

## 3. Test isolation

- Added `PSC_RUNTIME_DIR` support in `loadAuthSettings` and `loadPrivatePaths`; it moves the auth DB, session secret, private key directory and private data together. `PSC_PRIVATE_DATA_DIR`/`PSC_PRIVATE_KEY_DIR` remain narrower overrides.
- Playwright config sets `PSC_RUNTIME_DIR` to `test-results/e2e-runtime-<pid>`. `pretest:e2e` runs `scripts/check-test-isolation.mjs`, which fails if the config does not use the disposable path.
- Unit regression in `authConfig.test.ts` proves auth DB/secret and private keys/data all move under the override and not `<root>/runtime`.
- The final full browser run used `test-results/e2e-runtime-30284` (and successive PID paths); auth DB/secret, `keys/master-key.json`, identity marker and fictional accounts were created there. The owner runtime metadata hash was identical before/after: `679F6FF1EE54B73FBB2862D8A2A0AC28E767325F0E5B5F9BD965A4428FAB29B1`.
- Limitations: the preflight is a static config check; direct `npx playwright test` bypasses npm lifecycle. Unit tests use temporary directories, not an OS sandbox. Shared `node_modules` are reused. Fictional E2E runtime data is ignored and not automatically deleted.

## 4. Claude findings and corrections

Mapping to the corrective work order: **FIX A** = F1 (PDF worker), **B** = F2 (store identity), **C** = F3 (deletion), **D** = F4 (ambiguous upload), **E** = F5 (work-lifetime concurrency), **F** = F6 (late session/cookie), **G** = FIX G (bidi controls), **H** = FIX H (PDF ending), **I** = FIX I (key durability), **J** = FIX J (health/readiness), **K** = FIX K (quota/error semantics).

| Finding | Root cause / correction | Verification |
| --- | --- | --- |
| F1 PDF resource exhaustion | `pdf-lib` parsed synchronously on the main event loop. PDF parsing now runs in a `worker_threads` worker with a 64 MiB old-generation cap and 3s hard deadline; timeout/OOM terminates the worker and returns generic `invalid-upload`. | Existing valid/corrupt/encrypted/page-cap tests pass; new deadline test rejects with `reason:'timeout'`. One-page validation (including worker startup) took roughly 300–700 ms in the suite. No decompression-bomb fixture was added; this proves the deadline path and code-configured memory cap, not every crafted PDF. |
| F2 wrong storage configuration | DB and data dir had no binding; reconciliation could mark valid rows error under a wrong/reset dir. Added random `private_store_identity` + `.psc-store-identity`; mismatch/missing marker fails before reconciliation/deletion. Legacy stores without identity are not auto-adopted. Missing required blob on delete is now an error, not success. | Store tests: wrong dir leaves original status unchanged; reset DB + existing marker throws; missing ready blob leaves error and denies download. Existing correct store still opens. |
| F3 false deletion success | `removeManaged` treated an absent file as removed. It now throws unless the row is already in a retryable error/deleting state; the row becomes `error`, content is denied, and retry is scoped. | Existing unlink-fault test plus new missing-blob test. |
| F4 ambiguous uploads | UI showed generic “try again” for timeout/5xx and did not reconcile. It now refreshes the list/documents, reports “outcome uncertain — check the document list”, clears the chosen file, and never auto-replays. | New UI test verifies the uncertain message, no “try again”, one upload call and refreshed documents. Residual: no durable idempotency key; a user who ignores the warning can duplicate. |
| F5 concurrency accounting | Slots released on response finish/close while validation continued after 408/disconnect. Slots now represent actual work; release occurs in the upload route `finally` or the error handler. | New 408 test: two timed-out uploads still hold slots (third 429); after validation release, a fourth upload is 201. Existing limit/account-isolation tests pass. Disconnect release is only partially covered: a supertest agent-abort regression could not be made reliable (agent remained poisoned); preserved P9 confirms the slot is held during abandoned work but expects the old immediate release. |
| F6 logout/cookie | Only the success path rechecked the stored session. Validation errors, 408 and the error middleware now recheck and call `rejectUnauthorized`; missing-file path too. | New logged-out validation-failure and 408 tests assert 401, no `Set-Cookie`, no published row. |
| F7 list hidden by corrupt row | One corrupt metadata row threw out of list/get. Per-row decryption failures now produce a generic “Unavailable case/document” placeholder, preserving the rest of the list. | New store test with damaged case/document metadata; list remains length 2 and the good case is readable. |
| F8 404 identity change | UI only rechecked `/me` on 401/403. 404 now triggers the same authoritative `/me` check. | New UI test: read 404 + different `/me` returns to sign-in. |
| F9 misleading messages | Late edit/download/delete messages could appear under a newly selected case; 408/429 wording was generic. Messages are selection-guarded; 429 names concurrent uploads; 408 is treated as ambiguous. | New edit-selection test; existing stale-upload test. |
| F10/FIX H PDF boundary | Old rule accepted junk after the last `%%EOF`; now only PDF whitespace/NUL is allowed after the final EOF. This rejects appended partial revisions but accepts normal whitespace. | New test rejects trailing text and accepts whitespace. Residual: a file cut exactly at an earlier valid incremental-save boundary is byte-identical to that valid file and cannot be detected without an expected hash/length. **Owner acceptance pending.** |
| F10 edges | Ready update was not checked for effect; `mkdir` sat outside the create-document try; reconciliation counted failed unlinks as removed. Ready publication is now verified; `mkdir` is inside the try; removal counters increment only on successful unlink. | Affected regression suites pass; no dedicated failure-injection test for every edge. |
| FIX G invisible direction controls | Raw U+200E/U+200F/U+202A–E/U+2066–9 were in source/test. Replaced with explicit `\u` escapes; added source-hygiene scan over `apps/server/src` and `apps/web/src`. | Genuine RED: hygiene test failed on `uploadValidation.ts`; after replacement 1/1 passes. |
| FIX I key durability | Key creation used overwrite write without fsync. Now `wx` exclusive create, file fsync, fail-closed partial/corrupt state; concurrent first start reads the published key rather than overwriting. | Crypto tests cover reuse/no-overwrite and corrupt key. Directory fsync is best-effort (Windows may not support). |
| FIX J health/readiness | Main exited if private initialization failed. It now catches, logs only a classified code, keeps auth/health/Mira live, serves private routes 503, and adds `/api/ready` (503 when private unavailable). `/api/health` remains the frozen liveness contract. | New hardening test: health 200, ready 503, private 503; anonymous private 401. This is a new readiness semantic, recorded as a proposal for owner review. |
| FIX K quota/errors | Counts previously excluded error/deleting states and called the check transactional. Counts now include persisted cases and non-pending documents; ADR states best-effort, not serializable. Failed uploads that never allocate a row do not consume quota. | Code review/regression; no new quota-boundary test. |

## 5. Files changed

Application/tests/config (committed separately): `apps/server/src/private/privateStore.ts`, `privateConfig.ts`, `privateRoutes.ts`, `uploadValidation.ts`, `crypto.ts`, `pdfValidation.ts`, `pdfValidationWorker.mjs`, `sourceHygiene.test.ts`, `privateStore.test.ts`, `privateHardening.test.ts`, `privateRoutes.test.ts`, `crypto.test.ts`, `uploadValidation.test.ts`, `apps/server/src/auth/authConfig.ts`, `authConfig.test.ts`, `apps/server/src/main.ts`, `apps/server/src/app.ts`, `health/health.routes.ts`, `apps/web/src/cases/CasesPage.tsx`, `CasesPage.test.tsx`, `playwright.config.ts`, `scripts/check-test-isolation.mjs`, `package.json`, ADRs, README, spec/story/risk/threat model and this report.

## 6. RED/GREEN evidence (honest)

- **Genuine RED observed:** source-hygiene scan (1 failed on raw direction controls → 1 passed); earlier builder cycle’s stale-upload message and initial-UI-401 tests.
- **Corrective server/UI regression tests were generally written alongside or after the correction.** They were executed against the corrected code and pass, but no fabricated pre-fix RED is claimed for them. This is a TDD-order gap for this corrective cycle. The independent Codex probes provide some external failure evidence: 9/11 pass, and the two failures are stale expectations (immediate disconnect release; old incremental-PDF acceptance), not evidence that the old behavior was correct.
- Tests added: store identity/reset/missing-blob/damaged-row; PDF worker deadline and trailing whitespace; 408 work-slot lifetime; logged-out validation/408 cookie; ambiguous upload; 404 account change; late edit message; source hygiene; key reuse/corrupt; readiness fallback; isolation paths.

## 7. Requirement/risk traceability

| Correction | Acceptance/requirements | Risks |
| --- | --- | --- |
| F1/FIX H | P3 upload boundary/decoder limits; P8 fails closed; NFR-03/07; AD-08/09 | R13, R23 |
| F2/FIX I | P2/P4/P5/P6/P8 persistence, confidentiality, integrity and key loss; NFR-19; AD-08/09 | R12, R19, R25 |
| F3 | P7 truthful deletion; no false success | R19, R23 |
| F4/F5 | P9 duplicate/stale work; P10 upload status; P2/P4 UI correctness | R13, R23, R25 |
| F5/F6 | P1/P9 session/ownership and revoked work; NFR-19 | R05, R11, R23 |
| F7/F8/F9 | P2/P4/P6/P9/P10 list/session/message correctness | R05, R23 |
| FIX J | P8/P11 health/regression; readiness; NFR-19 | R25, R21 |
| FIX K | P3/P9/P10 limits/errors; FR-06; NFR-03 | R13, R23 |
| FIX G | P3 filename/Unicode validation; P11 regression | R13, R23 |

No risk is closed. R19 backup/recovery, R21 hosted/TLS, R08 real records, R01–R04 court/legal and E1-S3 retention remain open.

## 8. Verification (actual unless marked pending)

Environment: Windows; Node **v26.13.0**; npm **11.20.0**; Vitest 2.1.8; Playwright 1.49.1; TypeScript 5.7.2; Vite 6.0.3; better-sqlite3 13.2.0.

| Check | Result |
| --- | --- |
| `npm test` | **347 passed / 32 files**, exit 0 |
| `npm run test:api` | **213 passed / 18 files**, exit 0 |
| `npm run test:e2e` | **56 passed**, exit 0, isolated runtime; owner runtime metadata hash `679F6FF1…29B1` unchanged before/after |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (existing SDK chunk warning) |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed, 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |
| preserved auth/foundation/SDK/Mira/private/race probes | 8 / 6 / 3 / 2 / 6 / 1 passed |
| preserved Codex independent Vitest | **9/11 passed**; failures: P9 expects immediate slot release after disconnect (superseded by F6 work-lifetime accounting), R13 expects the old incremental-PDF truncation to be accepted (now rejected by FIX H). P6/P8 crash-boundary passes after identity-marker writes use direct fs and the fixture again reaches the document rename. |
| independent browser artifact-byte probe | **BLOCKED** — EPERM on downloaded-file `readFileSync`; no-app control reproduced; not marked passed |

Browser download integrity distinction: the Playwright download event and authenticated API response bytes were verified; the actual browser-downloaded artifact bytes were **not** verified. No permission bypass or waiver was attempted.

## 9. Remaining limitations / pending owner decisions

1. Permanent per-user concurrent-upload limit (currently proposed **2**).
2. Minimum supported Node version: declared **>=22.2.0**; technically required at least **22.2** for `node:zlib.crc32` (with the SQLite driver's Node 22+ requirement); only **Node 26.13.0** was actually tested; hosted compatibility is unverified. Owner decision pending.
3. Historical/current TDD ordering gaps (acknowledged, not fabricated).
4. Residual PDF truncation at an earlier valid incremental-save boundary.
5. Browser artifact-byte gate blocked on Windows/EPERM.
6. New readiness route / store-identity migration policy and any broader architecture.
7. Owner runtime has no identity marker; it is fail-closed pending an approved migration. No loss claim is possible.

## 10. Git / handoff

Corrective commit is on `feature/e1-s2-private-documents` (parent `3600dd6`); the final hash is reported in the handoff. No merge or push. `.vscode/`, independent Codex/Claude reports and `tests/independent/` are preserved untracked and not committed. Codex should independently retest the corrective commit, including the two stale probe expectations and the download gate; a fresh Claude review should follow. No E1-S3 work, OCR, AI document analysis, court integration, hosting or production claim was started.
