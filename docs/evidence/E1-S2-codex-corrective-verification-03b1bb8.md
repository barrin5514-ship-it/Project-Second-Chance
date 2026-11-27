# E1-S2 independent corrective verification — 03b1bb8

November 25, 2026, America/New_York. Codex independently executed the checks in this report. DeepSeek remains the application Builder; actual fresh Claude review and owner approval remain separate. No application fix, migration, commit, merge, push or deployment was performed.

## 1. Executive disposition

**FAIL — corrective application verification is not satisfactory. E1-S2 is not complete or approved.** Seven supplementary assertions fail, covering six remaining issue groups: incomplete test isolation, false deletion success on a stat-unavailable retry, identity-unsafe ambiguous-upload reconciliation, one late-cookie error path, a stale error shown under another case, and worker termination acknowledgement preceding slot release.

The maintained suite passes **347 tests / 32 files** and the API subset passes **213 / 18 files**. The first full maintained browser execution passed **56**. A subsequent full execution returned **54 passed / 2 failed**, at account-page navigation (one `ERR_NETWORK_IO_SUSPENDED`, one navigation timeout); both affected cases then passed a focused unchanged rerun. Preserve all three results: the later navigation failures were not application-behavior assertion failures, but their complete cause is not established and no blanket all-browser-runs-green claim is made.

The unchanged original independent suite returns **9 passed / 2 failed**. Those two assertions are not suitable release expectations for the corrected behavior, as analyzed in section 8; they were preserved rather than edited. The separate supplementary suite returns **21 passed / 7 failed / 28 assertions**. Counts overlap or cover different boundaries and are not added together.

Actual browser-downloaded artifact bytes remain **BLOCKED** by EPERM in both viewports and a no-application control. Historical mandatory TDD compliance remains **FAIL / incomplete evidence**, with no exception granted. Existing-runtime migration, implementation proposals and fresh independent Claude review remain **BLOCKED pending their gates**.

## 2. Exact tested application commit

