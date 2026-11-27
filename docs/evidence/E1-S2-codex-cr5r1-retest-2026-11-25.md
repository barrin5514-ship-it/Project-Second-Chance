# E1-S2 CR-5-R1 independent retest — November 25, 2026

## Disposition

**The preserved CR-5-R1 directory-loss failures now pass.** Both root and shard loss fail closed; restored ciphertext remains unchanged and the document remains ready and readable. The unchanged focused suite passes 19/19. The corrected GitHub report matches the currently observed published refs and exposure inventory.

This verifies the bounded correction. It does **not** approve E1-S2, resolve failed/blocked historical gates, authorize publication or substitute for actual fresh Claude review and owner decisions.

## Exact tree and isolation

- HEAD: `03b1bb8aee712db73d4c690be850030e050e6361`.
- Branch: `feature/e1-s2-private-documents`.
- Local main: `e2edea5a11ba250b881449acaa951844e38abba0`.
- Source: HEAD plus **27 working files** (25 modified tracked files and two untracked maintained test files), listed with SHA-256 hashes in `E1-S2-cr5r1-source-manifest-2026-11-25.json`.
- Manifest SHA-256: `2C56DAA57CC0096EFFF1E90DD7E99C3D858418BAD70792909BC7A1B5F46898F4`.
- Runtime: Node `v26.13.0`, npm `11.20.0`, Windows PowerShell. The declared Node minimum was not executed.

Tests ran in `.setup/codex-cr5r1-20261125/ProjectSecondChance`, built with `git archive HEAD` plus the exact manifest files. Existing dependencies were reused through a junction; this is not clean-install evidence. Original independent tests, preserved probes and a historical source-only legacy fixture were explicitly copied. No owner `.env`, runtime, keys, database records or documents were copied or opened.

Dedicated temporary fixtures used `.codex-temp-cr5r1-20261125` outside Git. Inherited runtime/data/key overrides were cleared. Playwright explicitly supplies all three isolated storage paths, fictional accounts, fake media and absent provider credentials. Heavy suites ran serially. Codex made no application or existing-test edit in the original tree.

## CR-5-R1 correction and before/after evidence

Compared with the prior independently tested snapshot, the storage correction adds two directory checks: `lstat/isDirectory` of the blob root before reconciliation work, and of each ready document’s containing shard before interpreting file-level ENOENT. Source comparison shows these are the two new blocks in `privateStore.ts`.

The unchanged independent probes move a fictional root/shard away temporarily, reconcile, restore it, reopen the store and test actual decryption. The shard variant includes constructing a new store while that shard is absent. Current results:

| Variant | Reconciliation threw | Status after restoration/restart | Readable | Ciphertext unchanged |
| --- | --- | --- | --- | --- |
| Blob root unavailable | true | ready | true | true |
| Blob shard unavailable | true | ready | true | true |

The focused suite also passes the individual-file EIO, unavailable-root-at-startup and genuine single-missing-file/terminal-deletion controls. Fourteen UI controls cover the earlier session-reconciliation, confirmed-write reporting and mismatch policy fixes. Total: **19 passed**, with no modified independent assertion.

The preceding Codex report preserves the same root/shard assertions failing on the earlier tree, with intact ciphertext but persistent error state. That independently observed failure predates this correction. Exact builder-session edit ordering was not independently witnessed.

### Maintained regression detection

Codex temporarily substituted the previously tested, pre-CR-5-R1 `privateStore.ts` **only in the isolated checkout**, ran the two new maintained directory-loss tests, restored the exact current bytes in `finally`, then reran those controls:

```text
npx vitest run apps/server/src/private/privateStore.test.ts -t 'temporarily unavailable during reconciliation'
```

- With only the two directory checks reverted: **exit 1, 2 behavioral assertion failures / 16 skipped**.
- After exact source restoration: **exit 0, 2 passed / 16 skipped**.

The driver verifies the expected failure shape and restoration. This is current mutation/regression-protection evidence, not a retroactive claim of builder TDD. The prior cycle’s eight protection mutations and additional message-suppression mutation remain prior evidence; those nine variants were not rerun in this cycle. The prior real-30-second late-body probe was also not rerun; maintained late-response controls remain part of the current full suite.

No new reproducible implementation failure was found within the executed directory-loss, identity and reconciliation boundaries. This is not exhaustive recovery, multi-process filesystem-race or power-loss proof. Existing selection changes during create/delete are intentional and are distinct from retaining verified case data.

## GitHub correction check

