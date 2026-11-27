# E1-S2 CV corrective implementation — November 25, 2026

Builder: DeepSeek. Base/head: `03b1bb8aee712db73d4c690be850030e050e6361` on `feature/e1-s2-private-documents`; local main `e2edea5a11ba250b881449acaa951844e38abba0`. Change is **uncommitted** by instruction. This is builder evidence, not independent verification, approval, merge or production readiness.

## 1. Preserved work and runtime

Existing `.vscode/`, Codex reports/checks, Claude report, original independent tests and all previous evidence were preserved unchanged. No owner runtime file was opened, copied, migrated, reconciled, backed up, restored or initialized. Unit/probe runs used temporary directories; browser tests used `test-results/e2e-runtime-<pid>`. Owner runtime metadata remained at 10 files / 4,377,586 bytes with the same hash `679F6FF1…29B1`.

The legacy/identity migration remains a separately scoped owner decision. No migration was executed.

## 2. Prospective RED (observed before fixes)

Command in the repository:

`npx vitest run --config tests/independent/corrective.vitest.config.ts`

Exit **1**; **10 failed / 18 passed / 28 assertions**. The seven confirmed CV failures were:

- CV-1: inherited `PSC_PRIVATE_DATA_DIR`/`PSC_PRIVATE_KEY_DIR` escaped the E2E runtime.
- CV-1: explicit E2E flags without `PSC_RUNTIME_DIR` selected the default runtime instead of failing.
- CV-2: stat-unavailable deletion retry returned 204, removed the row and left ciphertext.
- CV-3: ambiguous reconciliation showed account B's case under account A.
- CV-4: unexpected validation exception after logout returned 400 with a stale cookie.
- CV-5: definite upload rejection appeared under a newly selected case.
- CV-6: validation settled before worker exit/termination acknowledgement.

The other three failures were fixture-environment issues in the repository, not CV application assertions: two startup tests refuse a checkout containing `.env`, and the legacy test needs the disposable `.setup/legacy-source` fixture. They were rerun in a credential-free disposable copy.

Raw log retained at `.setup/corrective-cv-red-baseline.log`. This prospective RED applies to the six CV corrections; it does **not** cure the earlier historical TDD-ordering gap or grant a TDD exception. The earlier cycle remains recorded as FAIL/incomplete.

## 3. Corrections and GREEN

### CV-1 — test isolation

- `loadAuthSettings` and `loadPrivatePaths` now throw if E2E flags are set without `PSC_RUNTIME_DIR`, before creating/using the project runtime.
- Playwright sets explicit `PSC_PRIVATE_DATA_DIR`/`PSC_PRIVATE_KEY_DIR` under the isolated runtime, so inherited narrow overrides cannot escape it.
- `scripts/check-test-isolation.mjs` checks all three settings.

GREEN: isolation probe **5/5 passed**, including direct config processes and the missing-override failure. Preflight exit 0.

### CV-2 — verified missing vs unavailable deletion

`PrivateFileOps` gained `lstat`. `removeManaged` now:

- requires `exists()` true and uses `lstat` to require a real file before unlink;
- treats `exists=false` + `lstat`-visible ciphertext as an unavailable/contradictory result, **not** absence;
- allows terminal logical deletion only for a verified `ENOENT` on an already-retryable row;
- maps other `lstat`/unlink errors to generic unavailable.

GREEN: stat-unavailable retry returned **503**, ciphertext remained, row remained (1). The genuine-absence probe still reaches 204 after first failure/restart. No unrelated sentinel was removed.

### CV-3 — identity before ambiguous refresh

`showServerState` now fetches cases, rechecks `client.me()`, and calls `endSession()` if the identity is null or changed **before** rendering cases/documents. `listCases` is still called twice as the probe expects.

GREEN: `identityChecks:2`, `newAccountCaseShown:false`, `oldIdentityStillShown:false`.

### CV-4 — unexpected validation exceptions

The upload validation generic catch now rechecks stored authorization and invokes `rejectUnauthorized` before returning a generic invalid result.

GREEN: unexpected validator exception after logout returned **401**, no `Set-Cookie`, zero published rows.

### CV-5 — definite upload error scope

The non-ambiguous upload catch now returns without showing an error if the selected case changed during the request. Ambiguous outcomes keep their existing reconcile/uncertainty behavior.

GREEN: no alert under the newly selected case; original case behavior remains covered.

### CV-6 — worker termination acknowledgement

`validatePdfInWorker` now awaits `worker.terminate()` before resolving/rejecting. The route slot therefore remains held until exit acknowledgement.

GREEN: `validationSettledBeforeWorkerExit:false`, `workerThreadStillRegistered:false`. Timeout/invalid/crash controls still terminate workers.

### Supplementary suite result

After fixes, the full supplemental suite in the credential-free disposable copy is **27 passed / 1 failed / 28 assertions**:

- API/storage **10/10**
- UI **5/5**
- isolation **5/5**
- worker **4/5**
- startup **2/2**
- hygiene **1/1**

