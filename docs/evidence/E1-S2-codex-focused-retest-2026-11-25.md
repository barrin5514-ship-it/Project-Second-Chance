# E1-S2 focused corrective cycle — independent Codex retest

Date: November 25, 2026. **Changes still required.** The reviewer’s UI and late-response corrections pass the executed controls, and the new maintained tests detect eight specific reverted protections. A residual CR-5 directory-availability failure remains. The GitHub exposure report also contains a contradicted claim.

No E1-S2 approval, waiver, commit, push, PR, merge, deployment, migration or E1-S3 work occurred.

## Exact tree and isolation

HEAD: `03b1bb8aee712db73d4c690be850030e050e6361`; branch: `feature/e1-s2-private-documents`; local main: `e2edea5a11ba250b881449acaa951844e38abba0`.

The tested identity is HEAD plus **25 modified tracked files and two untracked maintained test files**, recorded in `E1-S2-focused-source-manifest-2026-11-25.json`. Manifest SHA-256: `0F6F58C7C67EC2D5141C47694BFF9DBB4372E18C29089CE18C78FD277FFD1D0D`. HEAD alone does not identify this implementation.

Node `v26.13.0`, npm `11.20.0`, Windows PowerShell. Tests ran from `.setup/codex-focused-20261125/ProjectSecondChance`, built from `git archive HEAD` plus the manifest-listed working files, including new `isolation.test.ts` and `workerLifecycle.test.ts`. Installed dependencies were reused through a junction; this was not a fresh install. Independent tests, preserved probes and a historical source-only legacy fixture were copied explicitly. Owner `.env`, runtime, databases, ciphertext and keys were not copied or opened.

Fixtures used the dedicated workspace directory `.codex-temp-focused-20261125`, outside Git. Inherited runtime/data/key overrides were cleared. Playwright supplies all three isolated storage paths, fictional accounts, fake media and absent provider credentials. Heavy suites ran serially. Mutation checks changed only disposable-copy source files and restored their exact original contents.

## CR-5-R1 — reconciliation still treats an unavailable directory as a missing file

**Confirmed residual of CR-5; blocks corrective acceptance.** `apps/server/src/private/privateStore.ts:838` interprets a blob-path `lstat` ENOENT as individual-file absence and persists `status='error'` without verifying the containing root/shard directory. The new constructor root check and deletion parent check do not cover this reconciliation boundary.

Independent sequence, using fictional storage only:

1. Create a case/document and record the synthetic ciphertext hash.
2. Move either the blob root or its two-character shard directory away temporarily.
3. Run reconciliation. In the shard variant, first construct a new store while the shard is absent, reproducing startup’s constructor-plus-reconciliation sequence.
4. Restore the directory unchanged, construct a healthy store and reconcile again.
5. Check row state, ciphertext hash and actual decryption/download access through the store.

| Directory unavailable | Reconciliation threw | Status after restoration/restart | Readable | Ciphertext unchanged |
| --- | --- | --- | --- | --- |
| Blob root | false | error | false | true |
| Blob shard, including new-store startup | false | error | false | true |

Both safety assertions fail. These are behavioral assertion failures, not import, environment or setup errors. The earlier 17-assertion version and final expanded 19-assertion run independently reproduce the same two failures. Initial and final logs are preserved.

Passing controls distinguish this from intentional missing-file handling:

- EIO from an individual file stat throws without marking a ready document missing; normal access returns after the fault clears.
- A blob root already missing at construction fails closed and is not recreated; row state remains ready.
- A genuinely absent individual blob, with its containing directory present, still reconciles to error and permits verified terminal logical deletion.

The complete focused suite is **17 passed / 2 failed across 19 assertions**: 14 UI controls pass, three storage controls pass, two directory-loss regressions fail.

Reachability is supported by source inspection: `privateConfig.ts:85` runs reconciliation at initialization, and `main.ts:74` runs it during shutdown. The shard variant executes the startup store sequence; the root variant executes a post-initialization reconciliation fault. No actual mounted-disk fault, HTTP-level recovery claim or owner-data experiment was performed.

