# E1-S2 independent response-provenance retest — November 25, 2026

## Decision

**Not ready for approval.** The reported CV-3-R1 correction passes at the initial-load and ambiguous-upload boundaries. A related **CV-3-R2** gap remains: successful mutations refresh the case list without checking response provenance. Five independently executed component assertions show a fictional account B case while account A's identity remains displayed.

This is controlled UI evidence, not a real multi-tab exploit reproduction or a demonstrated server authorization bypass. The new direct API test confirms account-scoped results and authenticated provenance. No application fix, commit, push, merge, deployment, migration or E1-S3 work was performed.

## Exact tree and isolation

- Branch: `feature/e1-s2-private-documents`.
- HEAD: `03b1bb8aee712db73d4c690be850030e050e6361`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`.
- Tested identity is HEAD **plus 20 uncommitted tracked-file contents**, recorded in `E1-S2-cv3-provenance-source-manifest-2026-11-25.json`; SHA-256 of that manifest: `4D23FA093F2601F46401B02059C859DD96C84DE37310D7935D80885F28E082E6`.
- Node `v26.13.0`, npm `11.20.0`, Windows PowerShell. This does not verify the declared minimum Node version.

Tests ran from `.setup/codex-cv3-provenance-20261125/ProjectSecondChance`, constructed with `git archive HEAD` and the manifest-listed working files. No owner `.env` or runtime was copied. Installed dependencies were reused through a junction; this was not a fresh dependency installation. Independent tests and preserved probes were copied explicitly, including the historical source-only legacy fixture. Temporary fixtures lived outside Git at the workspace's `.codex-temp-cv3-provenance-20261125` directory.

Inherited runtime/data/key overrides were cleared before execution. Playwright explicitly supplies all three isolated storage paths, disables provider credentials and uses fictional accounts and fake media. Heavy test suites ran serially. There were no contention reruns or altered application deadlines in this cycle.

## Response-provenance checks

`npx vitest run --config tests/independent/provenance.vitest.config.ts --fileParallelism=false` exits **1: 11 passed / 5 failed**, across 16 assertions in three files. The final run is `provenance-confirmed.log`; initial and intermediate outputs are retained separately.

Passing controls:

1. Two real fictional API sessions receive their own authenticated `accountId` and only their own cases. A query-string account override cannot select the response owner; anonymous access returns 401 without provenance. Case responses use `Cache-Control: no-store`.
2. The production client preserves provenance, sends same-origin credentials, disables caching and rejects missing, null or numeric provenance.
3. Initial loading rejects account B provenance when `/me` identifies account A.
4. Ambiguous upload reconciliation accepts a matching A response, suppresses a B response, and retains known cases when provenance is unavailable. It does not replay the upload.
5. Matching response provenance cannot override a later `/me` identity change.
6. A successful upload with an ordinary same-account refresh shows the refreshed A list.

### CV-3-R2 — successful mutation refreshes bypass provenance

**Priority: high; blocks corrective acceptance.** In `apps/web/src/cases/CasesPage.tsx`, `reloadSelected` (line 168) still calls `client.listCases()` and publishes its result with `setCases(nextCases)` without checking the response owner. Create, edit, upload and document-delete success handlers share this helper. The case-delete success handler independently calls `setCases(await client.listCases())` at line 297.

Each failing test first displays A's own case. The client then models a refresh response produced while session B was active, with A still displayed and `/me` available as A. The test supplies B provenance through the new method as well, but these success paths ignore that method. After the successful mutation, B's case appears under A's email:

| Successful mutation | `displayedA` | `displayedBCase` | Safety assertion |
| --- | --- | --- | --- |
| Create case | true | true | FAIL |
| Edit case | true | true | FAIL |
| Upload document | true | true | FAIL |
| Delete document | true | true | FAIL |
| Delete case | true | true | FAIL |

The same-account upload control logs `displayedA:true, displayedBCase:false` and passes. The failures are assertion failures on rendered content, not fixture, import or compilation errors. They were independently observed before any subsequent builder fix, and the failing tests remain intact.

The synthetic client schedules the intermediate-session response; it does not perform a real browser cookie switch. It establishes the missing client boundary and its observable UI consequence. Shared-helper reachability follows directly from the executed success handlers; no broader server-access claim is made.

Required correction: consistently enforce response identity before publishing every refreshed case list, including successful mutation paths. Handle changed identity and unavailable provenance safely, preserve request/selection cancellation, and avoid replaying mutations. Review all `setCases` sites so the fix does not cover only the upload example. Keep the passing ambiguous-upload and worker lifecycle controls.

## Maintained and preserved gates

Counts below overlap where commands select the same tests; do not add them together.

| Exact command | Exit | Observed result |
| --- | --- | --- |
| `npm test` | 0 | 348 passed / 32 files |
| `npm run test:api` | 0 | 213 passed / 18 files |
| `npm run test:e2e` | 0 | 56 passed, both viewports |
| `npm run typecheck` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run verify:secrets` | 0 | No credential patterns found in tracked source; executed in original repository |
| `npm run test:secrets` | 0 | 7 passed, isolated fixtures |
| `npm audit --omit=dev` | 0 | 0 production dependency vulnerabilities reported |
| `git diff --check` | 0 | PASS |
| `npx vitest run --config tests/independent/cv-retest.vitest.config.ts --fileParallelism=false` | 0 | 3 passed |
| Targeted seven original CV assertions, command below | 0 | 7 passed / 21 skipped |
| `npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false` | 1 | 27 passed / 1 preserved post-exit native resource-limit assertion failed |
| `npx vitest run --config tests/independent/vitest.config.ts` | 1 | 9 passed / 2 preserved old disconnect/PDF-boundary assertions failed |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed |
| `node tests/independent/download-control.mjs` | 1 | `CONTROL_DOWNLOAD_ERROR EPERM` |