The one worker failure is the first worker test's check that `record.worker.resourceLimits?.maxOldGenerationSizeMb` still equals 64 **after** validation resolves. Node clears native `resourceLimits` when the worker exits (`{}` after exit); CV-6 deliberately resolves after that exit. The same test already verifies the configured `record.options.resourceLimits` and the actual value before exit. The assertion conflicts with the mandated CV-6 ordering and was not edited or worked around. This is reported as an incompatible supplementary assertion, not a green gate.

## 3. CV-3-R1 follow-up — delayed list provenance

Codex's retest confirmed a residual race: `showServerState` fetched cases before `/me`, so a B-produced list could arrive after session A was restored and be rendered under A. Prospective RED reproduced:

`npx vitest run --config tests/independent/cv-retest.vitest.config.ts`

- exit **1**, **2 passed / 1 failed**; failure showed `delayedOtherAccountCaseShown:true`.
- The worker stage-aware controls passed (`liveOldHeapMiB:64`, `exitedBeforeResult:true`, `postExitLimitsEmpty:true`).

Correction:

- The real `GET /api/cases` response now includes the authenticated `accountId`.
- `CasesClient` exposes optional `listCasesWithProvenance`; initial case loading and `showServerState` compare the response's `accountId` with the authoritative `/me` identity before rendering cases.
- If the client cannot supply provenance, ambiguous mutations (`renderCases:false`) fail closed: the known case list is retained and only the already-scoped case's documents are refreshed. Delete-error reconciliation also uses real provenance when available; its fallback for clients without provenance remains disclosed.
- `/me` is still rechecked; null/changed identity ends the session.
- This fixes the delayed-B-response-under-A case without treating a later `/me` alone as provenance.

GREEN:

`npx vitest run --config tests/independent/cv-retest.vitest.config.ts` → **3 passed / 3**, output `delayedOtherAccountCaseShown:false`, `originalIdentityShown:true`.

The seven original CV assertions still pass **7/7** via the exact Codex pattern. The real server/client provenance path is additionally covered by maintained tests asserting `accountId` and parsing it in `listCasesWithProvenance`.

## 4. CV-3-R2 follow-up — successful-mutation refreshes

Codex's provenance retest found a second gap: successful create/edit/upload/document-delete used `reloadSelected`, and case-delete used a direct `listCases`, without checking response provenance. Prospective RED:

`npx vitest run --config tests/independent/provenance.vitest.config.ts --fileParallelism=false`

- Exit **1**; **11 passed / 5 failed**.
- All five successful-mutation paths logged `displayedA:true`, `displayedBCase:true`: create, edit, delete-case, delete-document, and upload with an "other" account list.

Correction:

- Added a single `listVerifiedCases(expectedAccountId)` boundary using `listCasesWithProvenance`; every refreshed list is published only when `accountId` matches the displayed user.
- `reloadSelected` now checks provenance **and** the request generation before `setCases`/`setDocuments`; create, edit, upload and document-delete use its boolean result to avoid claiming a verified refresh when none occurred.
- Case-delete success uses the same verified-list helper instead of `setCases(await client.listCases())`.
- If provenance is unavailable or mismatched, the known cases/documents are retained and a non-verification message is shown; the mutation is never replayed.
- All `setCases` sites were audited: clear-on-session-end, initial load, ambiguous reconciliation, successful reload, and case-delete all have identity/cancellation checks.

GREEN:

- Provenance suite: **16/16 passed**, including create/edit/delete-case/delete-document and upload/other; all `displayedBCase:false`.
- Seven original CV assertions: **7/7**.
- CV-3-R1 retest: **3/3**.
- Maintained UI: 24/24.

## 5. Maintained/original/browser checks

| Check | Result |
| --- | --- |
| `npm test` | **374 passed / 34 files**, exit 0 |
| `npm run test:api` | **225 passed / 20 files**, exit 0 |
| `npm run test:e2e` | **56 passed / 56**, exit 0; isolated runtime; owner hash unchanged |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (existing chunk warning) |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed / 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |
| Preserved auth/foundation/SDK/Mira/private probes | 8 / 6 / 3 / 2 / 6 passed |
| Preserved original Codex independent suite | **9/11**, exit 1; unchanged stale assertions |
| Supplementary CV identity retest | **PASS 3/3** — delayed account-B list is not rendered; stage-aware worker controls pass |
| Independent provenance suite | **PASS 16/16** — create/edit/upload/delete refreshes suppress account-B lists |
| Supplementary CV suite | **27/28**; one incompatible worker-property assertion |
| Browser artifact bytes | **BLOCKED**, exit 1; EPERM on both viewports |
| No-app download control | **BLOCKED**, exit 1; `CONTROL_DOWNLOAD_ERROR EPERM` |

Codex's earlier full-browser 54/2 navigation failures (`ERR_NETWORK_IO_SUSPENDED` / timeout at `/account`) and the later focused 2/2 pass are preserved as a reproducibility gap. This builder run's 56/56 does not erase those results. No retry/waiver was added.

