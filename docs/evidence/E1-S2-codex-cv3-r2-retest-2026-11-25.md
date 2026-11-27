# E1-S2 CV-3-R2 independent corrective retest — November 25, 2026

## Finding

**The five CV-3-R2 regressions now pass.** The unchanged provenance suite passes 16/16, including create, edit, upload, document deletion and case deletion. Four new independent lifecycle checks also pass. No new application failure was found within these controlled identity/reconciliation boundaries.

This is a bounded correction verification, **not E1-S2 completion or merge approval**. Preserved conflicting assertions, the browser artifact-byte gate, fresh actual Claude review and owner policy decisions remain separate gates.

## Tested tree and isolation

- Branch: `feature/e1-s2-private-documents`.
- HEAD: `03b1bb8aee712db73d4c690be850030e050e6361`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`.
- Source identity: HEAD plus **21 uncommitted tracked files**, enumerated with SHA-256 hashes in `E1-S2-cv3-r2-source-manifest-2026-11-25.json`.
- Manifest SHA-256: `481079317C5D1811FDF116FE44055D38CF1D430EFCD7D70ADEDBEB5E9AEA3988`.
- Runtime: Node `v26.13.0`, npm `11.20.0`, Windows PowerShell; the declared Node minimum was not executed.

The isolated checkout `.setup/codex-cv3-r2-20261125/ProjectSecondChance` was built from `git archive HEAD` plus the exact working files. Existing dependencies were reused through a junction; this was not a fresh installation. Independent tests, preserved probes and a historical source-only legacy fixture were copied explicitly. Owner `.env`, private databases, ciphertext and keys were not copied or opened. Temporary fixtures used the separate workspace directory `.codex-temp-cv3-r2-20261125`, outside Git.

Inherited runtime/data/key overrides were cleared. Playwright explicitly sets isolated runtime, data and key directories, fictional accounts, fake media and absent provider credentials. Heavy suites ran serially. No test deadline, assertion or application behavior was changed by Codex. No failing suite was retried to replace its result.

## Correction and independent controls

`CasesPage` now routes successful list refreshes through `listVerifiedCases(expectedAccountId)`. `reloadSelected` checks the response owner and request generation before publishing the case list or documents. The separate case-delete success path uses the same provenance boundary. Unverified refreshes do not claim the refreshed view is confirmed and do not replay the mutation.

The executed 16-test provenance suite verifies:

- Real fictional API sessions receive their own authenticated response owner and scoped cases; query input cannot choose the owner, anonymous access is denied, and responses disable caching.
- The production client preserves provenance and rejects missing/null/numeric owner fields.
- Initial loading suppresses mismatched provenance.
- Ambiguous upload reconciliation handles matching, mismatching and absent provenance, and a later changed identity.
- All five successful mutation paths suppress the intermediate account B case list under displayed account A. Each logs `displayedA:true, displayedBCase:false`; the ordinary same-account upload refresh also passes.

The previous Codex report and raw output independently observed **11 passed / 5 failed** on the earlier tree, before this correction. Those files and assertions remain unchanged. The current **16/16** result is therefore supported by preserved independent before/after evidence. The exact order of edits inside the builder session was not independently witnessed.

Four **new post-implementation verification tests** in `e1-s2-r2-lifecycle.test.tsx` cover:

1. Successful upload with the optional provenance method absent: known cases/documents remain, an uncertainty message appears, no success message appears, and the mutation is called once.
2. Successful upload with mismatched provenance: the same retention/no-replay behavior, without fetching replacement documents.
3. Obsolete request generation after a delayed list response: the new page generation remains visible, and the stale request never fetches replacement documents.
4. Obsolete request generation after delayed document resolution: the old result cannot publish its stale case list.

These four tests are verification additions, not claimed prospective TDD. Original Codex tests were not edited. Builder changes to the maintained component-test factory supply fictional provenance; the independent API/client/UI checks provide separate coverage of actual response ownership.

Known UI nuances: creation intentionally changes selection, and successful case deletion clears it; retaining a verified case list is not a promise that every old selection or document panel remains visible. Clients lacking the optional method retain the separately documented initial-load/delete-error fallback limitations. The production client provides the method. A real multi-tab cookie/account-switch reproduction was not performed; controlled client/component evidence is not a demonstrated server authorization bypass.

## Maintained and corrective results

Counts overlap where commands select the same tests; they must not be added together.

| Exact command | Exit | Observed result |
| --- | --- | --- |
| `npm test` | 0 | 348 passed / 32 files |
| `npm run test:api` | 0 | 213 passed / 18 files |
| `npm run test:e2e` | 0 | 56 passed in both viewports |
| `npm run typecheck` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run verify:secrets` | 0 | No credential patterns in tracked source; original repository |
| `npm run test:secrets` | 0 | 7 passed; isolated fixtures |
| `npm audit --omit=dev` | 0 | 0 production dependency vulnerabilities reported |
| `git diff --check` | 0 | PASS |
| `npx vitest run --config tests/independent/provenance.vitest.config.ts --fileParallelism=false` | 0 | 16 passed |
| `npx vitest run --config tests/independent/r2-lifecycle.vitest.config.ts` | 0 | 4 passed |
| `npx vitest run --config tests/independent/cv-retest.vitest.config.ts --fileParallelism=false` | 0 | 3 passed |
| Targeted seven original CV assertions, exact command below | 0 | 7 passed / 21 skipped |
| `npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false` | 1 | 27 passed / 1 preserved failure |
| `npx vitest run --config tests/independent/vitest.config.ts` | 1 | 9 passed / 2 preserved failures |