This demonstrates persistent loss of application access after restoration, **not destroyed ciphertext**. Return this bounded residual to DeepSeek: verify containing-directory availability before treating ENOENT as individual-file loss, fail closed without persisting a missing-document state when directories are unavailable, and preserve the genuine single-missing-file and deletion controls. Do not silently adopt a new directory or perform owner migration/recovery.

## Reviewer corrections independently exercised

The independent UI file adapts the preserved Claude probe source into separate Codex verification tests. The original Claude report, companion and assertions were not edited. CR-4’s two earlier characterization waits were replaced with explicit assertions for the newly implemented sign-out policy; fixed sleeps were removed. Confirmed-write checks also assert one mutation call and removal/closure of the confirmed deleted resource.

- **CR-1:** 401/403/404 reconcile identity in both same-case and switched-case variants: six passing controls. Existing CV-5 message suppression remains covered separately.
- **CR-3:** edit, case deletion and document deletion remain accurately reported as confirmed when refresh gives 503 or timeout; six passing combinations, no mutation replay. Deleted cases close; deleted documents disappear locally.
- **CR-4:** successful upload/document-delete refreshes with B provenance and B identity end the A session; two passing policy controls. This verifies implemented behavior, not owner approval of the policy.
- **CR-5:** transient exists/stat and startup/deletion fixes have passing maintained coverage, but CR-5-R1 above remains.
- **CR-6:** an adapted real-server probe uses actual 30-second timers and four late multipart-body variants: invalid file, no file, logout then invalid file, and second file part. Exactly one response per request (408/408/401/408), no socket errors, health 200, zero second-header/Multer stack errors and zero stack frames. The maintained suite separately covers late validation failures and subsequent upload behavior. No broader logging or publication guarantee is inferred from these four cases.

The real-server probe was adapted from Claude’s preserved source, with a dynamically selected port, hidden child window, result assertions and awaited child exit. Its fixture was fictional and separate from owner runtime.

## CR-2 — maintained protection mutation checks

The pristine maintained suite passes **374/374**, including the new maintained files. Eight controlled source reversions each cause a selected maintained behavioral test to fail. They are post-implementation regression-protection evidence, not historical TDD RED.

| Reverted protection | Maintained test selection | Effective mutation result |
| --- | --- | --- |
| E2E runtime guard | `authConfig.test.ts -t E2E` | exit 1; assertion failure |
| Stat-consistent deletion | `privateStore.test.ts -t "false exists"` | exit 1; assertion failure |
| Authoritative identity comparison | `CasesPage.test.tsx -t "ambiguous upload identity change"` | exit 1; assertion failure |
| Initial/success response provenance | `CasesPage.test.tsx -t "different account\|initial loading"` | exit 1; assertion failure |
| Both identity groups | `CasesPage.test.tsx -t "initial loading\|ambiguous upload identity change"` | exit 1; assertion failure |
| Unexpected-validation authorization recheck | `privateHardening.test.ts -t "unexpected validation exception"` | exit 1; assertion failure |
| Switched-case selection/identity split | `CasesPage.test.tsx -t "reconciles identity"` | exit 1; assertion failure |
| Worker exit acknowledgement | `workerLifecycle.test.ts -t "does not settle"` | exit 1; assertion failure |

Harness correction preserved transparently: the initial CV-4 mutation matched the earlier no-file authorization branch instead of the unexpected-validation branch; it survived, so the first driver exited 1 with seven detected changes and one mistargeted control. After anchoring at the unexpected-validation comment, that single intended mutation produces the expected assertion failure and the corrected driver exits 0. The initial outputs remain intact. This is a corrected mutation harness, not an application fix or an erased passing result.

Every mutated file was restored after its test, and both drivers verify exact source restoration. The original application tree was never mutated. These were targeted maintained-test runs, not eight full `npm test` runs. Driver source and mutation logs remain under ignored `.setup/` for reproduction.