Targeted CV command:

```text
npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false --testNamePattern 'browser configuration must neutralize|explicit E2E mode|stat is unavailable|ambiguous response after account|unexpected validation failure|rejected upload message|validation must not settle'
```

The preserved post-exit `worker.resourceLimits` assertion remains incompatible with awaiting native worker exit; it was not edited. Separate stage-aware controls verify native limits while the worker lives and result settlement after exit. The earlier 11-test suite's two failures retain their previously documented expectation conflicts; no tests were weakened or erased.

The audit used process-local `NODE_USE_SYSTEM_CA=1` for trusted certificates. No TLS verification was disabled. Secret scanning examines tracked working source, not all untracked evidence or a running system.

## Browser evidence limits

The current maintained browser run passes 56/56. Earlier Codex 54/2 navigation failures and focused 2/2 pass remain historical reproducibility evidence; this result does not erase them. No real multi-tab account switch was executed in this cycle.

The no-app download control again fails EPERM. The preserved two application artifact-byte assertions were not rerun after that independent environment control reproduced the failure. Their gate remains **BLOCKED**, not passed or waived. Browser download-event checks and API-byte checks do not substitute for reading and comparing actual downloaded-file bytes.

## Preservation and outstanding decisions

Metadata-only comparison before and after the test work found **zero differences** across **10 owner-runtime files / 4,377,586 bytes**, including recorded creation/write timestamps. No owner runtime file contents, keys, database records or `.env` values were opened. This is metadata preservation evidence, not an independently recomputed content hash or proof of historical durability.

The 20 tracked builder-file hashes have zero drift. All 28 pre-existing independent-test/evidence files in the preservation baseline retain identical hashes. HEAD, branch and local main remain unchanged. The only additions are separate independent tests/config, this report, its check output and the source manifest; all remain uncommitted. Owner `.vscode` work was preserved.

No decision is granted on concurrency value 2, minimum Node support, historical TDD exceptions, residual PDF boundaries, key-directory durability, readiness/quota policy, legacy identity migration or browser-artifact disposition. File fsync remains distinct from key-directory fsync. Quotas remain local best-effort controls. No recovery procedure or owner migration was executed.

The narrow CV-3-R1 behavior is now independently supported, but CV-3-R2 prevents overall identity-consistency acceptance. Return the bounded correction to DeepSeek, retest afterward, then obtain actual fresh Claude review and owner decisions. No E1-S2 completion or merge approval is claimed.

## Reproduction artifacts

- New tests: `tests/independent/e1-s2-provenance-api.test.ts`, `e1-s2-provenance-client.test.ts`, `e1-s2-provenance-ui.test.tsx`, and `provenance.vitest.config.ts`.
- Companion output: `docs/evidence/E1-S2-codex-cv3-provenance-retest-2026-11-25-checks.txt`.
- Full isolated run outputs and individual exit files: `.setup/codex-cv3-provenance-20261125/ProjectSecondChance/.setup/`.
- Metadata and preservation records: `.setup/codex-cv3-provenance-20261125-owner-before.json`, `-owner-after.json`, `-preservation.json`, and `-preserved-before.json`.
- Earlier reports and all original independent tests remain unchanged and retain the historical limitations and exceptions.
