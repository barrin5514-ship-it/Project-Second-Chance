# E1-S2 focused corrective cycle and GitHub integration — November 25, 2026

Builder: DeepSeek. Branch: `feature/e1-s2-private-documents`; committed HEAD `03b1bb8aee712db73d4c690be850030e050e6361`; local main `e2edea5a11ba250b881449acaa951844e38abba0`. All corrective work is **uncommitted**. This is builder evidence, not independent approval, merge approval, production readiness or permission to publish.

## 1. Checkpoint and preserved worktree

- Repository root confirmed as `<repo>`.
- The 21-file reviewed manifest `docs/evidence/E1-S2-cv3-r2-source-manifest-2026-11-25.json` was verified before edits: **all 21 SHA-256 hashes matched**, exactly the 21 tracked modifications, no extras.
- The 21 files were preserved; new corrections and maintained tests were added on top rather than reverting HEAD or replacing prior work.
- `.vscode/`, all prior Codex/Claude reports, all original independent tests and `tests/independent/` were preserved.
- A source-only disposable checkpoint was created under `.setup/final-independent-copy`: current source/tests/config with no `.env`, owner `runtime/`, keys or databases; dependencies were reused through a junction. It is not a clean dependency install.
- No destructive Git operation, reset, merge, rebase, push, deployment or migration occurred.

## 2. Owner runtime and isolation

Metadata-only owner runtime: **10 files / 4,377,586 bytes**, hash `679F6FF1…29B1` before and after all work. No owner DB, key, document, `.env` value or private content was opened. This is metadata preservation, not proof of historical durability.

Tests used temporary/disposable fixtures. Browser tests used `PSC_RUNTIME_DIR` plus explicit private data/key paths under `test-results/e2e-runtime-<pid>`. E2E mode without the runtime override fails closed; maintained tests additionally cover inherited override neutralization and the guard.

## 3. Corrections (new-defect RED where confirmed)

### CR-1 — switched-case upload failure skipped identity reconciliation

**Requirement:** P9/P10; FR-01/02/05; NFR-02/19; R05/R11/R20.

**RED:** added maintained parameterized tests for 401, 403 and 404 after switching cases. `npx vitest run apps/web/src/cases/CasesPage.test.tsx -t "reconciles identity"` exited **1 with 3 failed / 3 passed**: the switched cases never called `/me`; A's email/case list remained. The same-case controls passed.

**GREEN:** `handleError` now always performs authoritative reconciliation for 401/403/404; a `suppressMessage` option hides only a stale case-specific message after identity handling. `-t "reconciles identity"` now exits **0, 7 passed**. Same-case controls and the original CV-5 “no message under another case when identity is unchanged” control pass.

### CR-3 — confirmed edit/delete reported as failed when only refresh failed

**Requirement:** P7/P10; truthful save/delete state; NFR-13; R20/R25.

**RED:** three maintained tests applied a refresh 503 after a resolved edit, case delete and document delete. Exit **1, 3 failed**: UI showed “Private storage is unavailable. Try again shortly.”; the deleted case remained open; document deletion showed a write failure.

**GREEN:** `reloadSelected` now distinguishes a failed/unverified refresh from a failed mutation and returns `false`; callers report “saved/deleted, but refreshed list could not be verified” without replay. Case deletion clears the open deleted case. Document deletion removes the confirmed item locally before refresh. Exit **0, 3 passed**.

### CR-4 — refresh proving another account did not reconcile the session; deleted document stayed listed

**Requirement:** P9/P10; NFR-13/15; R05/R11.

**Disposition:** This was a reviewer policy recommendation, not a separate confirmed pre-fix RED in this cycle. The implementation and maintained regression were added after the CR-1/CR-3 changes, so no historical RED is claimed for CR-4.

**GREEN:** a provenance mismatch now calls `/me`; if null/different the session ends, otherwise known state is retained. A confirmed document deletion removes it locally before any refresh. Maintained tests cover successful upload → B provenance/B identity → sign-out, and deleted document removal on refresh failure. No owner policy was inferred.

### CR-5 — transient storage unavailability permanently disabled documents / false deletion

**Requirement:** P6/P7/P8; FR-04; NFR-05/13/14; R18/R19/R25.

**RED:** maintained tests (a) injected `exists=false` while `lstat` still saw the ciphertext, then reconciled; (b) moved the blob root with rows present and reinitialized; (c) retried deletion with the blob root missing. Exit **1, 3 failed**: document marked `error`; startup recreated an empty root and marked rows missing; retry returned success while ciphertext existed elsewhere.