An additional ninth mutation removes only stale-case message suppression while retaining identity handling. The maintained unchanged-identity control detects it with an assertion failure; its driver exits 0 and restores the source. This separately confirms protection of CV-5’s message behavior as well as CR-1’s identity behavior.

## GitHub/public-exposure verification

The connected GitHub API independently confirms the repository is **public**, not a fork, with default branch `main` and no recognized license. Branch heads match the local objects used for inspection: main `e2edea5a11ba250b881449acaa951844e38abba0`; published feature `744f00a11f85d37dd5fcf98b80928c843c776e75`. Local HEAD is three commits ahead of the published feature. No network mutation or publication was performed. [Repository](https://github.com/barrin5514-ship-it/Project-Second-Chance).

Commit-count clarification: main has 26 reachable commits; the published feature has **29**, confirmed by the GitHub commit-list response and local graph. Local HEAD has 32. “Remote 26 commits” describes main, not the feature branch.

**Exposure report correction required:** the claim that published refs contain no absolute owner paths is false. Both published refs contain matches in the same six tracked files:

- `START_HERE.md`
- `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`
- `docs/evidence/E0-S1-builder.md`
- `docs/evidence/E0-S2-builder.md`
- `docs/evidence/V0-S1-builder.md`
- `docs/product/Project_Second_Chance_PRD.md`

Inspection used local objects matching the API-confirmed published SHAs, and a direct remote fetch of [published START_HERE.md](https://github.com/barrin5514-ship-it/Project-Second-Chance/blob/e2edea5a11ba250b881449acaa951844e38abba0/START_HERE.md) independently confirms the path text. No literal private-directory value is repeated here.

A scoped path inventory of these published trees and their reachable local history found no tracked `.env` other than the example, runtime/key/upload/database/ciphertext/dependency/browser-artifact paths matching the checked patterns. This is **not a full secret-content/history audit** and does not certify absence of credentials or PII. Current tracked-source secret scanning is recorded separately. Twelve local E1-S2 evidence files also contain owner paths; previous evidence remains unchanged. Publication needs explicit selection/redaction decisions, including already-published paths. No history rewriting, repository-visibility change or automatic sanitization of historical evidence was attempted.

The working ignore rules cover `.vscode/`, `.idea/` and `*.tsbuildinfo`; no root license file is tracked. License choice remains an owner decision. No legal conclusion about reuse rights or third-party license compliance is independently certified here.

## Full gates and preserved failures

Counts overlap; API and selected independent results must not be added to maintained totals.

| Exact command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 374 passed / 34 files |
| `npm run test:api` | 0 | 225 passed / 20 files |
| `npm run test:e2e` | 0 | 56 passed, both viewports |
| `npm run typecheck` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run verify:secrets` | 0 | No credential patterns found in tracked working source; original repository |
| `npm run test:secrets` | 0 | 7 passed, isolated fixtures |
| `npm audit --omit=dev` | 0 | 0 production dependency vulnerabilities reported |
| `git diff --check` | 0 | PASS |
| `npx vitest run --config tests/independent/focused.vitest.config.ts --fileParallelism=false` | 1 | Final: 17 passed / 2 failed; CR-5-R1 |
| `npx vitest run --config tests/independent/provenance.vitest.config.ts --fileParallelism=false` | 0 | 16 passed |
| `npx vitest run --config tests/independent/r2-lifecycle.vitest.config.ts` | 0 | 4 passed |
| `npx vitest run --config tests/independent/cv-retest.vitest.config.ts --fileParallelism=false` | 0 | 3 passed |
| Targeted seven original CV assertions, command below | 0 | 7 passed / 21 skipped |
| `npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false` | 1 | 27 passed / 1 preserved failure |
| `npx vitest run --config tests/independent/vitest.config.ts` | 1 | 9 passed / 2 preserved failures |
| `npx vitest run --config .setup/vitest.codex-private.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | 0 | 8 passed |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | 0 | 6 passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | 0 | 3 passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | 0 | 2 Mira probes passed |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | 0 | 1 passed |
| `node tests/independent/download-control.mjs` | 1 | `CONTROL_DOWNLOAD_ERROR EPERM` |
| `node .setup/late408.mjs` | 0 | Four real-timer late-body variants; single responses, health 200, no stack frames |

```text
npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false --testNamePattern 'browser configuration must neutralize|explicit E2E mode|stat is unavailable|ambiguous response after account|unexpected validation failure|rejected upload message|validation must not settle'
```

The production-dependency audit used process-local `NODE_USE_SYSTEM_CA=1`; TLS verification remained enabled. The scan is not a full dependency/security certification. Secret scanning covers tracked source, not all history or untracked evidence.

The supplementary native `worker.resourceLimits` assertion still reads the property after exit; stage-aware worker tests independently pass. The original suite’s old immediate-disconnect and PDF-tail assertions still fail. They remain failed tests pending explicit maintenance/reviewer/owner disposition, not waived passes. No old test was weakened or erased.

The no-app browser download control again returns EPERM. The preserved two application artifact-byte assertions were not rerun after the environment control reproduced that error. The gate remains **BLOCKED**; maintained browser download events and API bytes are distinct evidence. Historical 54/2 navigation failures and the focused 2/2 pass remain preserved despite this cycle’s 56/56 result.

## Preservation, acceptance and next handoff

After all test and mutation processes, metadata-only owner-runtime comparison found **zero differences** across **10 files / 4,377,586 bytes**, including creation/write timestamps. Contents were not read or hashed. This does not independently recompute the owner’s content-hash claim.

All **27 manifest file hashes** match in both the original tree and restored snapshot. All **43 pre-existing independent-test/evidence files** in the preservation baseline retain their hashes. No listeners remain on test ports 3001/5173. HEAD, branch and main remain unchanged. Owner editor settings were preserved.

New repository additions are separate focused UI/store tests and a config, this report, its output companion and the source manifest. Ignored local drivers/metadata/logs provide reproduction support. Application files, existing independent tests, prior reports and Git state were not changed by Codex. No commit, push, PR, merge, deployment, migration or E1-S3 work occurred.

CR-1/CR-3/CR-4/CR-6 and the specific CR-2 maintained protections have supporting current evidence. CR-5 remains incomplete because of CR-5-R1, affecting P7/P8 and R19/R25. Return that residual and the GitHub report correction to DeepSeek, preserving all passing controls. This is not a request to rebuild the feature or replay completed corrections.

Owner/reviewer decisions remain pending on browser artifact bytes, historical assertion conflicts/TDD exceptions, concurrency value, minimum Node support, PDF boundaries, key-directory durability, readiness/quota policy, legacy migration, license choice and publication/merge. No real multi-tab browser account switch was executed. Claude’s report also records an outstanding independence limitation around prior author/reviewer overlap for `caee540`; this Codex testing session does not close the separate commit-level review gap.

After the bounded correction, repeat independent verification and obtain actual fresh Claude review. No owner approval, E1-S2 completion, real-record/production/hosted readiness, recovery durability or legal-accuracy guarantee is established.

## Artifacts

- `tests/independent/e1-s2-focused-ui.test.tsx`, `e1-s2-focused-store.test.ts` and `focused.vitest.config.ts`.
- `docs/evidence/E1-S2-focused-source-manifest-2026-11-25.json`.
- `docs/evidence/E1-S2-codex-focused-retest-2026-11-25-checks.txt`, with local user-directory text redacted in this new companion only.
- Full original logs and exit files: `.setup/codex-focused-20261125/ProjectSecondChance/.setup/`.
- Mutation driver: `.setup/codex-focused-mutations.mjs`; real-server driver is in the isolated checkout’s `.setup/late408.mjs`.
- Metadata/preservation: `.setup/codex-focused-20261125-owner-before.json`, `-owner-after.json`, `-preserved-before.json`, `-preservation.json`.
- GitHub checks: `.setup/codex-focused-github-local.json` and `-remote.json`.

Prior evidence was intentionally not sanitized or overwritten. The new companion’s path redaction does not make the earlier evidence or repository history publication-ready.
