# E1-S2 CR-5-R1 and GitHub correction — November 25, 2026

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`; HEAD `03b1bb8aee712db73d4c690be850030e050e6361`; local main `e2edea5`. Work remains **uncommitted**. This is not approval, merge, publication or E1-S2 completion.

## 1. CR-5-R1 — unavailable blob root/shard during reconciliation

Codex reproduced two residual paths: moving `runtime/private/blobs` or a two-character shard, then reconciling, persisted `status='error'` for an intact document; restoring the directory did not restore access. The shard variant also occurred through new-store construction plus startup reconciliation.

**Prospective RED (maintained):**

`npx vitest run apps/server/src/private/privateStore.test.ts -t "temporarily unavailable during reconciliation"`

Exit **1, 2 failed**: both root and shard reconciliation returned without throwing and the tests failed the fail-closed assertion.

**Correction:** reconciliation now verifies the blob root and each containing shard directory with `lstat`/`isDirectory` before interpreting a file-level `ENOENT`. Missing/unavailable/inaccessible directories throw `unavailable` without changing any row. A genuine file `ENOENT` with a verified parent still marks the document `error`; verified terminal deletion remains unchanged.

**GREEN:** maintained directory-loss tests **2/2**, and the unchanged independent focused suite now passes **19/19** (previously 17/19). Logs show for both variants: `reconciliationThrew:true`, `statusAfterRestoration:ready`, `readableAfterRestoration:true`, `ciphertextUnchanged:true`. The genuine-missing-file and ordinary-restart controls pass.

No directory is silently adopted, created, migrated or recovered. Startup root protection and deletion-parent checks remain.

## 2. GitHub report correction

Verified against the actual remote refs and GitHub API:

- Repository: `https://github.com/barrin5514-ship-it/Project-Second-Chance` — **PUBLIC**, default `main`, no fork, no recognized license; GitHub CLI authenticated; origin correct.
- Commit counts: **main 26**, published feature **29** (`744f00a`), local HEAD **32**. The earlier report’s “26 remote commits” referred only to main.
- `origin/main` = local main `e2edea5`; published feature is an ancestor of local HEAD (ahead 3, behind 0).
- **The earlier “no absolute owner paths on published refs” claim was false.** The same six tracked files on both published branches contain them:
  - `START_HERE.md`
  - `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`
  - `docs/evidence/E0-S1-builder.md`
  - `docs/evidence/E0-S2-builder.md`
  - `docs/evidence/V0-S1-builder.md`
  - `docs/product/Project_Second_Chance_PRD.md`
- The value is not printed. Additional E1-S2 evidence files in the working tree contain the same class of path and must not be published unsanitized.
- No tracked `.env` (only `.env.example`), runtime/key/database/ciphertext/dependency/browser-artifact path was found in the published trees. This is not a full content/secret audit.

**Scoped cleanup proposal (owner decision; not executed):** publish a forward-only redaction commit replacing the absolute path with a neutral placeholder in those six files, coordinated on both feature and main (main cleanup after owner approval/PR). This cleans branch tips only; the path remains in reachable history. Full historical removal would require explicit owner authorization for history rewrite/force-push. Alternatives are acceptance of the username-path exposure or changing repository visibility. No history rewrite, force-push, visibility change or sanitization was performed. Existing untracked evidence should be sanitized or excluded before publication.

The prior GitHub report now contains a correction note; this report is the current scoped disposition.

## 3. Verification

| Check | Result |
| --- | --- |
| Independent focused suite (`tests/independent/focused.vitest.config.ts --fileParallelism=false`) | **PASS — 19/19** |
| `npm test` | **PASS — 376 / 34 files** |
| `npm run test:api` | **PASS — 227 / 20 files** |
| `npm run test:e2e` | **PASS — 56/56**, isolated runtime, owner hash unchanged |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm run verify:secrets` / `test:secrets` | **PASS** / 7 passed |
| `npm audit --omit=dev` | **PASS — 0 vulnerabilities** |
| `git diff --check` | **PASS** |
| Independent provenance / CV retest / R2 lifecycle | **16/16 / 3/3 / 4/4** |
| Seven original CV assertions | **7/7** |
| Supplementary independent suite | **FAIL 27/28** — preserved post-exit native `resourceLimits` assertion incompatible with CV-6 |
| Original independent suite | **FAIL 9/11** — preserved immediate-disconnect and old PDF-tail assertions |
| Preserved private/auth/foundation/SDK/Mira probes | **PASS — 6/8/6/3/2** |
| Browser artifact bytes | **BLOCKED** — EPERM, no-app control; no waiver |

Counts overlap; independent counts are not added to maintained/API. Earlier browser 54/2 navigation failures remain historical and are not erased by this 56/56 run. Historical TDD exceptions and all policy decisions remain pending.

Owner runtime metadata remained 10 files / 4,377,586 bytes with hash `679F6FF1…29B1`; no owner contents, keys, credentials or records were opened.

## 4. Requirements / limits

CR-5-R1 maps to P6/P7/P8; FR-04; NFR-05/13/14/19; AD-03/09; R18/R19/R25. P7/P8 remain dependent on the directory-fault controls now passing; this does not establish recovery, migration or backup guarantees. No E1-S3, hosted, real-record or legal-accuracy claim is made.

Remaining: browser artifact gate; preserved independent conflicts; real multi-tab account switch unverified; key-directory durability; PDF boundary; readiness/quota policy; legacy migration; license; publication and merge approval. No commit, push, PR, merge, deployment or migration occurred. Changes are ready for Codex retesting.