**GREEN:** reconciliation uses verified `lstat`; only `ENOENT` marks a row missing, and inaccessible/transient errors fail the store closed. Startup refuses to recreate an empty blob root when document rows exist. Deletion requires a verified parent directory before ENOENT can become terminal. `-t "transiently false|blob root is unavailable|blob root is missing|ordinary restart"` exits **0, 4 passed**. The genuine single-missing-file retry and ordinary restart controls remain green.

### CR-6 — late failures after 408 attempted a second response and logged stacks

**Requirement:** P3/P11; ADR-0004 D4; NFR-03/13/19; R13/R23/R25.

**RED:** two maintained tests completed validation with a failure after the 408 timer (one logged out). Exit **1, 2 failed**: second-response errors/ECONNRESET; no single clean late failure.

**GREEN:** the upload handler returns immediately when headers are already sent/destroyed; the private error middleware releases the slot and swallows already-terminated responses instead of calling Express’s default stack-printing handler. Late 408 failures are single-response, log no stack/paths, publish nothing, and the next upload succeeds. Exit **0, 2 passed**.

## 4. Maintained regression protection (CR-2) and eight mutation checks

Added maintained tests under `apps/` for CV-1–CV-6/R1/R2: E2E guard/config override; stat-unavailable deletion; ambiguous identity; initial/success provenance; late unexpected validation; switched-case error scope; worker exit acknowledgement; CR-1/CR-3/CR-4/CR-5/CR-6 behavior.

These are **post-implementation regression protection**, not historical RED. To prove detection, a disposable source copy was mutated and restored eight times; each mutation made its maintained test fail:

| # | Reverted behavior | Maintained check | Exit |
|---|---|---|---|
| 1 | CV-1 E2E runtime guard | `authConfig.test.ts` | **1 (1 failed)** |
| 2 | CV-2 lstat-consistent deletion | `privateStore.test.ts -t "false exists"` | **1 (1 failed)** |
| 3 | CV-3 `/me` comparison | `CasesPage.test.tsx -t "ambiguous upload identity change"` | **1 (1 failed)** |
| 4 | R1/R2 response provenance | `CasesPage.test.tsx -t "different account|initial loading"` | **1 (1 failed)** |
| 5 | Both CV-3 groups | `CasesPage.test.tsx -t "initial loading|ambiguous upload identity change"` | **1 (2 failed)** |
| 6 | CV-4 unexpected late-error recheck | `privateHardening.test.ts -t "unexpected validation exception"` | **1 (1 failed)** |
| 7 | CV-5 selection/identity split | `CasesPage.test.tsx -t "reconciles identity"` | **1 (3 failed)** |
| 8 | CV-6 worker exit acknowledgement | `workerLifecycle.test.ts -t "does not settle"` | **1 (1 failed)** |

All mutations were in `.setup/focused-mutation-work`; each source file was restored from the pristine base after the check. The owner tree was not mutated.

## 5. Verification

Environment: Windows; Node **v26.13.0**; npm **11.20.0**; Vitest 2.1.8; Playwright 1.49.1; TypeScript 5.7.2; Vite 6.0.3; better-sqlite3 13.2.0. Only this Node/OS combination was tested.

| Check | Result |
| --- | --- |
| `npm test` | **PASS — 376 tests / 34 files**, exit 0 |
| `npm run test:api` | **PASS — 227 tests / 20 files**, exit 0 |
| `npm run test:e2e` | **PASS — 56/56**, exit 0, isolated runtime, owner hash unchanged |
| `npm run typecheck` | **PASS**, exit 0 |
| `npm run build` | **PASS**, exit 0 (existing chunk warning) |
| `npm run verify:secrets` | **PASS**, no tracked-source patterns |
| `npm run test:secrets` | **PASS — 7** |
| `npm audit --omit=dev` | **PASS — 0 vulnerabilities** |
| `git diff --check` | **PASS** |
| Independent provenance suite | **PASS — 16/16** |
| CV-3-R1 retest | **PASS — 3/3** |
| R2 lifecycle probes | **PASS — 4/4** |
| Seven original CV assertions | **PASS — 7/7** |
| Supplementary independent suite | **FAIL — 27/28**; preserved post-exit native `resourceLimits` assertion conflicts with CV-6, not edited |
| Original independent suite | **FAIL — 9/11**; preserved immediate-disconnect and old PDF-tail assertions, not edited |
| Preserved private/auth/foundation/SDK/Mira probes | **PASS** — 6/8/6/3/2 |
| Cookie-race probe | **PASS** |
| Browser artifact bytes | **BLOCKED** — EPERM; no-app control `CONTROL_DOWNLOAD_ERROR EPERM`; no waiver |