Fresh connected GitHub API reads confirm the repository remains public, default branch main, not a fork and with no recognized license. Published main remains `e2edea5a11ba250b881449acaa951844e38abba0`; published feature remains `744f00a11f85d37dd5fcf98b80928c843c776e75`. [Repository](https://github.com/barrin5514-ship-it/Project-Second-Chance).

Local Git objects matching those API-confirmed SHAs show 26 reachable commits on main and 29 on the published feature; local HEAD has 32 and is ahead 3 / behind 0. Origin is unchanged. GitHub CLI authentication was not independently retested; connected-API success is separate evidence.

Both published refs still contain absolute owner-path text in the same six files:

- `START_HERE.md`
- `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`
- `docs/evidence/E0-S1-builder.md`
- `docs/evidence/E0-S2-builder.md`
- `docs/evidence/V0-S1-builder.md`
- `docs/product/Project_Second_Chance_PRD.md`

The builder’s new scoped report and the correction note in its previous GitHub report now acknowledge this accurately. No literal owner-directory value is repeated here. No root license is tracked. This cycle did not repeat a full secret-content/history audit or certify legal reuse/dependency-license compliance.

The forward-only cleanup is still a proposal. No six-file redaction, history rewrite, force-push, visibility change, remote update or publication was performed. Current branch-tip redaction would not remove text from existing history. Earlier untracked evidence also needs explicit publication selection/redaction. Historical evidence was preserved rather than overwritten; no owner acceptance or cleanup approval is inferred.

## Current gate results

Counts overlap; API and selected suites are not added to maintained totals.

| Exact command | Exit | Observed result |
| --- | --- | --- |
| `npm test` | 0 | 376 passed / 34 files |
| `npm run test:api` | 0 | 227 passed / 20 files |
| `npm run test:e2e` | 0 | 56 passed, both viewports |
| `npm run typecheck` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run verify:secrets` | 0 | No credential patterns found in tracked working source; original repository |
| `npm run test:secrets` | 0 | 7 passed, isolated fixtures |
| `npm audit --omit=dev` | 0 | 0 production dependency vulnerabilities reported |
| `git diff --check` | 0 | PASS |
| `npx vitest run --config tests/independent/focused.vitest.config.ts --fileParallelism=false` | 0 | 19 passed |
| `npx vitest run --config tests/independent/provenance.vitest.config.ts --fileParallelism=false` | 0 | 16 passed |
| `npx vitest run --config tests/independent/cv-retest.vitest.config.ts --fileParallelism=false` | 0 | 3 passed |
| `npx vitest run --config tests/independent/r2-lifecycle.vitest.config.ts` | 0 | 4 passed |
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

```text
npx vitest run --config tests/independent/corrective.vitest.config.ts --fileParallelism=false --testNamePattern 'browser configuration must neutralize|explicit E2E mode|stat is unavailable|ambiguous response after account|unexpected validation failure|rejected upload message|validation must not settle'
```

The audit used process-local `NODE_USE_SYSTEM_CA=1`; TLS verification was not disabled. This is not a full security/dependency certification. Secret scanning covers tracked working source, not every untracked artifact or all historical content.

The supplementary failure still reads native `worker.resourceLimits` after worker exit; the stage-aware worker tests pass. The original independent suite still fails its earlier immediate-disconnect-release and PDF-tail-acceptance expectations. These remain failed tests requiring transparent reviewer/owner maintenance disposition. They were not changed or counted as passes. Worker exit acknowledgement is CV-6; the separately named CR-6 concerns late HTTP responses.

The no-app download control still returns EPERM. The two preserved application artifact-byte assertions were not rerun after the environment control reproduced the failure. Browser artifact bytes remain **BLOCKED**, without a waiver; browser events and API bytes do not substitute for a saved-file comparison. Earlier 54/2 navigation failures and the focused 2/2 pass remain recorded despite the current 56/56 run.

## Preservation and next gate

After all tests, owner-runtime metadata shows **zero differences**, **10 files / 4,377,586 bytes**, including creation/write timestamps. No owner contents, keys, database records or `.env` values were opened or hashed. This does not independently recompute the owner’s content-hash claim.

All **27 source-manifest hashes** match in the original tree and restored isolated checkout. All **50 pre-existing independent-test/evidence files** in this turn’s preservation baseline retain their hashes. No listeners remain on test ports 3001/5173. HEAD, branch and main remain unchanged. Owner editor settings were preserved.

Codex added this report, its companion output and the working-source manifest, plus ignored local drivers/logs/metadata. No existing independent test or application file was edited in the original repository. No commit, push, PR, merge, deployment, migration or E1-S3 work occurred.

CR-5-R1 now has current independent support for its P6/P7/P8, FR-04, NFR-05/13/14/19 and R18/R19/R25 directory-fault controls. This is not backup/restore, key-directory fsync, power-loss durability or real-record readiness evidence.

**Next step: actual fresh Claude review**, rather than another application-fix cycle without a new reproducible defect. Review the E1-S2 committed delta from local main to HEAD and the complete uncommitted correction set. The prior Claude report explicitly left an independence gap concerning authorship/review overlap for `caee540`; this Codex test session does not close that commit-level review gap.

Remaining reviewer/owner decisions: artifact-byte verification, preserved assertion conflicts, historical TDD exceptions, real multi-tab account-switch evidence, concurrency value, minimum Node support, PDF boundary, key-directory durability, readiness/quota policy, legacy migration, license, public-path cleanup/publication and merge approval. A policy proposal is not owner approval. No E1-S2 completion, waived gate, production/hosted activation or legal-accuracy guarantee is claimed.

## Artifacts

- Current source identity: `docs/evidence/E1-S2-cr5r1-source-manifest-2026-11-25.json`.
- New output companion: `docs/evidence/E1-S2-codex-cr5r1-retest-2026-11-25-checks.txt`, with local user-directory text redacted in this new file only.
- Original local logs and exit files: `.setup/codex-cr5r1-20261125/ProjectSecondChance/.setup/`.
- Isolated regression driver: `.setup/codex-cr5r1-mutation.ps1`.
- Metadata: `.setup/codex-cr5r1-20261125-owner-before.json`, `-owner-after.json`, `-preserved-before.json`, `-preservation.json`.
- GitHub verification: `.setup/codex-cr5r1-github-local.json` and `-remote.json`.

Prior reports remain unchanged in this session, including their original before-fix failures. New companion redaction does not make earlier evidence or published history publication-ready.