- `03b1bb8aee712db73d4c690be850030e050e6361`, parent `3600dd66d355804ac1f0232bc57594259ad75900`.
- Branch: `feature/e1-s2-private-documents`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`.
- The corrective commit changes 34 tracked files: application/auth/private-storage/UI code, worker implementation, maintained tests, Playwright isolation/preflight, package script and documentation. No later application successor was present during verification.
- Earlier correction `caee540` remains in this branch's ancestry. The previous Claude session disclosed authorship of that correction, so its self-review is not substituted for the fresh review gate.

## 3. Repository identity and initial Git state

Root: `<repo>`.

Initial branch tracked `origin/feature/e1-s2-private-documents` with the local branch three commits ahead. This is a locally recorded ref comparison; no fetch or current-remote assertion. Initial tracked working-tree diff was empty. Existing untracked items were `.vscode/`, the previous Codex report/check output, Claude's final review of 3600dd6, and `tests/independent/`. All were preserved; `.vscode/` contents were not inspected.

Governing material examined: AGENTS.md; approved PRD and Architecture Spine; delivery plan and risk definitions; BMAD_STABLE_TDD; current story/spec; ADR-0003/0004 and relevant auth ADR changes; threat model; builder/corrective evidence; previous Claude/Codex reports and original independent tests. Unchanged baseline material was reused from the preceding independent verification and corrective differences were inspected directly. No requirement IDs were renumbered.

Methodology: `_bmad/_config/manifest.yaml` records core/bmm **6.12.4**. The installed QA workflow, customization defaults/checklist, BGLAD rule and review-workflow role boundary were read. Existing Vitest/Playwright tools were used; no methodology install/replacement, TEA installation, new persona acting as another model, or delegated review occurred. The user's independent-verification scope controls over the QA helper's general instruction to fix failures: application failures were left for DeepSeek. Historical BGLAD next-target text still refers to the old Mira spike; the newer AGENTS/current owner instructions supersede it.

## 4. Owner runtime preservation assessment

**PASS for the non-mutating preservation procedure; historical loss remains UNKNOWN.**

Before testing, metadata-only enumeration of `<repository>/runtime` found **10 files, 4,377,586 total bytes**: auth DB plus WAL/SHM, session-secret file, master-key file and five managed ciphertext blobs. No link was followed during enumeration. No database was opened, document decrypted, secret/key value read, identity marker created, backup taken, or migration/reconciliation invoked there.

A process-name/project-reference check found no explicitly identified ProjectSecondChance API/server entry or listener on 3001/5173 at the checkpoint. One unrelated/unattributed Node candidate matched a generic Vite/tsx flag; its command text was not disclosed and it was left alone. This is not an exhaustive open-file-handle assessment or a claim that every conceivable runtime consumer was ruled out. Full source/runtime isolation made verification independent of that uncertainty.

Before/after records compare relative names, lengths, creation ticks and last-write ticks. **Zero differences**, still 10 files / 4,377,586 bytes, were observed after execution. Source/evidence hashes captured before adding new probes also have **zero changes** for all preserved original files.

Local metadata evidence: `.setup/codex-corrective-owner-runtime-before-03b1bb8.json` and `...after-03b1bb8.json`; preserved-source hashes: `.setup/codex-corrective-preserved-source-before.json`. These contain no secret values. Metadata equality does **not** establish byte equality of owner contents, DB consistency, or absence of earlier loss. The prior Claude report's admission of in-place browser testing remains historical evidence; this verification neither proves nor disproves historical deletion.

## 5. Test isolation: method and results

### Verification harness — PASS in its bounded scope

Tracked code was extracted by `git archive` from 03b1bb8 into `.setup/codex-corrective-03b1bb8/ProjectSecondChance`. Neither owner `runtime/` nor `.env` was copied. Existing installed `node_modules` was linked; `npm ls --depth=0` exited 0. This is not a clean dependency reinstall.

Existing independent probes/configs were copied unchanged. Only trusted old **source** files (`privateStore.ts`, `crypto.ts`) from 3600dd6 were extracted under the disposable copy's `.setup/legacy-source` to generate a fictional legacy fixture. No owner runtime or key was used for that fixture.

For execution, inherited `PSC_RUNTIME_DIR`, `PSC_PRIVATE_DATA_DIR` and `PSC_PRIVATE_KEY_DIR` were cleared in the test process. Browser config then supplied its own process-specific runtime. Temporary files and browser artifacts used the dedicated writable directory `<owner-home>\Documents\ChatGPT\Next Chapter Project\.codex-temp-e1s2-03b1bb8`, outside Git. All startup probes explicitly supplied a fresh fictional runtime and an absent-provider setting. Test-created child processes, servers, fault fixtures and cleanup were confined to these disposable locations. No global environment or permissions were changed.

### Shipped isolation enforcement — FAIL (CV-1)

`e1-s2-corrective-isolation.test.ts` has **3 passing / 2 failing** assertions:

- Explicit `PSC_RUNTIME_DIR` correctly moves DB/session secret and default keys/data together; unrelated synthetic sentinel preserved.
- Different direct config processes choose different `test-results/e2e-runtime-<pid>` paths. Direct Playwright therefore remains isolated with the **valid config and clean inherited overrides**, even without npm hooks.
- Missing/obviously unsafe config makes the npm static preflight fail.
- **FAIL:** inherited `PSC_PRIVATE_DATA_DIR` and `PSC_PRIVATE_KEY_DIR` both escape that browser runtime. `playwright.config.ts:65` overrides only the broad runtime. `privateConfig.ts:20-21` gives narrower inherited settings precedence. Installed Playwright `lib/plugins/webServerPlugin.js:84-87` merges parent `process.env` with configured env, confirming the inheritance mechanism rather than assuming it.
- **FAIL:** with explicit E2E flags but no runtime override, `loadAuthSettings` silently selects `<supplied fixture project>/runtime` and initializes a session-secret file instead of failing. Only a fictional sentinel root was used. `main.ts` calls that loader without a central test-runtime guard. The static npm hook does not enforce safety in a direct/misconfigured invocation.

The actual runs here were safe because the independent harness cleared overrides and used disposable source paths. That does not cure the shipped guard. Parallel full browser runs also share fixed ports: valid config uses `reuseExistingServer:false`, so port conflict should stop a second server rather than deliberately share it. No simultaneous full browser runs or distributed-runtime guarantee is claimed.

## 6. Required commands and environment

Windows; Node **26.13.0**, npm **11.20.0**, Vitest **2.1.8**, Playwright **1.49.1**, TypeScript **5.7.2**, Vite **6.0.3**, better-sqlite3 **13.2.0**. Commands below ran in the isolated source root unless stated. Plaintext fixtures and keys were synthetic. External AI/court calls were disabled; only dependency metadata and official Node documentation were consulted externally.

### Maintained tests — PASS

`npm test`: exit **0**, **347 passed / 32 files**. Relevant maintained corrective regressions include ordinary late-cookie paths, upload timeout accounting, damaged-row placeholders, PDF worker/ending checks, storage identity, source hygiene, ambiguous UI outcomes and 404 identity reconciliation.

### API tests — PASS

`npm run test:api`: exit **0**, **213 passed / 18 files**; overlaps maintained tests.

### Maintained browser tests — mixed executions; reproducibility gap retained

`npm run test:e2e`: npm isolation preflight passed and the first full runner reported **56 passed**. A tool-runtime replacement lost its terminal response, so the first shell exit was not retained as durable evidence. The complete successful runner log is `e2e.log`.

A repeat with persistent exit capture returned **exit 1, 54 passed / 2 failed**, in `e2e-attested.log`. Failing desktop cases:

- `auth.spec.ts:75`, two contexts: `page.goto('/account')`, `ERR_NETWORK_IO_SUSPENDED` and timeout, before account setup completed.
- `auth.spec.ts:99`, logged-out cookie replay: `page.goto('/account')` timed out, before the replay assertion ran.

The equivalent narrow cases and all private-document browser cases passed in that run. A focused unchanged direct-config rerun:

`npx playwright test tests/e2e/auth.spec.ts --project=chromium --grep 'keeps two independent browser contexts isolated|rejects a logged-out session cookie replay'`

returned **exit 0, 2 passed**. No sleeps/retries/assertion weakening or app fix was added. The first error explicitly reports suspended browser network I/O; the exact cause of the suspension and second navigation timeout is unestablished. These outcomes are **not** evidence of a reproduced isolation/revocation behavior defect, and the targeted pass does not erase the failed full execution. Retain a browser reproducibility gap before approval.

### Typecheck — PASS after verification-harness corrections

Final `npm run typecheck`: exit **0**, including all delivered new TypeScript probes. Initial failures were introduced by the new verification harness (React plugin's duplicate Vite type surface, then new fixture environment/property typings). The new config uses esbuild JSX compilation and corrected fixture typings. No existing test or application assertion was changed. These compiler failures are not app RED evidence.

### Build — PASS

`npm run build`: exit **0**; existing SDK chunk-size warning remains.

### Secret verification — PASS within scanner scope

`npm run verify:secrets`: exit **0**, executed against the **original tracked repository** after inspecting the scanner's exclusion rules. It never opens the real `.env` and does not print values. This narrow scanner is not a full historical secret audit; newly untracked probes/evidence are not covered by `git ls-files` scanning.

`npm run test:secrets`: final exit **0**, **7 passed**. Initial fixture execution with TEMP inside a Git checkout failed because Git discovery changed the scanner's synthetic-fixture scope. Moving only the independent disposable temp root outside Git restored the intended fixture behavior; the scanner/tests were not edited. Keep the initial failure as harness history.

### Production dependency audit — PASS for reported advisories

`npm audit --omit=dev`: exit **0**, **0 vulnerabilities**. Process-local `NODE_USE_SYSTEM_CA=1` used installed trusted roots; no disabled TLS validation or global config change. This does not cover the full application, all development tooling, legal accuracy or deployment security.

### Git/whitespace — PASS

`git diff --check`, `git diff --check 3600dd6..03b1bb8`, and `git diff --check e2edea5..03b1bb8`: exit **0**. New evidence/tests were separately checked before delivery. No tracked application changes were made by Codex.

### Preserved probes — PASS for their assertions

| Exact command | Exit | Count |
| --- | --- | --- |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed; one initial CSRF response, registration 201 |

No standalone runnable Claude-specific final-review probe/config was found in the inspected `.setup/` inventory. Maintained tests derived from its findings were executed, and new independent probes address its corrective areas, but historical Claude probe executions are not represented as rerun. This is a reproducibility artifact gap.

## 7. FIX A–K findings

Each disposition below is scoped to the stated expectation. Owner acceptance of proposals remains separate.

### FIX A — PDF resource bounds: configured controls PASS; lifecycle FAIL

Expected: parsing off the main thread, actual configured limits/deadline, controlled failure and resource termination. `pdfValidation.ts:29-35` requests 64 MiB old-generation, 16 MiB young-generation and 16 MiB code-range settings. The observed real worker reports the 64 MiB old-generation value. A one-page real PDF completed in **806 ms** in the final measured run; a main-thread callback ran before its completion.

A harmless idle-worker control exercised the **actual default deadline**, rejecting after **3,013 ms**. It substitutes only the worker workload, avoiding a decompression bomb. Actual invalid input and a controlled worker exception produce classified errors. Two short deadline controls plus invalid input left **zero observed workers** after cleanup. No OOM attack, large expansion payload, RSS ceiling or long-run load test was performed.

**FAIL CV-6:** `finish()` at `pdfValidation.ts:42` requests termination with `void worker.terminate()` and immediately settles validation. At the deadline rejection the observer recorded `validationSettledBeforeWorkerExit:true` and `workerThreadStillRegistered:true`. The route releases the slot in `finally` when that promise settles. This establishes a missing termination-acknowledgement barrier, not measured sustained extra CPU use or a permanent worker leak. Eventual worker exit passes. Await cleanup completion before claiming exact work-lifetime accounting.

Evidence: `e1-s2-corrective-worker.test.ts:19,30,37` and subsequent controls; P3/P9, FR-06, NFR-03/13/19, R13/R25.

The settings are **not total process memory limits**. Node documents that worker engine limits exclude external data such as ArrayBuffers and do not prevent global OOM; command-line heap flags may override individual values. See [official Worker options](https://nodejs.org/api/worker_threads.html#new-workerfilename-options). Do not describe this as a guaranteed 64 MiB parser process or malware scanner.

### FIX B — storage identity: PASS tested guard; legacy compatibility BLOCKED

Expected: wrong directory fails before reconciliation damages valid records, correct directory/key restores access. `privateStore.ts:317-365` verifies DB/data identity. In the independent fixture, a wrong directory threw `identity`, private document rows were unchanged, the unrelated sentinel remained, and reopening the correct store returned original bytes. Existing maintained reset-DB/marker cases also pass.

The implementation does perform additive schema initialization and directory creation before the identity check; do not call it wholly side-effect-free or byte-identical DB startup. The verified property is **no destructive private-row/blob reconciliation** in the tested mismatch case. Marker is a random identifier, not authenticated proof against a local adversary who can copy/edit both marker and DB. That stronger threat model was not tested or approved.

Evidence: corrective API test at line 82 and legacy test at 192; P2/P4/P6/P8, FR-03/07, NFR-13/14, R12/R19/R25. Existing-runtime compatibility remains separately blocked in section 9.

### FIX C — truthful deletion: FAIL (CV-2)

Expected: unavailable required storage must not be reported removed; retry must distinguish verified absence from inability to determine existence.

Passing case: actually remove a fictional blob, then delete. First request returns 503/error and denies download; after reopening/reconciliation an explicit retry returns 204 and removes the logical row. The truly missing file therefore does not remain permanently stuck. An unrelated sentinel remains intact. This terminal state is **logical deletion of an already absent blob**, not a second physical removal, backup deletion or secure erasure.

Failing case: supported `PrivateFileOps.exists` fault injection reports false for an unavailable blob path while the real fictional ciphertext still exists. First delete returns 503, but retry returns **204**, removes the DB row, and **leaves ciphertext present**. Final metrics: `deletionRetryStatus:204`, `ciphertextStillExists:true`, `documentRows:0`. No OS permissions were changed. This models the information loss in a boolean existence check; real OS permission denial was not induced.

Root: `removeManaged` at `privateStore.ts:306` and retry `allowMissing` at `:716` / case deletion `:743`. Error/deleting state treats any false existence result as verified absence. Later orphan cleanup would not make the earlier success truthful. Return this to DeepSeek, preserving true-ENOENT terminal cleanup and fail-closed stat/unlink errors.

Evidence: corrective API tests at 94 and 105; P6/P7, FR-04, NFR-05/13/14, R18/R19/R25. Severity P2.

### FIX D — ambiguous uploads and message scope: FAIL (CV-3 and CV-5)

Passing normal-account controls for status **0, 408 and 503** refresh server documents, show an uncertainty warning, retain existing document visibility and make only **one** upload call. File selection is cleared and no automatic upload replay occurs.

**CV-3, P2:** switch the simulated authoritative account to B during A's pending upload, then return an ambiguous 503. Reconciliation calls `listCases` and renders B's case list while retaining A's identity label; `/me` has only its initial call. Metrics: `identityChecks:1`, `newAccountCaseShown:true`, `oldIdentityStillShown:true`. `showServerState` at `CasesPage.tsx:162` and ambiguous upload handling `:288-302` bypass the authoritative identity check. This is a component-boundary reproduction with a controlled client, not a demonstrated server cross-account authorization bypass; direct server isolation still passes.

**CV-5, P3:** select another case while an upload is pending, then reject with definite 400 `invalid-upload`. The previous case's error appears under the new case. Success paths have selection guards; the generic catch/`handleError` path (`:302`, `:359-372`) does not. A UI warning tied to the wrong operation is not acceptable uncertainty handling.

Evidence: `e1-s2-corrective-ui.test.tsx:14,22,32`; P9/P10, NFR-02/13/14/15, R05/R11/R20/R25.

Duplicate semantics: P9 explicitly requires **testing duplicate submissions**; P10 explicitly requires server reconciliation instead of silently duplicating after an ambiguous write. Neither PRD FR-01–07 nor this story defines a durable idempotency-key protocol or universal exactly-once acceptance contract. Repeated identical payloads remain accepted as separate documents in the controlled concurrency probes. Warning/reconciliation is not guaranteed deduplication. Current normal same-account reconciliation passes, while identity/message gaps above fail. Any stronger duplicate-prevention policy needs an explicit owner decision; no inferred idempotency requirement is silently waived or declared implemented.

### FIX E — concurrency accounting: PASS main interleavings; FAIL exact worker boundary

The proposed number remains **two**, not owner-approved. Maintained tests verify 429/`Retry-After:1`, success release, second-account isolation and retaining slots after 408 while validation is gated. Added tests verify:

- A disconnected request **retains its slot while validation is still held**; a third request receives 429.
- After validation settles, the abandoned request publishes nothing and a later upload succeeds.
- Two bounded incomplete multipart requests acquire slots; destroying them permits a subsequent upload and leaves no abandoned publication.
- Validation failures release slots; previously preserved regression also passes.

Thus the untested disconnect path raised by the builder now has direct controlled evidence. CV-6 still means final worker exit/termination acknowledgement is not awaited before the route's release. This is distinct from the now-correct rejection of the old test's immediate-disconnect-release expectation. Per-process counters are not distributed limits or a hard wall-clock bound on all multipart reception.

Evidence: corrective API tests at 123/132; maintained `privateHardening.test.ts:317-390`; worker lifecycle test. P3/P9, FR-06, NFR-03/13, R13/R25.

### FIX F — logout/session cookies: FAIL one unexpected-error path (CV-4)

Maintained tests for logout/disable/expiry, ordinary late validation failure, missing session, 408, no late successful publication and browser cookie-race regression pass. No authenticated use of a revoked session was reproduced.

Added negative path: hold validation, log out (204), then reject validation with an unexpected generic exception. `privateRoutes.ts:294` returns `invalid(res)` without authorization rechecking. Actual result: **400**, **Set-Cookie present**, no published row. The test expects 401 and no stale session cookie. Metrics log only the presence boolean, never the cookie value.

This does not prove the dead session becomes authorized. It retains the risk that a late response overwrites a newer browser cookie; a full newer-sign-in overwrite was not demonstrated here. Route every late failure through the same authorization/cookie-suppression policy. Evidence: corrective API test at 143; P1/P9/P11, FR-01/02/05, NFR-02/19, R11/R05. Severity P3.

### FIX G — source and filename hygiene: PASS in scanner scope

The maintained scanner covers app `.ts/.tsx/.js/.mjs` source, including maintained tests under apps. Explicit escapes replace the direction controls in the affected validator/regression. A separate disposable copy of the **unchanged** hygiene test failed when a synthetic source file contained a generated raw direction-control character, then passed after removing that file. That is current detector evidence, not historical TDD proof.

International NFC `résumé-ficticio.png` passes; a generated bidi filename and decomposed/NFD filename are rejected under the existing reject-rather-than-normalize policy. Legitimate international support is therefore bounded by NFC and the allowlist. Source hygiene is separate from validating user input. Evidence: corrective hygiene test at 8, API G/H test at 156 and maintained filename tests. P3/P11, FR-06, NFR-03/04, R13/R23. Independent/config/document paths are outside the app-source scanner's default roots.

### FIX H — PDF endings: PASS detected-tail cases; residual acceptance BLOCKED

Supported one-page PDFs pass, along with trailing PDF whitespace/NUL. Ordinary malformed trailers and unfinished appended revisions are rejected; the old positive characterization now fails as expected. Existing PNG/JPEG suites remain green.

A byte sequence ending **exactly at a valid older save boundary** remains accepted. It is identical to that older valid file, so this validator alone has no evidence of a lost later revision. No supplied expected length/hash or comprehensive PDF integrity/malware guarantee exists. Owner acceptance of that precise residual and wording remains pending.

Evidence: corrective API G/H test at 156, original characterization at `e1-s2-codex.test.ts:220`, maintained upload tests, ADR-0004 D2; P3/P5, FR-06, NFR-03/19, R13. Image checks are structural, not full pixel decoding or a real scanner/camera corpus evaluation.

### FIX I — key initialization: PASS tested creation/failure; crash guarantees BLOCKED

Source `crypto.ts:110-137` uses `wx`, handles EEXIST without replacement, and file-fsyncs the newly created key before the ordinary new-key path returns. Synthetic-key tests verify reuse without byte replacement, corrupt initialization preserved/fail-closed, missing required key rejected, and correct encryption/decryption through other probes. No key values are printed.

File fsync and directory fsync are different. **No key-directory fsync attempt is present in this key-creation function**; store/data-directory fsync does not establish durable publication of the key directory entry. Existing-key/EEXIST paths do not independently prove that another creator completed its fsync. Atomic two-phase key publication, adversarial multi-process creation and real power-loss behavior were not established. The builder's generic best-effort-directory-fsync statement must not become a claim that key-directory durability was verified. Owner/reviewer disposition remains necessary; do not claim complete crash durability.

Evidence: corrective API key test at 169 and maintained crypto tests; P4/P5/P8, FR-03, NFR-01/04/14, R12/R19/R25.

### FIX J — liveness/readiness: PASS tested initialization semantics; policy BLOCKED

Actual child-process executions of `main.ts` with explicit disposable runtimes verify:

- Fresh store: `/api/health` 200 with the frozen fictional-demo liveness body; `/api/ready` 200 ready body.
- Synthetic corrupt private key: health remains 200, auth CSRF/register/login works, readiness returns generic 503 with `no-store`, authenticated private requests return generic 503, anonymous private access remains 401. Captured output exposes neither fixture key text nor runtime path.

Evidence: `e1-s2-corrective-startup.test.ts:22,27`; `main.ts:42-64`; `health.routes.ts:19-28`. Readiness reflects initialization's non-null store, not an ongoing exhaustive disk/DB health probe. No guarantee of all post-startup failures is inferred. The new endpoint/fallback semantics should receive an explicit ADR/owner disposition; ADR-0003 still refers to a future readiness endpoint although one is implemented. P8/P11, NFR-13/14/18, R07/R12/R25.

### FIX K — quotas/error semantics: PASS tested local counts; broader guarantee BLOCKED

Added boundary tests create 100 fictional cases, set error/deleting statuses, and confirm another case is rejected. Another account remains independent. Fifty persisted error documents reach the per-case cap and reject another upload. Source now counts all cases and documents except pending; maintained pending visibility/cleanup and failed-upload tests pass. Not every document/account-state boundary or multi-process race was independently executed.

This supports the **documented proposed best-effort single-process policy**, not a serializable quota guarantee. Pending exclusion must stay explicit. Generic `invalid-request` still maps quota refusal to advice about fields/file format rather than naming a reached quota: a residual P3 usability concern by inspection, not a newly reproduced quota bypass. Counts and error policy need owner approval; no weaker policy is silently approved. Evidence: corrective API test at 179, `privateStore.ts:477-486,533-547`, route `:314`, UI `errorText`; P3/P9/P10, FR-06, NFR-03/13, R13/R20/R25.

## 8. Original versus supplementary independent tests

Original files are **unchanged**, confirmed by pre/post source hashes. `npx vitest run --config tests/independent/vitest.config.ts`: captured final exit **1**, **9 passed / 2 failed**.

| Original failure | Actual result | Requirement assessment |
| --- | --- | --- |
| P9 immediate disconnect-slot release, original test line 118 | Expected 201 while validation still held; actual 429 | Earlier ADR said response finish/close. Corrective ADR proposes work-lifetime accounting, which better bounds active validation. Immediate reuse is not an approved PRD guarantee and is contrary to that intended safety control while work is active. Numerical policy/new ADR remains owner-pending. Preserve old failure; use separate retain-then-release and multipart-abort tests, both passing, rather than edit it |
| R13 old truncation characterization, line 220 | Expected acceptance; actual `invalid-upload` rejection | Historical characterization, not a requirement to accept damaged input. Rejection supports existing P3 intent. Compatibility/residual policy still needs owner acceptance; this failed positive characterization is not a reason to restore unsafe tail acceptance |

These analyses independently support the builder's explanations **for those two assertions only**. They do not certify all corrections or the new worker-exit boundary.

Separate new command: `npx vitest run --config tests/independent/corrective.vitest.config.ts`: final exit **1**, **21 passed / 7 failed**, 28 assertions across six files. API/storage 8/10, UI 3/5, isolation 3/5, worker 4/5, actual startup 2/2, hygiene 1/1. Failures are preserved as Builder reproduction cases.

## 9. Existing-runtime compatibility and migration

**BLOCKED for use of legacy data; PASS for tested fail-closed behavior.** A legacy-format store was generated with old trusted source, fictional account/document and a newly generated test key. The corrected store rejects it with `identity`. Private document rows, key digest and still-decryptable fictional document bytes are preserved; no identity marker is auto-created. Additive schema changes may still occur, so whole-DB byte identity is not claimed.

No owner-runtime database was opened to infer compatibility. Metadata-only absence of the new marker plus the code's policy means existing owner-data activation should be treated as unavailable until approved migration, not silently solved by a fresh empty store.

The existing proposal is a broad backup/restore procedure, not an implemented/reviewed identity migration. A separately scoped DeepSeek proposal is needed: prove DB/key/blob correspondence and ownership; preflight before writes; define a coordinated transactional/atomic identity establishment, interruption/rollback behavior and refusal of mismatches; verify in legacy fictional fixtures. No stamping or key replacement against owner data is authorized here.

E1-S3 owns full retention/backup/recovery rehearsal. A narrow E1-S2 compatibility correction may be necessary **before using existing runtime**; the owner must decide whether acceptance is for fresh disposable demonstrations only or requires that migration first. Earlier reader access after the synthetic rejection is narrow rollback evidence, not permission to roll back real data. An actual backup, restore or owner migration still requires separate authorization.

## 10. Browser artifact-byte verification

**BLOCKED; no waiver.** The unchanged `tests/independent/e1-s2-download.spec.ts` executed via `npx playwright test --config tests/independent/playwright.config.ts`: **exit 1, 2 failed**, both at `readFileSync(download.path())` with EPERM. It reached download event, expected UTF-8 filename and a null failure result before the read denial. API byte equality remains separately verified.

`node tests/independent/download-control.mjs`: **exit 1**, `CONTROL_DOWNLOAD_ERROR EPERM`, with no application server/account/upload involved. This reoccurred even after using the explicitly isolated writable temporary directory. No permissions, protections or unrelated files were changed. The low-level cause is unknown; no unsupported workaround was attempted.

Supported next evidence: run the unchanged spec/control in an environment that supports reading its browser artifacts, or have the owner upload an intentionally fictional file through their browser, save the download and record matching original/downloaded SHA-256 hashes, browser/version and result. API bytes, event initiation, an inspected Blob, or a warning are not substitutes. Record any owner disposition explicitly; this report grants no exception.

## 11. Historical TDD assessment

**FAIL for admitted ordering gaps; historical source-hygiene RED remains agent-reported rather than independently witnessed.** The corrective evidence explicitly states that most server/UI corrections had tests written alongside or after implementation. The single corrective commit contains implementation/tests together; history alone cannot establish execution ordering. No retained pre-implementation server RED evidence was identified that changes that admission.

Current maintained/new regressions are real independent executions. The new controlled hygiene detector failure/removal cycle validates the detector **now**, not the builder's earlier chronology. The new failing application assertions are current independent findings, not retrospective proof that previous development was TDD. Setup/compiler/import/fixture failures are not behavior RED.

Future corrections: DeepSeek must run each meaningful failing behavior assertion before its corresponding app fix, save command/exit/assertion output, implement minimum GREEN, refactor and rerun required checks. Historical exceptions remain an explicit owner decision, documented without deleting admissions or reconstructing fake history. R23/AD-09 stays open.

## 12. P1–P11 acceptance matrix

| Criterion | Disposition | Evidence and remaining issue |
| --- | --- | --- |
| P1 Identity/ownership | PASS direct authorization; FAIL late-cookie branch | Maintained/API and original foreign-ID matrix pass; CV-4 fails late error policy |
| P2 Case lifecycle | PASS tested CRUD/local scope | 347 suite, API/private probes, corrected damaged-row placeholders; no production claim |
| P3 Upload boundary | FAIL lifecycle/isolation; PASS structural improvements | Worker limits/deadline/ending tests pass; CV-1/CV-6; exact-boundary PDF acceptance pending |
| P4 Confidentiality | PASS tested at-rest canaries; BLOCKED broader durability | Original canary/swapped-ciphertext assertions pass; key directory durability/recovery not certified |
| P5 Integrity | PASS API/crypto; BLOCKED browser artifact | Byte equality, AEAD/AAD/tag failure pass; EPERM prevents saved-artifact assertion |
| P6 Atomicity/faults | FAIL CV-2; PASS other selected faults | Original DB/lock/process-exit probes pass; stat-unavailable deletion can still falsely succeed |
| P7 Live deletion | FAIL CV-2 | True absence reaches terminal retry; unavailable existence cannot safely become 204 |
| P8 Restart/key loss | PASS tested fresh store; BLOCKED legacy activation | Wrong/missing key guards and identity tests pass; approved migration/restore absent |
| P9 Concurrent/revoked work | FAIL CV-3/CV-4/CV-6 | Normal timeout/disconnect/multipart/account limits pass; identity, generic error and final worker boundary fail |
| P10 Protected usable UI | FAIL CV-3/CV-5 | Same-account ambiguous refresh/no-auto-replay and narrow/keyboard pass; identity/message scope gaps; artifact block |
| P11 Regression/review | FAIL/BLOCKED | Supplementary failures, mandatory TDD gap, mixed browser runs, artifact access and fresh Claude/owner gates remain |

Instructor privacy demonstration: **PASS in tested direct-request scope** — the unchanged original foreign-operation matrix and maintained API tests reject cross-account case/document list/read/edit/upload/download/delete and altered-parent IDs. Browser private case isolation also passed. This does not certify every future resource; the UI identity-mislabeling failure remains separately reported.

## 13. PRD, architecture, ADR and risk traceability

| Requirement/risk | Current evidence / disposition | Next action |
| --- | --- | --- |
| FR-01/02/05, NFR-02/19; R05/R11 | Direct authorization PASS; late-cookie and UI identity FAIL | DeepSeek correct CV-3/CV-4; retain negative account tests |
| FR-03, NFR-01/04/07; R12 | Ciphertext/canary/key failures PASS in tests; recovery/durable key directory BLOCKED | Preserve key separation; clarify guarantees and obtain review |
| FR-04, NFR-05/13/14; R18/R19/R25 | Unavailable-stat retry FAIL; wrong-store/legacy refusal PASS | CV-2; approved migration/recovery plan separately |
| FR-06/07, NFR-03/13/18/19; R13/R25 | Ordinary content/limits/worker timeout PASS; exact work lifetime FAIL; quotas proposed | CV-6, preserve ending checks, review limits/residuals |
| NFR-13/15/18; R20 | Normal UI/browser workflows PASS; stale message FAIL, repeat navigation incomplete reliability | CV-5; retain all browser outcomes and rerun required gates after fixes |
| AD-09, NFR-18; R23 | Independent failures retained; historical TDD FAIL | Prospective RED/GREEN evidence; owner decides exception |
| AD-02/09; R09/R10/R24 | Correct repo/pin/scope preserved; Node minimum untested | No methodology/version changes; explicit owner decisions |
| AD-10, NFR-21/22; R08/R19/R21 | Hosted/real data/recovery BLOCKED | No deployment or real-user use |

All ten ADs were considered: AD-01/02 preserve the modular monolith/stack; the worker is in-process, not a new service. AD-03/06 retain SQLite, separate encrypted files, maintained auth and server ownership, with the failures above. AD-04/05/07/08 external AI, court and legal/extraction capabilities were not activated or certified. AD-09 gates are unsatisfied. AD-10 remains fictional/local only with recovery and hosted controls unproved. Architecture scope preservation does not imply feature/security gate completion.

Documentation discrepancies: ADR/spec/threat model overstate "every" late error recheck (CV-4); ambiguous actions reconciling `/me` (CV-3); actual-work slots ending only with worker termination (CV-6); and unconditional test isolation (CV-1). ADR-0003 still calls readiness future although implemented. Exact upload/Node proposals are now mostly labeled pending; historical approval wording/commit text is not rewritten and confers no authorization. Corrective evidence's F-number aliases differ from Claude's original numbering, so this report uses FIX A–K and CV identifiers explicitly.

## 14. Severity-ranked unresolved findings

| ID | Severity | Confirmed behavior | Precise source / independent test |
| --- | --- | --- | --- |
| CV-1 | P2 | Narrow inherited paths escape E2E root; explicit E2E mode without override selects default runtime | `playwright.config.ts:65`, `privateConfig.ts:20-21`, `authConfig.ts:22`; corrective isolation tests at 24 and missing-mode test |
| CV-2 | P2 | Stat-unavailable deletion retry returns 204, loses row, leaves ciphertext | `privateStore.ts:306,716,743`; corrective API test at 105 |
| CV-3 | P2 | Ambiguous reconciliation renders new-account cases under old identity, no `/me` recheck | `CasesPage.tsx:162,288-302`; corrective UI test at 22 |
| CV-4 | P3 | Unexpected validation exception after logout returns 400 + stale Set-Cookie | `privateRoutes.ts:294`; corrective API test at 143 |
| CV-5 | P3 | Definite old-upload error appears under a different selected case | `CasesPage.tsx:302,359-372`; corrective UI stale-error test |
| CV-6 | P3 | Validation settles and releases route slot before worker exit acknowledgement | `pdfValidation.ts:42`, `privateRoutes.ts:318-319`; corrective worker lifecycle test |

Six issue groups, seven failing assertions (CV-1 has two). No critical exploit, revived usable logged-out session, actual owner data loss, unconsented provider request, or server cross-account document disclosure was established. Do not inflate the severity beyond the reproduction.

## 15. Pending owner decisions

No approval found for: permanent two-upload value; minimum Node version/support matrix; historical TDD exceptions; residual exact-boundary PDF limitation; browser artifact disposition; existing-runtime migration; material readiness/storage/quota policy. A documented proposal or passing test is not approval.

The installed better-sqlite3/file-type engine floors are >=22, and the application directly imports crc32. The declared >=22.2.0 floor is technically motivated, as in the preceding Node documentation check, but **only Node 26.13.0 on this Windows environment was executed**. No global Node change, Node 22.2.0 test, other-OS proof or hosted compatibility evidence was obtained.

## 16. Local fictional-demo suitability

**Not cleared for E1-S2 acceptance.** Fresh fictional core workflows execute, but required corrective assertions fail and proposals/process/artifact gates remain. Existing owner runtime must remain untouched until approved migration. A limited demonstration is an owner decision with explicit limitations, not a release approval inferred here. NO FALSE HOPE includes truthful save/delete/uncertainty states as well as the future legal boundary.

## 17. Restricted hosted-demo readiness

**BLOCKED.** No hosted deployment, TLS/restricted participant access verification, distributed quota/worker resource assurance, durable hosted keys, recovery rehearsal or host runtime compatibility was performed. Worker engine limits and a clean dependency audit are insufficient clearance.

## 18. Real-user readiness

**BLOCKED.** Fictional data only. No complete security assessment, qualified legal review, validated legal source/citation pipeline, consent gateway, recovery/retention program or production operations evidence. This story does not verify the instructor's later legal-claim/date-correction/stale-source demonstrations. No MVP expansion is authorized.

## 19. Final Git state and evidence

HEAD/main/branch remain as in sections 2–3, with no tracked source changes. Existing `.vscode/`, prior Codex/Claude evidence and original independent tests are preserved. New additions are the seven corrective test/config files under `tests/independent/`, this report and its selected output file `E1-S2-codex-corrective-03b1bb8-checks.txt`. They remain uncommitted. No stage/commit/push/merge/deployment, permission change or owner-runtime operation was performed.

Full local logs are retained under the disposable source `.setup/`: `maintained.log`, `api.log`, `e2e.log`, `e2e-attested.log/.exit`, `auth-navigation-recheck.log/.exit`, `original-independent-attested.log/.exit`, `corrective-final28.log/.exit`, `typecheck-final28.log/.exit`, `build.log`, `secret-tests-retry.log`, `audit.log`, `dependencies.log`, `probe-*.log/.exit`, `cookie-race.log/.exit`, `browser-artifact.log/.exit`, `download-control.log/.exit`. Selected non-sensitive output is copied beside this report. Earlier harness failures and intermediate logs are retained, not substituted for the final results.

Harness notes: tool-runtime replacements lost some terminal responses; outputs were inspected before any retry. The repeated full browser run preserved its later failures rather than overwriting the successful first log. A hygiene control initially inspected stdout only although the file detail was in stderr; it was corrected to inspect both, and its detector behavior passed. Only new verification harness files were corrected; no original failing test/assertion was edited or weakened.

## 20. Recommended next agent assignment and stop

**Return confirmed application defects to DeepSeek through the coordinator. Do not route this into an approval-only Claude review.** Prioritize CV-1/CV-2/CV-3, then CV-4/CV-5/CV-6; preserve independent tests and attach valid prospective RED/GREEN/refactor evidence for each fix. Clarify key-directory durability, readiness/quotas and the separately scoped legacy migration proposal without touching owner data or starting E1-S3.

Codex must retest the successor, including original and supplementary results separately. A genuinely fresh Claude session that did not author the implementation then reviews the corrected diff/evidence. Owner decides proposals/exceptions and any merge. This report grants none of those approvals and stops at verification/evidence/handoff.