```text
npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false --testNamePattern 'browser configuration must neutralize|explicit E2E mode|stat is unavailable|ambiguous response after account|unexpected validation failure|rejected upload message|validation must not settle'
```

The supplementary failure reads native `worker.resourceLimits` after exit, when the property is empty. Separate stage-aware tests confirm live native limits and result settlement after exit. The original suite retains its old immediate-disconnect-release expectation and prior PDF-tail acceptance characterization. These are still failed tests, not silently waived passes; reviewer/owner disposition and a transparent test-maintenance decision remain required. No application behavior was weakened to satisfy them.

The production-dependency audit used process-local `NODE_USE_SYSTEM_CA=1` for trusted certificates; TLS verification was not disabled. Secret scanning covers tracked working source, not every untracked artifact or a running system.

Earlier browser navigation results of 54/2 and the focused 2/2 pass remain recorded. Current 56/56 success does not erase that reproducibility history.

## Preserved probes and artifact-byte gate

| Exact command | Exit | Result |
| --- | --- | --- |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed; registration 201 |
| `node tests/independent/download-control.mjs` | 1 | `CONTROL_DOWNLOAD_ERROR EPERM` |

The no-app download control again reproduces EPERM. The two preserved application artifact-byte assertions were not rerun after that environment control failed. Their gate remains **BLOCKED**, without a waiver. Maintained browser download-event checks and API-byte checks do not establish that the saved browser artifact can be read and matches the original. A supported-environment execution or an explicitly recorded owner/reviewer disposition is still required; no permission bypass was attempted.

## Preservation and acceptance limits

Final metadata-only comparison after all test processes: **zero differences**, **10 owner-runtime files / 4,377,586 bytes**, including recorded creation/write timestamps. Owner runtime contents, keys, records and `.env` values were not opened. This is metadata evidence; the owner's content-hash claim was not independently recomputed by reading protected files.

All 21 tracked builder-file hashes remain unchanged. All **35 pre-existing independent-test/evidence files** in the preservation baseline retain their hashes. HEAD, branch and local main remain unchanged, and no listeners remain on test ports 3001/5173. Owner `.vscode` work was preserved.

Codex added only two separate lifecycle test/config files, this report, its output companion and the source manifest. Application code and maintained builder tests were not edited. No commit, push, merge, deployment, migration or E1-S3 work occurred; all changes remain uncommitted.

CV-3-R1/R2 are supported within the executed boundaries. This advances the P9/P10 identity-reconciliation evidence linked to FR-01/02/05, NFR-02/15 and R05/R11/R20. It does not close all P1–P11 criteria: browser artifact bytes remain blocked, failed historical assertions require transparent disposition, and actual fresh Claude review has not occurred in this Codex session.

Owner/reviewer decisions remain pending on concurrency value 2, the declared Node minimum, historical TDD exceptions, residual PDF boundaries, key-directory durability, readiness/quota policy, legacy identity migration and browser artifacts. File fsync is not key-directory fsync or proof of full power-loss durability. Quotas remain local best-effort controls. No recovery or owner migration was executed. No production, real-record, hosted, legal-accuracy or E1-S3 readiness is established.

**Next handoff:** actual fresh Claude review of the full uncommitted diff and the independent evidence, with explicit recommendations for the remaining failed/blocked gates and owner decisions. Do not initiate another application-fix cycle solely to satisfy the obsolete post-exit worker assertion; preserve it and the passing stage-aware controls for reviewer disposition. Any new reproducible implementation issue should return to DeepSeek with a bounded regression. No approval or waiver is granted here.

## Reproduction artifacts

- New independent additions: `tests/independent/e1-s2-r2-lifecycle.test.tsx` and `tests/independent/r2-lifecycle.vitest.config.ts`.
- Source hashes: `docs/evidence/E1-S2-cv3-r2-source-manifest-2026-11-25.json`.
- Companion outputs: `docs/evidence/E1-S2-codex-cv3-r2-retest-2026-11-25-checks.txt`.
- Full logs with individual exit files: `.setup/codex-cv3-r2-20261125/ProjectSecondChance/.setup/`.
- Preservation records: `.setup/codex-cv3-r2-20261125-owner-before.json`, `-owner-after.json`, `-preserved-before.json` and `-preservation.json`.
- Previous provenance report and checks remain unchanged, preserving the independent prospective failure and preceding tree identity.