The 28- and 11-test independent suites were run separately; their counts are not added to maintained/API totals. Codex’s prior browser 54/2 navigation failures and later focused 2/2 pass remain historical reproducibility evidence; this 56/56 run does not erase them.

## 6. P1–P11 disposition

| Criterion | Disposition |
| --- | --- |
| P1 identity/ownership | PASS in tested local API/UI scope; no server cross-account access reproduced |
| P2 case lifecycle | PASS in tested scope; CR-1/CR-3/CR-4 UI consistency corrected |
| P3 upload boundary | PASS tested limits/worker; CR-6 corrected; exact PDF residual pending |
| P4 confidentiality | PASS tested at-rest/canaries; key-directory durability unproven |
| P5 integrity | API/crypto PASS; **browser artifact bytes BLOCKED** |
| P6 atomicity/faults | CR-5 corrected; selected faults tested; not exhaustive |
| P7 live deletion | CR-2/CR-5 deletion truthfulness corrected; no backup/secure-erase claim |
| P8 restart/key loss | CR-5 corrected; legacy migration still blocked/pending |
| P9 concurrent/revoked work | CR-1/CR-4/CR-6 corrected in controlled tests; real multi-tab unverified |
| P10 protected UI | CR-1/CR-3/CR-4 corrected; no false success after refresh failure; artifact block |
| P11 regression/review | Better maintained protection and 8 mutations; independent failures/TDD exception/fresh review/owner gates remain |

No criterion is claimed production-ready; no legal-accuracy or cross-account security certification is implied.

## 7. Requirement/risk links

| Correction | Requirements | Risks |
| --- | --- | --- |
| CR-1/CR-4 | P9/P10, FR-01/02/05, NFR-02/13/15/19, AD-06/09 | R05/R11/R20/R25 |
| CR-3/CR-5 | P6/P7/P8, FR-04, NFR-05/13/14/19, AD-03/09 | R18/R19/R25 |
| CR-6 | P3/P11, FR-06, NFR-03/13/19, AD-04/09 | R13/R23/R25 |
| CR-2/coverage | P11, NFR-18, AD-09 | R23 |
| GitHub administration | No feature/architecture authorization | R23/R24 repository discipline |

No risk is closed. Owner-runtime migration, backup/restore, hosted readiness and real-record use remain outside this cycle.

## 8. GitHub repository integration report

### Verified repository state

- URL: https://github.com/barrin5514-ship-it/Project-Second-Chance.git
- Visibility: **PUBLIC** (GitHub CLI/API).
- Authentication: GitHub CLI authenticated as `barrin5514-ship-it` (token not disclosed); repository scopes present.
- Default branch: **main**.
- Fork: no. License metadata: **none**.
- Existing `origin` already points to the correct URL; preserved. No competing remote configured.
- Remote branches after fetch: `origin/main` and `origin/feature/e1-s2-private-documents`; `origin/HEAD -> origin/main`.
- Remote history: **26 commits on `main`** (`origin/main` at `e2edea5`); published feature **29 commits** (`744f00a`); local HEAD **32 commits**. The earlier “remote 26 commits” wording described main only.
- `origin/main` equals local `main` (`e2edea5`; no ahead/behind divergence).
- `origin/feature/e1-s2-private-documents` is at `744f00a`, an **ancestor** of local feature HEAD `03b1bb8`; local is ahead 3, behind 0. A future feature push would be a fast-forward; no merge/rebase needed.
- Local working-tree corrections are uncommitted and are not on any remote.

### Public exposure / secret scan

