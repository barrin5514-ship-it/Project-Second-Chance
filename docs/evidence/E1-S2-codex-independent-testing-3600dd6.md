# E1-S2 independent testing — 3600dd6

Date: November 25, 2026 (America/New_York). Tester: Codex, executing checks directly in this chat. Application implementation was not changed. No Claude final review is claimed.

## Disposition

**Overall E1-S2 approval gate: BLOCKED.** The maintained suite, API suite, normal browser suite, preserved probes, new API/storage probes, compiler, build, secret checks and production dependency audit pass. The explicit browser-download artifact-byte check is blocked by a reproducible Windows artifact-access error, including in a control independent of this application. The documented PDF truncation exception contradicts the broad reject-truncated-files criterion and needs an explicit disposition. Historical TDD gaps and implementation proposals still need review and owner disposition. No merge or next-story activation is authorized by this report.

No new critical cross-account disclosure was reproduced in the tested scope. This is not a full security assessment, proof of all interleavings, production certification, or backup/restore evidence.

## Repository and isolation

- Source root: `<repo>`.
- Branch: `feature/e1-s2-private-documents`.
- Tested application HEAD: `3600dd66d355804ac1f0232bc57594259ad75900`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`; E1-S2 is unmerged.
- Locally recorded upstream is two commits behind HEAD (`caee540` and `3600dd6`). No fetch or claim of current remote contents.
- Initial uncommitted work: only untracked `.vscode/`, preserved without reading or modifying it.
- Inspected the supplied PRD/Architecture Spine, delivery sequence, risk register, BMAD/TDD process, E1-S2 story/spec, ADR-0003/0004, threat model, builder evidence and Claude's review/fix report. Installed BMAD manifest records core/bmm 6.12.4; no installation or reconfiguration was performed.
- Application source was extracted with `git archive` from the tested commit. The final disposable source root is `.setup/codex-e1s2-run-20261125/ProjectSecondChance`. It began with neither `.env` nor `runtime/`.
- Its `node_modules` is a junction to the already-installed project dependencies. `npm ls --depth=0` exited 0. This is reuse of the installed dependencies, not a clean `npm ci` reproduction.
- Auth database/session secret, private master key and blob store created by browser tests belong to the disposable copy. Unit/API fixtures use temporary directories. Existing owner runtime data, keys and `.env` were not copied, opened for inspection, or used.
- Browser config forces `PSC_E2E_NO_KEY=1`; the disposable source has no provider credential file. API probes inject a provider function that throws if invoked. No live provider/court test or real record was used. The dependency audit and official Node documentation lookup were external metadata requests, not document processing.
- Added evidence is under `tests/independent/`; application source and default test assertions are unchanged. Scratch logs and fictional runtime data remain ignored under `.setup/`.

## Environment

Windows; Node **v26.13.0**; npm **11.20.0**; Vitest **2.1.8**; Playwright package **1.49.1**; TypeScript **5.7.2**; Vite **6.0.3**; better-sqlite3 **13.2.0**; file-type **22.3.0**. Browser projects: desktop Chromium and narrow Chromium. A separate attempt to obtain the browser binary version through a restricted direct executable launch failed; no exact browser version is asserted.

## Maintained suite — PASS

`npm test`: exit **0**, **331 passed / 31 files** in the final correctly named disposable source directory.

Relevant included suites: privateHardening **29**, privateRoutes **12**, privateStore **8**, privateConfig **4**, crypto **8**, uploadValidation **9**, CasesPage **16**. These are subsets, not additional totals.

## API suite — PASS

`npm run test:api`: exit **0**, **200 passed / 17 files**. These overlap the maintained suite and must not be added to it.

## Browser suite — PASS for maintained assertions

`npm run test:e2e`: exit **0**, **56 passed**, desktop and narrow Chromium. Fictional accounts and files only, in the isolated copy. Browser throttles are relaxed by existing E2E configuration; production throttles are tested through API/auth probes instead.

The maintained private lifecycle test checks the download event/filename and separately compares authenticated API response bytes. It does **not** inspect browser-saved bytes. Its 56 passing tests cannot close the additional artifact-byte gate below.

## Typecheck — PASS

`npm run typecheck`: exit **0** on the application snapshot, and again with the final additional TypeScript test evidence present. The new control `.mjs` was executed directly; TypeScript does not claim to typecheck that file.

## Production build — PASS

`npm run build`: exit **0**. The existing SDK chunk-size warning remains. No application build configuration was modified.

## Tracked-source secret check — PASS within scanner scope

`npm run verify:secrets`: exit **0**, no credential-leak patterns in tracked source. Executed in the original repository so `git ls-files` covers its actual tracked files, rather than depending on archive-directory Git discovery. The inspected scanner excludes opening the real `.env` and does not print matched secret values. It is a pattern check, not an exhaustive historical secret audit; newly untracked evidence is outside its tracked-file scope.

`git ls-files` filename checks found no tracked runtime database, real `.env`, key file, or `.vscode` contents. This does not establish every historical commit is free of secrets.

## Secret-detector self-tests — PASS

`npm run test:secrets`: exit **0**, **7 passed**.

## Production dependency audit — PASS for reported advisories

`npm audit --omit=dev`: final exit **0**, **0 vulnerabilities** reported. The first attempt failed certificate validation (exit 1). A process-local `NODE_USE_SYSTEM_CA=1` retry used installed trusted roots; HTTPS verification was not disabled. No dependency or global registry setting was changed. This is a dated production dependency audit, not a complete security assessment or a development-toolchain audit.

## Whitespace and source-state checks — PASS

`git diff --check` and `git diff --check e2edea5..3600dd6`: exit **0**. New evidence/test files were also checked separately before delivery. HEAD/main were unchanged. No commit, push, merge, reset, deployment, global trust change, or application fix was performed.

## Preserved independent probes — PASS

Copied only the named probe source/config files from original `.setup/`; no owner runtime data or private configuration was copied. Executed their existing configurations in the isolated copy:

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed; one initial CSRF response, registration 201 |

These counts are kept separate; overlap with maintained tests is not treated as established.

## Additional independent API/storage probes — PASS for their stated assertions

`npx vitest run --config tests/independent/vitest.config.ts`: final exit **0**, **11 passed**. Source and configuration are delivered in `tests/independent/` and require execution from an isolated project copy.

The eleven checks exercise:

1. Every foreign case/document read/list/edit/upload/delete/download operation, changed document parent, generic 404, no-store, and owner byte-identical download.
2. Two held uploads, third-request 429/Retry-After, another account unaffected, validation failure releasing both slots.
3. Actual client abort, server response close, slot reuse and zero publication from the abandoned request.
4. Parent deletion during paused validation; late upload returns 404 without republishing a document.
5. Fictional content/label/filename canaries absent from test DB/WAL/key/blob/staging files, swapped ciphertext rejected with generic 503 and no document bytes.
6. SQLite insert trigger failure; 503, no document row, no staged ciphertext.
7. SQLite ready-publication update trigger failure; 503, no pending row or final blob.
8. Genuine second-connection SQLite write lock; failure response, no publication/staging residue. Test busy timeout is reduced to 20 ms only in the fixture.
9. Actual child-process exit 77 immediately after blob rename, before publication completion. On reopen a pending row exists; reconciliation removes it and its blob.
10. Failed unlink; 503, download denied, successful explicit retry, live document row removed.
11. The known incremental-PDF truncation exception. This is a **characterization assertion of unsafe/limited acceptance**, not evidence that truncation rejection passes.

No application implementation followed these tests. They are current regression/fault evidence, not reconstructed historical RED/GREEN evidence. The process-interruption test covers one real exit boundary; simulated disk-full/write/rename faults in maintained tests do not prove every OS/power-loss condition.

## Actual browser-download artifact bytes — BLOCKED

`npx playwright test --config tests/independent/playwright.config.ts`: final exit **1**, **2 failed** (desktop/narrow), at direct artifact-file read with **EPERM**. Both runs reached a download event, the expected UTF-8 filename and `download.failure() === null`; reading the browser artifact was denied. Teardown also reported timeout.

Earlier `download.saveAs` attempts failed EPERM copying the artifact; shortening the destination did not resolve it. A supported `download.path()` approach likewise failed EPERM on read. Assertions were not replaced with API bytes or weakened.

Infrastructure control: `node tests/independent/download-control.mjs` exited **1**, reporting `CONTROL_DOWNLOAD_ERROR EPERM`. It launches a fresh browser with **no project server or application code**, downloads fictional text from an in-memory Blob, and reads the browser artifact. The same failure establishes that the artifact-access problem is reproducible independently of this application. Its deeper OS/tool cause is not established; no access restriction was bypassed.

Required next evidence: run the delivered artifact test in a supported environment that permits Playwright to read its own download, or obtain separately recorded owner/manual saved-file byte/hash verification. This task does not silently waive the requested check. API download integrity remains verified.

## Acceptance and requirement/risk traceability

PASS below means the named tests passed in local fictional scope, not a universal security or reliability guarantee.

| Story criterion | Disposition | Evidence / requirement and risk links |
| --- | --- | --- |
| P1 Identity/ownership | PASS in tested scope | Maintained API/auth, private probe, added full foreign-operation matrix; FR-02/05, NFR-02/19, R05/R11 |
| P2 Case lifecycle | PASS in tested scope | Maintained CRUD/persistence and foreign-ID tests; FR-02/07, NFR-13/14, R05/R25 |
| P3 Upload boundary | FAIL against unconditional truncated-file rejection | Limits/content/path/CSRF/ownership tests pass, but incremental-PDF counterexample remains; FR-06, NFR-03/19, R13 |
| P4 Confidentiality | PASS for tested canaries/boundaries | Maintained and added at-rest scans; keys/tamper tests; FR-03, NFR-01/04/07, R05/R12 |
| P5 Integrity before disclosure | PASS API/crypto; BLOCKED browser artifact | AEAD/AAD/tamper and byte comparisons pass; actual browser artifact read denied; FR-03/05/06, NFR-01/18/19, R12/R13 |
| P6 Storage faults | PASS tested fault matrix | Maintained write/rename faults, added DB insert/update/lock and real process-exit tests; NFR-13/14/18, R19/R25. Exhaustive power-loss testing not claimed |
| P7 Live deletion | PASS in tested scope | Confirmations/owner checks, failed unlink/download denial/retry and case deletion; live FR-04, NFR-05/13, R05/R19/R25 |
| P8 Restart/key loss | PASS local persistence/fail-closed scope | Maintained restart/missing/corrupt/wrong key and key-check tests, child-process recovery; FR-03, NFR-01/14, R12/R19. Full E1-S3 restore remains OPEN |
| P9 Concurrent/revoked work | PASS selected controlled interleavings | Maintained logout/disable/timeout/stale-cookie tests; added failure/abort/parent-delete overlap; NFR-02/13/14, R05/R11/R25 |
| P10 Protected UI | PASS maintained states; BLOCKED saved-file verification | 16 CasesPage tests, browser lifecycle/keyboard/narrow, filename event; artifact bytes unavailable; NFR-13/15/18, R05/R20 |
| P11 Regression/review | BLOCKED overall | Maintained/probe checks pass; browser artifact gap, TDD gap, actual final Claude review and owner decisions remain; AD-09, NFR-18/19, R23/R24 |

## Recheck of Claude's 18 findings

These are present-behavior rechecks through independently executed maintained regressions plus the preserved/added probes. They do not independently witness Claude's historical TDD.

| # | Finding | Current evidence/disposition |
| --- | --- | --- |
| 1 | Logout/disable during pending upload | PASS: maintained hardening tests and preserved private probe |
| 2 | Late logged-out session cookie | PASS: maintained hardening assertion; preserved cookie-race probe also passes |
| 3 | Publication after 408 | PASS: maintained hardening and private probe |
| 4 | Cleanup follows junctions | PASS: maintained blobs/staging junction tests and private probe |
| 5 | Cleanup deletes unmanaged names | PASS: maintained and preserved unmanaged-file tests |
| 6 | Reset DB destroys existing blobs | PASS: maintained missing-key-check/replacement-DB cases |
| 7 | Parent deleting/error still downloadable | PASS: maintained two-status download denial |
| 8 | Pending document visible | PASS: maintained list/detail rejection |
| 9 | Truncated images/PDF accepted | PARTIAL: PNG/JPEG/ordinary PDF regressions pass; incremental PDF exception remains FAIL/open R13 |
| 10 | Mismatched extension/bidi filename | PASS: maintained matching/mismatching allowlist and bidi tests |
| 11 | Non-ASCII filename corruption | PASS: maintained UTF-8 upload test and both added browser filename assertions; saved bytes blocked |
| 12 | Body parsed before ownership | PASS: maintained validation spy and foreign-upload checks |
| 13 | Private JSON caching | PASS: maintained and added no-store assertions |
| 14 | Malformed multipart returns 500 | PASS: maintained generic 400 assertion |
| 15 | Editing stale case fields | PASS: CasesPage case-selection regression |
| 16 | Stale document lists/uploads/file selection | PASS: CasesPage regressions |
| 17 | Session loss/different account remains visible | PASS: CasesPage session/identity regressions |
| 18 | Incomplete deletion looks normal | PASS: CasesPage incomplete-state and refresh regressions |

DeepSeek's additional stale upload-success message: PASS under the current `does not show an upload result under a case selected while it was pending` test, including its message assertion. No historical RED run is certified here.

## Open findings, proposals and release limits

### F1 — P2: incremental-PDF acceptance / R13

Reproduction in added probe: create a one-page PDF, append a syntactically complete incremental revision including new xref/trailer/EOF, then cut the appended revision after its object but before the new xref/trailer/EOF. The prior EOF lies within the last 1,024 bytes, and validation accepts the truncated upload. The complete fixture is validated before the truncation assertion. An earlier fixture cut inside a string was rejected; it was corrected rather than presented as an application regression.

Expected under broad P3/UPLOAD_BAD wording: truncated input rejected. Actual: this truncated revision is accepted. Do not describe all corrupt/truncated PDFs as rejected.

Local attachment-only fictional demonstration reduces in-app rendering/execution exposure; it does not prove completeness or downloaded-file safety. Recommendation: owner and actual Claude must explicitly accept the bounded limitation with accurate user/risk wording or request a DeepSeek mitigation before E1-S2 is approved. This finding does not by itself demonstrate a critical exploit. Hosted/real-user approval cannot be inferred; parser isolation/malware controls remain separate work. PDF/image parsers are not full decoders or antivirus.

### F2 — P2 process/evidence: historical TDD and review independence / R23

Builder evidence admits routes, most UI and E2E tests followed implementation; concurrency tests are also regression evidence. Claude reports writing fixes in the same session as its review. Those fixes are not independently reviewed by that same report. Codex confirms present behavior only. Historical claims remain agent-reported/unwitnessed; passing tests cannot repair ordering history. Actual final Claude review and owner disposition of the process exception remain necessary.

### F3 — Pending owner decisions, not approvals

- Per-user two-upload limit is implemented and tested (including 429, Retry-After, release and account isolation); it is in-memory/per-process, not distributed. The owner has not approved it through this handoff.
- Node engine `>=22.2.0` is technically motivated by the direct `node:zlib.crc32` import plus installed dependencies requiring Node >=22. Official [Node zlib documentation](https://nodejs.org/api/zlib.html#zlibcrc32data-value) records crc32 introduction in **22.2.0 and 20.15.0**. Thus the API itself is not exclusive to Node 22; the dependency floors rule out adopting Node 20 for this application. Local installed `better-sqlite3@13.2.0` and `file-type@22.3.0` manifests each declare >=22.
- Only Node 26.13.0 on this Windows environment was executed. Node 22.2.0, other OSes and hosted compatibility were **not tested**; the declared minimum is not a compatibility certification. No environment was upgraded.
- ADR-0003/0004 remain marked proposed. Their exact key, limits and lifecycle choices are not permanently approved by successful tests. Spec/builder/ADR wording calling settings "owner decisions" conflicts with the current owner's pending-decision instruction and must be reconciled before approval.

### Other Claude open items — disposition

| Item | Assessment in this task |
| --- | --- |
| Key creation not atomic/fsynced | Confirmed by source inspection of direct `writeFileSync` without exclusive/atomic publication or fsync. P2 durability risk; concurrent starts/power-loss recovery not established. Key loss can make data unrecoverable. Reviewer/owner disposition needed; no key-generation fix made |
| Private initialization failure stops health/API | Confirmed by `main.ts` initialization before server listen and throwing key/config paths. P2 availability/operability limitation; fail-closed behavior protects disclosure, but startup recovery UX/health independence is not demonstrated |
| All blob names share `bl` shard | Confirmed `blob_` prefix plus first-two-character shard. P3 local scale/organization issue, not reproduced disclosure |
| Quota errors generic; error cases excluded | Confirmed source. P3 local UX/resource-policy limitation; case quota counts `status != 'error'`, so it is not a hard cap on all persisted case rows. Document quotas count ready/error records. No distributed quota guarantee |
| Standard E2E uses project runtime | Confirmed hardcoded auth root plus browser config. P2 test-isolation concern for ordinary in-place runs; avoided here through full disposable source isolation. Private-directory overrides alone are insufficient |
| Real camera/scanner breadth / NFD filenames | Maintained fixtures and fictional browser PNG/PDF tested. No real camera/scanner corpus or comprehensive image decoder test performed. Source explicitly rejects non-NFC names; support is limited rather than normalized |
| PDF parser time/memory isolation | Still absent; upload byte/page limits do not demonstrate hard CPU/memory isolation. A timer on the same event loop is not a separate parser watchdog. No hosted/real-data clearance |
| Backup/restore/retention/key recovery | E1-S3 remains OPEN; live deletion/reconciliation is not backup deletion, secure erasure or a tested full restore |

## Initial failures and harness corrections

- Restricted first Vitest/Vite runs could not read parent directories while resolving config. These were tool-startup failures, not app behavior RED. Approved tool access allowed execution without weakening tests.
- First archive folder basename differed from `ProjectSecondChance`. The maintained config test literally requires that suffix: first executed run had **330 passed, 1 failed**. Re-extracted under the expected folder name; unchanged suite then passed 331/331. This exposes a folder-name assumption, not a private-document regression.
- First browser startup failed configuration resolution and left its own API process; next attempt detected occupied port. Ownership was traced through its parents to the disposable run before stopping that run. Unrelated processes were preserved; reuseExistingServer was not enabled.
- One wrapper attempted a Windows log filename containing `test:secrets`; that redirection failed before the command executed. Its stale exit variable was not accepted as evidence. Explicit rerun with `secret-tests.log` produced 7 passing tests.
- Production audit initially failed certificate validation and succeeded using trusted system roots as above.
- Added PDF-fixture experiment had 9 passing assertions and 1 fixture mismatch; after selecting the incomplete revision boundary, the final expanded suite passed 11/11. No app code changed to make it pass.
- Browser artifact failures and the no-app EPERM control remain unresolved, not reclassified as passes. No permission bypass, antivirus disabling, tool replacement, or speculative root-cause claim was made.

## Evidence locations and final state

Main raw logs: final disposable root `.setup/` contains `maintained.log`, `api.log`, `e2e-retry.log`, `probe-*.log`, `cookie-race.log`, `additional-delivery.log`, `browser-artifact-direct.log`, `download-control.log`, `typecheck-delivery.log`, `secret-tests.log`, `audit-system-ca.log`, and `dependencies.log`. Build output is in the first disposable root's `.setup/build.log`. Logs are retained as local ignored evidence, not published runtime/keys. Selected output is preserved alongside this report in `E1-S2-codex-3600dd6-checks.txt`.

Final source HEAD/main/branch unchanged. Owner `.vscode/` remains untracked. New untracked additions are this report, its selected check output, and `tests/independent/`. No owner files were overwritten. Test-owned servers were checked after execution; no listener remained on the test ports. Fictional ignored snapshots are retained for reproducibility and were not merged or committed.

Next handoff: actual Claude performs read-only final review of the tested application commit, new evidence, open risks and uncommitted test additions. DeepSeek owns any application corrections with new valid RED/GREEN/refactor evidence. Codex retests corrections. Owner decides proposals, exceptions and merge only after the required gaps are resolved. Do not start E1-S3 now.