## 6. Key, readiness and quota wording

- **Key durability:** exclusive `wx` creation and file fsync are implemented; **no key-directory fsync is attempted**. Full power-loss durability, atomic two-phase publication and adversarial multi-process creation are not proven. This remains an owner/reviewer decision.
- **Readiness:** `/api/ready` exists and was verified by disposable child-process startup (fresh ready; corrupt-key 503, health/auth live). Readiness reflects initialization state, not continuous disk/DB health; its policy needs owner/reviewer disposition.
- **Quota:** counts are local/best-effort and include persisted error/deleting cases and non-pending documents. A quota refusal still maps to generic `invalid-request`, which can give file/field advice rather than explicitly naming the quota; this remains a usability residual, not an approved stronger policy.
- **Identity migration:** legacy stores fail closed with `identity`; rows, key digest and decryptable blobs were preserved in a fictional fixture. A migration requires a separate, owner-approved scope with preflight, DB/key/blob correspondence checks, interruption behavior and rollback; none is implemented or executed here.

### Proposed legacy identity migration (separate owner decision; NOT executed)

1. Stop the API and take an owner-approved consistent backup of the DB, encrypted blobs and separately protected key material; record hashes/manifest. Do not copy keys into the data snapshot.
2. On a disposable copy, run a read-only preflight: verify key-check/key identity, decrypt metadata and authenticate a sample/all blobs, confirm every ready row maps to one managed blob and every blob/owner is accounted for. Abort on any mismatch.
3. Only after owner approval, create the store-identity marker and DB row in a defined order, with an explicit incomplete/initializing state, fsync, and rollback/removal if the DB transaction fails. Do not replace keys or rewrite document rows.
4. Re-run the read-only verification, open/download fictional samples, and only then allow live use. A failure/interruption must leave the legacy store fail-closed, not half-adopted.
5. This is a proposal for a separately scoped migration; no owner-runtime migration was executed.

## 7. Requirement/risk traceability

| CV | Acceptance/requirements | Risks |
| --- | --- | --- |
| CV-1 | P3/P9/P11, NFR-03/18/19, AD-09 | R13/R23/R25 |
| CV-2 | P6/P7, FR-04, NFR-05/13/14 | R18/R19/R25 |
| CV-3 | P2/P9/P10, FR-01/02/05, NFR-02/15 | R05/R11/R20 |
| CV-3-R1 | P2/P9/P10, FR-01/02/05, NFR-02/15 | R05/R11/R20 |
| CV-4 | P1/P9/P11, FR-01/02/05, NFR-02/19 | R05/R11 |
| CV-5 | P9/P10, NFR-13/15 | R05/R20/R25 |
| CV-6 | P3/P9, FR-06, NFR-03/13/19 | R13/R25 |

P1–P11 are not all closed. This scoped cycle addresses CV-1–CV-6 only.

## 8. Remaining limitations and pending decisions

- No durable upload idempotency key; duplicate prevention is not guaranteed.
- Exact PDF truncation at an earlier valid incremental boundary remains accepted.
- Worker engine limits are not a total process memory cap.
- Key-directory durability unproven.
- `/api/ready` and quota/error policy need disposition.
- Legacy identity migration needs separate owner approval.
- Browser artifact-byte gate blocked; no waiver.
- Historical TDD exceptions, concurrency value 2, Node >=22.2 (only Node 26 tested), and residual PDF limitations remain pending.
- Supplementary worker test's post-exit `resourceLimits` assertion conflicts with CV-6; 27/28, not all-green.
- CV-3-R1/R2 are fixed at the controlled client/component boundary. A real multi-tab browser session-switch reproduction was not run; the response-provenance field, initial-load check and fail-closed fallback are tested at unit/API boundary. Clients without the optional provenance method retain a narrower later-`/me` fallback; that separate window is not claimed eliminated.
- Successful-mutation refreshes now verify response provenance before publishing; no mutation is replayed. Failure to verify shows a non-verification message and retains known state.
- Historical TDD gaps and all policy/migration decisions remain pending.

## 9. Files changed

Application/config: `apps/server/src/auth/authConfig.ts`, `apps/server/src/private/privateConfig.ts`, `privateStore.ts`, `privateRoutes.ts`, `pdfValidation.ts`, `apps/web/src/cases/CasesPage.tsx`, `apps/web/src/cases/casesClient.ts`, `apps/server/src/private/privateRoutes.test.ts`, `apps/web/src/cases/casesClient.test.ts`, `apps/web/src/cases/CasesPage.test.tsx`, `playwright.config.ts`, `scripts/check-test-isolation.mjs`. Documentation: README; ADR-0002/0003/0004; spec; builder/risk/delivery/threat docs and this report. No original independent test/assertion was edited. Changes remain uncommitted.

## 10. Git / handoff

No commit, push, merge, deployment or E1-S3 work was performed. All changes are uncommitted for Codex retesting and fresh Claude review. Original independent assertions and prior evidence were not edited. Stop for independent verification and owner decisions.