- No tracked `.env`, runtime DB/WAL/SHM, key, `.psc` ciphertext, `node_modules`, test-results or `.vscode` path. Only `.env.example` with empty placeholder exists.
- Historical path scan across all local commits found no `.env`, `runtime/`, `*.psc`, SQLite or key file commits.
- Secret-pattern history hits were only synthetic fixture strings in `config.test.ts` and `verify-secrets.test.mjs`; no real credential values were printed or found.
- **Correction (added after independent retest):** the earlier statement that published refs contain no absolute owner paths was **false**. Both `origin/main` and `origin/feature/e1-s2-private-documents` contain the same six tracked files with absolute owner paths: `START_HERE.md`, `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`, `docs/evidence/E0-S1-builder.md`, `docs/evidence/E0-S2-builder.md`, `docs/evidence/V0-S1-builder.md`, and `docs/product/Project_Second_Chance_PRD.md`. The value is not repeated here. Additional E1-S2 evidence files in the working tree also contain owner paths and must not be published unsanitized.
- No history rewrite, visibility change or sanitization was performed. A forward-only redaction of the six files on both branches can clean the branch tips but cannot remove the paths from existing published history; full historical removal requires explicit owner authorization for history rewrite/force-push. The owner may also accept the username-path exposure or make the repository private.
- No private legal records, uploaded documents, PII, sensitive screenshots or private agent logs were found in the tracked/remote tree.
- The public repository includes BMAD/skill assets and generated planning docs; these are project files, not secrets. No dependency directories are tracked.
- The `.gitignore` now additionally excludes `.vscode/`, `.idea/` and `*.tsbuildinfo`; existing coverage excludes `.env*` (except example), runtime/keys/databases/storage/uploads/backups, node_modules, browser artifacts, build outputs and `.setup/`.

### README and license

README now states status/legal boundary: E1-S2 is not approved/merged/production-ready; legal information only, not an attorney or eligibility decision; fictional data only; no license. It describes installation, checks, security/privacy limits and unimplemented features. No production-readiness claim was added.

No LICENSE file exists. Public visibility does not itself grant reuse rights; copyright remains with the owner. Options requiring owner decision:

- **No license:** default copyright; public viewing, no general reuse.
- **MIT:** short permissive license; broad reuse with attribution, no warranty.
- **Apache-2.0:** permissive plus explicit patent grant and notice obligations; more complex.

Third-party dependencies/assets retain their own licenses; the owner should review notices before selecting a project license. No license was applied.

### Proposed publication procedure (not executed)

1. Owner/reviewer approves the exact change manifest; sanitize local absolute paths from evidence intended for publication. Separately decide whether to publish a forward-only redaction of the six existing files on both branches; that cleans tips only, not reachable history. Do not rewrite history or force-push without explicit owner authorization.
2. Stage only authorized source/tests/docs/config; verify `git diff --cached` contains no runtime, keys, `.env`, browser artifacts, `.vscode` or unrelated owner files.
3. Commit the scoped feature-branch changes. Do not amend or rewrite published history.
4. `git push origin feature/e1-s2-private-documents` — current remote feature is an ancestor, so this is a normal fast-forward if unchanged; verify remote hasn't moved first.
5. Open a **draft** pull request only after independent Codex verification and fresh Claude review; describe E1-S2 as unapproved until owner merge approval.
6. Merge to `main` only with explicit owner approval; do not force-push, rewrite history or publish the owner runtime.
7. No PR is created in this cycle.

## 9. Remaining defects, limitations and decisions

- Browser-downloaded artifact bytes remain **BLOCKED** by Windows EPERM, including no-app control; not waived or substituted with API bytes.
- Supplementary independent suite remains **27/28** (native post-exit `resourceLimits` assertion) and original **9/11** (immediate-disconnect release, old PDF-tail acceptance); preserved, no waiver.
- No real multi-tab browser account-switch reproduction; controlled component tests establish the client boundary.
- Historical TDD gaps remain; CR corrections now have observed RED and post-implementation mutation checks, but that does not retroactively cure earlier ordering.
- Key-directory durability, exact PDF boundary, readiness/quota policy, legacy identity migration, concurrency value 2, Node minimum, browser-artifact disposition and historical TDD exception remain owner decisions.
- No backup/restore, secure erasure, hosted TLS, real records, OCR/AI/court integration or E1-S3 work is claimed.
- Repository publication, license choice and PR/merge remain owner decisions.

## 10. Git status / handoff

No commit, push, merge, deployment or migration was performed. Working tree contains the preserved 21 reviewed files plus new corrections, maintained tests, `.gitignore`, README and this report; untracked independent evidence/tests remain preserved. Exact tracked modifications are listed by `git status` at handoff.

Codex should independently verify: CR-1/3/4/5/6, the eight mutation checks, maintained counts, original/supplementary conflicts, provenance/worker controls, browser isolation, owner-runtime metadata, and GitHub public-exposure status. Fresh Claude review and owner decisions follow. No E1-S2 approval or completion is claimed.
