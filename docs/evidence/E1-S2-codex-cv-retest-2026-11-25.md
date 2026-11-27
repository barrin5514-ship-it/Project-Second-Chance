# E1-S2 uncommitted CV corrections — independent Codex retest

November 25, 2026 (America/New_York). Application implementation was not edited by Codex. DeepSeek remains Builder; a fresh Claude session remains Reviewer; owner approval is separate.

## Disposition

**Original seven CV failure assertions: PASS, 7/7. Overall E1-S2 acceptance: FAIL / BLOCKED.** A separate delayed-response account-transition check still fails (CV-3-R1 below). Browser artifact bytes, historical TDD exceptions, fresh review and owner implementation-policy decisions also remain unresolved. No merge, commit, push, migration or E1-S3 activation is authorized by this report.

The reported full supplementary result is independently reproduced: **27 passed / 1 failed** when run without competing suites, with the failure at an incompatible post-exit worker-property assertion. That assertion is not evidence that the corrected worker lacks configured limits. Two separate stage-aware worker controls pass. The additional UI identity-transition assertion fails. All previous tests and reports were preserved unchanged; none was weakened to obtain GREEN.

## Exact uncommitted source tested

- Repository: `<repo>`.
- Branch: `feature/e1-s2-private-documents`.
- HEAD: `03b1bb8aee712db73d4c690be850030e050e6361`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`.
- Locally recorded upstream comparison: ahead 3; no fetch or current-remote assertion.
- **This is not verification of HEAD alone.** Seventeen modified tracked files were overlaid onto a clean archive of HEAD. Their exact raw-file hashes are recorded in `E1-S2-cv-retest-source-manifest-2026-11-25.json`.
- SHA-256 of that manifest: `FF46D5634759668264EB7FE1C871E7FABB438EECC9316B9BC96503422D9C9959`.
- Those source/document hashes were checked again before delivery. No source drift was observed. Tests apply to **HEAD plus this working-tree manifest**, not a new committed checkpoint.

AGENTS.md, established PRD/Architecture Spine/story/methodology, previous independent findings and the new builder report govern this retest. The actual uncommitted application/configuration diff and relevant updated ADR/risk/threat wording were inspected. No methodology was installed or changed. Previous actor-authored evidence is distinguished from execution in this chat.

## Owner-runtime preservation and isolation

Before execution, metadata-only assessment again found **10 owner-runtime files / 4,377,586 bytes**. No owner database, key, secret, document contents or `.env` value was opened. No owner runtime was copied, started, migrated, initialized, reconciled, restored or backed up. No project/server process candidate or test-port listener was found in the initial non-mutating process check.

The disposable source root is `.setup/codex-cv-retest-20261125/ProjectSecondChance`. It contains archived tracked source plus the 17 working-tree overlays and copied test files, with neither owner `runtime/` nor `.env`. Installed `node_modules` is reused through a junction; this is not a clean dependency installation or OS sandbox.

Test processes clear inherited runtime/private-directory overrides. Browser config then supplies all three explicit disposable paths. TEMP/TMP point only to the dedicated directory `<owner-home>\Documents\ChatGPT\Next Chapter Project\.codex-temp-cv-retest-20261125`, outside Git. The legacy fixture uses trusted old source and newly generated fictional data/keys, never owner data. API harnesses disable providers; browser config disables provider access and uses fake media. No court or external AI request was made.

Final metadata comparison and preserved-source hashes are recorded in section "Final preservation and Git state." Metadata equality is **not** proof that no historical loss occurred or that the owner DB is consistent. The owner's shortened historical metadata hash was not treated as a content hash or independently reconstructed using an unknown serialization.

## Maintained tests — PASS after uncontended rerun

`npm test`: final **exit 0, 347 passed / 32 files**, unchanged default command/settings and application source.

The first execution overlapped another verification suite and returned **exit 1, 345 passed / 2 failed**: a private-route lifecycle test exceeded its 5-second test budget, and a tamper fixture had no expected document response field. The parallel supplementary run also hit startup/child-process/valid-PDF timing limits. These failures are retained. The complete maintained suite then passed when run alone without any app/assertion/time-budget changes. This is consistent with timing sensitivity; the precise host-resource cause and the earlier missing upload field were not conclusively traced. Do not erase the initial failures or claim a new app fix caused the pass.

Logs: `maintained.log/.exit`, `maintained-uncontended.log/.exit`.

## API tests — PASS

`npm run test:api`: **exit 0, 213 passed / 18 files**. These overlap the maintained suite and are not added to it.

## Browser tests — current result recorded separately

`npm run test:e2e`: **exit 0, 56 passed**, using the corrected three-path isolation configuration and npm preflight. The complete result is retained in `e2e.log/.exit` and the selected check output accompanying this report. Desktop/narrow tests use fictional accounts/documents only. Browser assertions verify events/filenames and API bytes; they do not verify the saved browser artifact.

Earlier Codex browser outcomes at the preceding checkpoint (56 passing, then 54/2 navigation failures, then focused 2/2) remain historical records, not overwritten by this run. A new passing run does not retroactively remove that reproducibility history.

## Compiler, build, secrets and audit

| Exact command | Independently observed result |
| --- | --- |
| `npm run typecheck` | exit 0, including new stage-aware/identity tests |
| `npm run build` | exit 0; existing SDK chunk-size warning remains |
| `npm run verify:secrets` | exit 0 in the original repository; no tracked-source leak patterns |
| `npm run test:secrets` | exit 0, 7 passed |
| `npm audit --omit=dev` | exit 0, zero reported production vulnerabilities |
| `git diff --check` | exit 0 |
| `git diff --check 03b1bb8` | exit 0 for uncommitted corrections |
| `git diff --check 3600dd6..03b1bb8` | exit 0 for the preceding corrective commit |

Runtime: Windows, Node **26.13.0**, npm **11.20.0**, same pinned Vitest/Playwright/TypeScript/Vite stack as the prior report. Only this Node/OS combination was executed. No global runtime or dependency changes. The audit uses process-local trusted system CAs, without disabling HTTPS verification. It is not a full application security assessment. The tracked-source secret scanner does not scan newly untracked evidence/tests and never opens the real `.env`.

## Original and supplementary tests — results kept separate

### Unchanged original independent suite

`npx vitest run --config tests/independent/vitest.config.ts`: **exit 1, 9 passed / 2 failed**. The old immediate-disconnect-release assertion and old PDF-tail acceptance characterization still fail as expected under the corrective policy. Their meaning and owner approval limits remain as assessed in `E1-S2-codex-corrective-verification-03b1bb8.md`. Neither file nor assertion was edited.

### Unchanged 28-assertion supplementary suite

Initial overlapping execution: **exit 1, 22 passed / 6 failed**. Five additional failures involved child startup/process deadlines or a valid PDF fixture; the sixth was the post-exit native-property assertion. No assertion was weakened.

Uncontended sequential-file execution:

`npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false`

returned **exit 1, 27 passed / 1 failed**. File sequencing changes harness scheduling, not app/parser deadlines, fixtures, assertions or the original test files. API/storage 10/10; UI 5/5; isolation 5/5; worker 4/5; startup 2/2; hygiene 1/1.

### Exact seven original CV failures

`npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false --testNamePattern 'browser configuration must neutralize|explicit E2E mode|stat is unavailable|ambiguous response after account|unexpected validation failure|rejected upload message|validation must not settle'`

returned **exit 0, 7 passed / 21 skipped**. This explicitly verifies the original CV failure scenarios; it is not an all-28-tests pass.

### Added independent retest controls

`npx vitest run --config tests/independent/cv-retest.vitest.config.ts`: **exit 1, 2 passed / 1 failed**. Both stage-aware worker tests pass. The identity-response provenance test fails as detailed below. These tests are separate additions; no original probes were changed.

## CV-1–CV-6 current behavior

| Finding | Verified outcome | Acceptance/risk links |
| --- | --- | --- |
| CV-1 | Both original assertions PASS: explicit E2E flags without runtime fail before default-runtime initialization; corrected browser config overrides inherited private data/key paths. All five isolation probes pass without competing suites | P3/P9/P11; R13/R23/R25 |
| CV-2 | PASS: contradictory/unavailable existence returns 503, ciphertext remains and document row remains 1; genuinely missing-file retry still reaches scoped logical 204 after initial failure/restart | P6/P7; FR-04; NFR-05/13/14; R18/R19/R25 |
| CV-3 | Original changed/null-identity scenario PASS: `/me` rechecked, account B list not rendered under A, session ended. **FAIL for the separate delayed-response return-to-A transition below** | P2/P9/P10; FR-02/05; NFR-02/15; R05/R11/R20 |
| CV-4 | PASS: unexpected validator failure after logout gives 401, no stale Set-Cookie, zero published rows | P1/P9/P11; FR-01/02/05; R05/R11 |
| CV-5 | PASS: definite upload rejection is not displayed under a newly selected case | P9/P10; NFR-13/15; R20/R25 |
| CV-6 | PASS: validation settles after worker exit acknowledgement on success and timeout; slot-release lifecycle assertion now passes | P3/P9; FR-06; NFR-03/13/19; R13/R25 |

The narrower test-mode guard does not constitute an OS sandbox or proof against deliberately supplied arbitrary runtime paths. This retest used only disposable paths and did not deliberately select owner storage.

## Worker assertion adjudication

The failed original assertion is `e1-s2-corrective-worker.test.ts:26`: it expects `record.worker.resourceLimits?.maxOldGenerationSizeMb === 64` **after** `await validatePdfInWorker(...)`. The corrected validator deliberately waits for `worker.terminate()` before returning. Node exposes an empty native limits object after a worker has stopped; the observed property is therefore undefined at that point.

My original probe sampled the native property at a lifecycle stage that no longer matches the corrected contract. Its failure is preserved, but it should not drive the Builder to return early or retain a worker just to satisfy it.

The builder report correctly identifies the timing conflict. Its statement that the same original test already observes actual limits before exit is imprecise: it checks the requested `options.resourceLimits`, while its native observation occurs after return. The new `e1-s2-cv-retest-worker.test.ts` separately captures the actual native limits immediately after constructing a real worker, then verifies:

- live old/young/code limits: 64/16/16 MiB;
- actual parsing of a small legitimate PDF returns one page;
- exit acknowledged and thread ID -1 before the result;
- native limits object empty after exit;
- controlled timeout also rejects only after real exit.

Both controls pass, with `liveOldHeapMiB:64`, `exitedBeforeResult:true`, `postExitLimitsEmpty:true`. This resolves the acceptance question without editing the old assertion. Native engine limits are not a total RSS/ArrayBuffer/malware guarantee. See [Node Worker resource limits](https://nodejs.org/api/worker_threads.html#workerresourcelimits).

## CV-3-R1 — remaining delayed-response identity mismatch

**P2, reproduced at the UI client/component boundary.** Source: `apps/web/src/cases/CasesPage.tsx:165-176`. Independent case: `tests/independent/e1-s2-cv-retest-identity.test.tsx:10`.

Scenario:

1. The page displays account A. An upload has an ambiguous outcome.
2. An intermediate account B session supplies the refreshed case-list response, which is delayed.
3. The session has returned to A by the later `/me` check.
4. `/me` matches the old displayed A identity, so `showServerState` renders the previously fetched B case list under A.

Actual control output: `identityChecks:2`, `delayedOtherAccountCaseShown:true`, `originalIdentityShown:true`. The original A-to-B test now passes; comparing only the later identity does not bind the earlier response to that identity. The current client response has no checked identity/session provenance at this render boundary.

Expected under P9/P10 and FR-02/05: delayed private state from another identity must not be rendered as A's data. Bind private responses and their initiating identity/session context through reconciliation; discard mismatched or stale responses. Do not restore the old unconditional rendering or treat an additional later `/me` call alone as proof of response provenance.

Scope/limits: the new test controls client responses to model an intermediate-session delayed response. It is **not** a real-browser account-switch exploit reproduction or a demonstrated server authorization bypass. Direct API cross-owner tests still pass. It is a concrete remaining UI consistency/privacy-boundary failure, not evidence that the server returns B's data to an unauthenticated A request. DeepSeek should reproduce and correct this residual before approval, and extend the test with controlled browser/session evidence if its reachability is disputed. A documented owner/reviewer decision is required for any proposed limitation; this report grants no waiver.

## Preserved regressions and browser artifact gate

Preserved authentication/foundation/SDK/Mira/private probes and browser cookie-race results are recorded individually in the accompanying check output. Counts remain separate; they are not added to maintained/API totals.

| Exact command | Exit | Result |
| --- | --- | --- |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed; initial single CSRF response, registration 201 |

`node tests/independent/download-control.mjs` again returns **exit 1**, `CONTROL_DOWNLOAD_ERROR EPERM`, using a fresh browser, fictional text and no application server. The previously independently tested two application artifact-byte cases and the builder's newer report remain recorded as blocked. The unchanged two application artifact-byte cases were **not rerun in this cycle after the no-app control reproduced the access failure**. No claim of newly verified downloaded-file bytes is made.

The maintained browser test's event/filename plus API-byte checks are distinct from actual artifact-byte verification. Retain **BLOCKED** until a supported environment can run the preserved spec or the owner records an actual fictional original/download hash comparison with browser/version. No permission change or access bypass was attempted and no waiver is granted.

## TDD, documentation and pending decisions

The raw builder log `.setup/corrective-cv-red-baseline.log` records 10 failures/18 passes, including seven application assertions and three fixture-setup failures. Its contents are consistent with the independently observed pre-correction CV failures at 03b1bb8 in the preceding Codex report. The current seven corresponding assertions pass. The exact per-edit execution order inside the Builder session was not independently witnessed; do not convert the three fixture errors into application RED evidence.

The new CV-3-R1 failure is current independent regression evidence before any proposed subsequent fix. Earlier admitted route/UI/E2E TDD gaps remain documented and require explicit owner disposition. This cycle does not retrospectively repair them.

Updated docs appropriately distinguish file fsync from absent key-directory fsync, initialization readiness from continuous storage-health checks, best-effort quotas from serializable guarantees, and identity markers from local-adversary authentication. These are limitations/proposals, not newly approved architecture. The CV-3 claims still need qualification because of the delayed-response failure.

Pending: permanent concurrency value 2; declared Node >=22.2.0 (only Node 26.13.0/Windows executed); historical TDD exception; exact-boundary PDF residual; browser artifact disposition; readiness/quota policy; legacy identity migration. No owner runtime adoption, backup, restore or migration was performed. No E1-S3, hosted or real-user readiness is established.

## Acceptance update

P1/P2/P4/P6/P7/P8 retain the tested local protections, with the original CV-2/CV-4 corrections now passing. P3/CV-6's specific lifecycle control passes with stage-aware evidence. **P9/P10 remain FAIL** for CV-3-R1; P5 browser artifact bytes remain **BLOCKED**. P11 remains unsatisfied pending the residual fix, independent review, evidence/test-maintenance decisions and owner gates. No exhaustive security, recovery or legal-accuracy claim is supported.

## Final preservation and Git state

Final metadata comparison: **zero differences**, still **10 owner-runtime files / 4,377,586 bytes**, with the same recorded creation/write timestamps. Source-manifest drift: **zero**. Original evidence/test hash changes: **zero**. These preservation comparisons are recorded alongside the selected check output and in `.setup/codex-cv-retest-owner-before.json` / `...after.json`. They do not prove absence of historical loss.

HEAD/main and the 17 builder-modified files remain unchanged by Codex. The original 28-test and 11-test files, prior reports and owner `.vscode/` are preserved. New Codex additions are this report, its check output, the working-tree hash manifest, and three separate retest test/config files. They remain uncommitted.

Full local logs are under `.setup/codex-cv-retest-20261125/ProjectSecondChance/.setup/`, including both initial failures and uncontended/serial reruns with persistent exit files. No app implementation, Git trust, permissions, global runtime, commit, push, merge or deployment was changed. Test-owned servers/processes were confined to disposable fixtures.

## Recommended handoff

Return **CV-3-R1 only** as the remaining confirmed implementation issue in this retest, preserving the seven original passing CV assertions and the corrected worker exit behavior. DeepSeek implements the bounded response-identity correction using prospective RED/GREEN/refactor evidence, then Codex retests. Do not request an approval-only Claude review while this failure remains. After correction, use a genuinely fresh Claude session for independent review of the full uncommitted diff and evidence; owner decides proposals/exceptions and any commit/merge. E1-S2 remains incomplete.
