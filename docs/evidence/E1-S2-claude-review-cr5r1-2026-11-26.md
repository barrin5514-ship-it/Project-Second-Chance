# E1-S2 independent Claude review — CR-5-R1 tree (03b1bb8 plus 27 working files)

Dates: November 25–26, 2026. Reviewer: Claude (Claude Code, Claude Sonnet 5.5). Companion: `E1-S2-claude-review-cr5r1-2026-11-26-checks.txt` (probe sources, drivers and output logs; local paths redacted).

## 1. Disposition

**Changes requested. Return to DeepSeek.** This is not owner approval, a waiver, merge or publication approval, or E1-S2 completion.

The reported test totals reproduce. The CR-5-R1 correction passes its own controls. These items block acceptance:

| ID | Priority | Summary | Evidence |
| --- | --- | --- | --- |
| NR-1 | P2, blocking | Session loss during a refresh after a confirmed write no longer ends the session. Regression in the latest CR-3 fix | Executed |
| NR-2 | P2, blocking | One upload during a storage loss recreates the lost shard. A delete retry then reports success while the ciphertext is intact elsewhere | Executed, store and API |
| NR-3 | P2, blocks evidence acceptance | Test totals recorded for earlier cycles were rewritten to current totals | Executed comparison |
| NR-4 | P2, blocks any push | An unpushed commit adds a seventh tracked file with absolute owner paths | Executed scan |
| NR-5 | P3 | Normal shutdown crashes with a stack trace when storage is unavailable | Executed |
| NR-6 | P3 | Maintained tests cannot detect several regressions; two groups of tests cannot fail for the reason they name | Executed; some causes by Inspection |
| NR-7 | Needs triage | The full `npm audit` reports 9 advisories (2 critical) in development tools. Recorded "audit passed" results cover production dependencies only | Executed; reachability not assessed |
| NR-8 | P4 | Fail-open fallbacks, selection ordering, stale list entry and inaccurate documentation | Inspection |

I reproduced no cross-account server access. This is not a full security assessment.

Evidence labels: **Executed** means I ran it. **Inspection** means I read source and did not run that behavior. **Unverified** means neither establishes it.

## 2. Reviewer independence (`caee540`)

`caee540` says its reviewer also wrote the fixes and that they still needed independent testing. It carries a Claude Sonnet 5.5 co-author trailer.

- This session did not write `caee540` and has no context from the session that did.
- **The author is the same model as this reviewer.** A separate session does not remove shared blind spots.
- This session also wrote the earlier CR-1..CR-6 review that shaped the latest corrections. I am therefore reviewing responses to my own findings. NR-1 breaks a condition my earlier CR-3 text required ("keep identity checks").
- What I did this time, which the earlier review did not: read the `caee540` server, validation and UI diffs, then removed 23 of its controls one at a time in a disposable copy and ran the maintained suite after each. 21 were detected; 2 were not (NR-6).

**This narrows the gap. I do not declare it closed.** The owner decides whether a separate same-model session satisfies AD-09 independence. The strongest closure is review of `caee540` by a human or a non-Claude reviewer.

## 3. Identity and scope

- Project root `<repo>`. Branch `feature/e1-s2-private-documents`. HEAD `03b1bb8aee712db73d4c690be850030e050e6361`. Local main and merge base `e2edea5a11ba250b881449acaa951844e38abba0`. Nothing staged.
- Commits in main..HEAD: `0844251` (docs), `5e93d9f` (feature), `744f00a` (docs), `caee540`, `3600dd6`, `03b1bb8`.
- Manifest `E1-S2-cr5r1-source-manifest-2026-11-25.json`, SHA-256 `2C56DAA57CC0096EFFF1E90DD7E99C3D858418BAD70792909BC7A1B5F46898F4`: 27 entries, 0 mismatches, exact coverage (25 modified files plus `isolation.test.ts` and `workerLifecycle.test.ts`).
- **HEAD alone does not contain the latest corrections.** The published feature branch (`744f00a`) does not contain even `caee540`. Neither is the tree reviewed or tested here.
- Committed delta: `git diff --check` passed. By Inspection I read the `caee540` server, validation and UI diffs, `app.ts`, health routes, `auth.ts`, `AccountPage`, `main.tsx`, `package.json`, `authConfig.ts`, `crypto.ts`, the e2e spec and the source-hygiene test. I saw no defect in the envelope and AAD construction in `crypto.ts`; that is not a cryptographic audit. I did not re-read every committed documentation, lockfile or test line.
- Uncommitted set: the changes since the tree I reviewed before, read as incremental diffs, plus the current source they touch.
- Read: AGENTS.md; the Codex CR-5-R1 report and its output companion; the builder CR-5-R1 and focused-correction reports; the earlier Codex focused retest and Claude reviews; story, spec, ADR-0002/0003/0004 and risk records (ADRs unchanged since my previous review). I did not re-read the full PRD or Architecture Spine.
- Not opened: `.env`, `.vscode/`, owner runtime contents, keys or records.
- I wrote only this report and its companion in the repository. No application or existing-test edit, commit, push, PR, merge, publication, visibility or history change, migration or E1-S3 work.

### Incident during this review

My first attempt to build the disposable copy failed on a Windows long path. The directory change never happened, so the chained commands ran in `<repo>`. They created `<repo>/claude-review/` with 5 copied probe files and tried to create a junction over the real `node_modules`. Windows refused the junction.

I checked that `node_modules` was still a real directory (269 entries, `npm ls` exit 0), that the 5 files were untracked and byte-identical to my scratch copies, and then removed exactly those files and the empty folder. Afterwards the manifest matched, earlier evidence was unchanged and owner-runtime metadata was unchanged. Later copy steps stop on the first error and check the working directory.

## 4. Checks actually run

Disposable copy outside the repository: `git archive HEAD` (excluding `_bmad-output/planning-artifacts`) plus the 27 manifest files, independent tests and preserved probes, with no `.env` or `runtime/`. Dependencies came through a junction, so this is not clean-install evidence, and tool caches may have been written under `node_modules`. I removed the junction afterwards and confirmed the real directory remained. Windows, Node 26.13.0, npm 11.20.0. Fictional data only.

| Check | Exit | My result |
| --- | --- | --- |
| `npm test`; `npm run test:api` | 0 | 376 / 34 files; 227 / 20 files |
| `npm run typecheck`; `npm run build` | 0 | pass |
| `npm run test:e2e` | 0 | 56 passed |
| Focused; provenance; CV retest; R2 lifecycle | 0 | 19/19; 16/16; 3/3; 4/4 |
| Seven original CV assertions | 0 | 7 passed / 21 skipped |
| Supplementary suite | 1 | **27/28**, the known `resourceLimits` assertion |
| Original independent suite | 1 | **9/11**, the known disconnect and PDF-tail assertions |
| Preserved private / auth / foundation / SDK / Mira probes | 0 | 6 / 8 / 6 / 3 / 2 |
| Preserved cookie-race probe | 0 | 1 passed |
| `download-control.mjs` (no application) | 1 | `CONTROL_DOWNLOAD_ERROR EPERM` |
| Unchanged download spec | 1 | 2 failed, EPERM opening the artifact (Codex did not rerun it) |
| `npm run test:secrets` | 0 | 7 passed |
| `npm run verify:secrets`; `git diff --check` (original repository) | 0 | pass within their scope |
| `npm audit --omit=dev` (original repository) | 0 | 0 vulnerabilities |
| `npm audit` (copy and original repository) | 1 | **9: 4 moderate, 3 high, 2 critical** (NR-7) |
| 42 single-control reverts against `npm test` | — | **36 detected, 6 survived** (NR-6) |
| All three CR-6 guards removed together | 0 | **376/376 still passed** (NR-6) |
| NR-1 probe: working tree / previously reviewed tree / HEAD page | 1 / 0 / 0 | 6 of 18 / 18 of 18 / 18 of 18 pass |
| NR-2 probe | 1 | 7 failed / 3 passed (the 3 include two no-upload controls) |
| NR-5 probe against real `main.ts` | — | exit 0 control; exit 1 with the shard moved |
| My earlier UI probe, unchanged | 1 | 12 pass / 2 fail: both wait for a message replaced by the intentional sign-out |
| My earlier reconciliation probe, unchanged | 1 | 2 pass / 2 fail: startup now throws, which is the intended fail-closed result |
| Adapted reconciliation probe; account-switch API probe | 0 | 1 passed; 1 passed |
| My late-408 probe, real server and timers | 0 | 408/408/401/408, health 200, no stack or header error |

A mutation counts as detected when at least one maintained test fails. The driver recorded the first two failing test names for each; I did not inspect every failure message. All changed files were restored: the manifest showed no mismatches afterwards, and `auth.ts` and `uploadValidation.ts`, which are not in the manifest, matched HEAD.

**Codex mutation claim:** supported. Codex swapped back the earlier `privateStore.ts`, which its report says differs only by the two directory checks; I did not hash that snapshot. Independently, removing only the root and shard checks in `reconcile` made the two maintained directory-loss tests fail.

**No real multi-tab account-switch reproduction has occurred**, by me or in any report I read. My API probe is one scripted cookie jar. UI probes use controlled clients, so real-browser reachability of these timings is unverified. The passing browser run does not explain the earlier 54/2 navigation failures.

**Preservation:** owner-runtime listing (names, sizes, modification times) unchanged: 10 files, 4,377,586 bytes. This is not a content comparison. 98 pre-existing files under `tests/independent/` and `docs/evidence/` kept their hashes. No listeners remained on ports 3001, 5173, 3917 or 3919.

## 5. Findings

### NR-1 — P2, blocking. Session loss during a post-write refresh is swallowed

`apps/web/src/cases/CasesPage.tsx:185-206`; the catch at `201-205`. Callers: create `273`, edit `314`, upload `390`, document delete `471`. **Executed.**

The CR-3 fix wraps `reloadSelected` in a catch that returns `false` for every error. `listVerifiedCases` (`168-172`) and `listDocuments` (`197`) can throw 401, 403 or 404. None reaches `handleError` (`492-512`), so `me()` is not called.

Probe: `refresh-auth.probe.test.tsx`, 18 tests. Each fails both list methods or the document list after a confirmed write, and records that the injected failure fired.

| Refresh stage | Working tree |
| --- | --- |
| Case list returns 401 | Session stays after create, edit, upload, document delete. Only case delete ends it |
| Document list returns 401 | Session stays in all 4 operations that fetch documents |
| Document list returns 404 and `me()` would return B | A stays displayed in all 4 |
| 503 controls (5) | All pass: view retained, write reported as confirmed |

So 1 of 13 session-loss probes ends the session. **All 18 pass on the previously reviewed tree and with the HEAD page.** The page shows "saved" or "deleted … could not be verified" while A's private data remains on screen after A's session ended. No B data was rendered. By Inspection, a later protected action that fails would reconcile.

Case delete differs because its catch (`344-350`) is followed by `reconcileMismatchedIdentity` (`353-356`, defined `174-183`).

Conflicts with P9 and P10, spec EXPIRY/REVOKE, R05, R11 and R20. The maintained post-write refresh tests inject only 503. The maintained 401 injections cover initial load, an upload action and opening a case (`CasesPage.test.tsx:68`, `148`, `622`).

**Regression criteria:** in each of the four reload callers and case delete, 401, 403 or 404 during either refresh step re-queries `me()`; a null or different identity ends the session; the same identity keeps the view and the confirmed-write message. The 503 controls stay green. No write is replayed.

### NR-2 — P2, blocking. An upload recreates a lost shard and defeats the directory-loss protection

`apps/server/src/private/privateStore.ts:654` (recursive mkdir during upload); checks it bypasses at `312-318` (delete) and `842-850` (reconcile); startup root check `428-442`; delete retry allows a missing file for any non-`ready` row (`760`, `787`). **Executed.**

Blob names start with `blob_` (`183`, `637`), and the shard is the first two characters. **Every blob therefore lives in one directory, `bl`.** The probe confirmed 13 documents in that single shard. Uploading recreates it without asking whether existing rows depend on the missing directory. The parent checks then see a real, empty directory.

| Fictional fault, then one upload | Upload | Delete 1 | Delete 2 | Reconcile alternative |
| --- | --- | --- | --- | --- |
| Blob root moved away | stored | unavailable | **success** | intact document marked `error` |
| Shard moved away | stored | unavailable | **success** | intact document marked `error` |
| Whole data directory moved | fails, but **still creates the shard** | unavailable | **success** | intact document marked `error` |

In every row the original ciphertext remained intact at the moved location. Without an upload, root and shard loss fail closed (controls pass).

**Real API:** shard moved, upload **201**, delete **503**, repeat delete **204**; the document was no longer listed, with its ciphertext intact elsewhere.

By Inspection: if the folder were restored after the row was deleted, orphan cleanup (`832-835`) would remove the blob. The upload mkdir dates from `5e93d9f`; it is not new, but it means the CR-5 and CR-5-R1 protection does not hold once any upload is attempted. Conflicts with P6, P7, P8, R18, R19 and R25.

**Regression criteria:** when existing document rows depend on a blob root or shard that is missing or unreadable, upload fails closed and creates nothing. The pending row is inserted after the mkdir (`657-659`), so a check before `654` sees only earlier rows. The first upload on a fresh store still works. After a failed upload, repeated delete and reconcile stay unavailable, and restoring the folder restores readable documents. No-upload controls and genuine single-missing-file deletion stay green.

**Policy point (Inspection):** with fail-closed behavior, one permanently lost shard makes private storage unavailable for every account, and the UI offers no recovery. This is a sound safety default but needs an operator statement before E1-S3.

### NR-3 — P2. Historical test totals were rewritten

**Executed.** I compared three versions. The earlier working copies match the CV3-R2 manifest hashes.

| Document and section | At HEAD | CV3-R2 tree | Now |
| --- | --- | --- | --- |
| `E1-S2-builder.md`, "Final checks" (`80-97`) | 347 / 213 | 348 / 213 | 376 / 227 |
| `E1-S2-builder.md`, "CV-3-R2 corrective follow-up" (`66-68`) | absent | 348 / 213 | 376 / 227 |
| `E1-S2-builder.md`, "CV corrective cycle — Codex verification" (`70-72`) | absent | 348 / 213 | 376 / 227 |
| `RISK_REGISTER.md`, "E1-S2 corrective-cycle update" (line `61`) | 347 / 213 | 348 / 213 | 376 / 227 |
| `RISK_REGISTER.md`, "E1-S2 CV corrective update" | absent | 348 / 213 | 376 / 227 |

Those sections now say earlier cycles produced results that came from a later tree. Under R23 and AGENTS.md, evidence must keep actual counts. The 376 in the builder's "CR-5-R1" section (`62-64`) is genuine.

**Required:** restore each historical number and put the new totals in a dated new entry. I did not edit these files.

### NR-4 — P2, blocks any push. A seventh tracked file with owner paths is waiting to be pushed

**Executed** scan of local Git objects; matched values are not printed.

- `e2edea5` (26 commits) and `744f00a` (29 commits), matching local `origin/main` and `origin/feature/…`, contain absolute owner paths in the same six files: `START_HERE.md`, `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`, `docs/evidence/E0-S1-builder.md`, `E0-S2-builder.md`, `V0-S1-builder.md`, `docs/product/Project_Second_Chance_PRD.md`.
- **HEAD contains a seventh: `docs/evidence/E1-S2-corrective-2026-11-25.md`**, committed in unpushed `03b1bb8`. A normal push would publish it. The Codex scan covered only the two published refs, and I found no report that lists this file as exposed.
- A later redaction commit would not remove it from the pushed history. Keeping it out means rewriting unpushed local commits, which needs owner authorization, changes SHAs that current evidence cites, and has not been done.
- 25 modified tracked files: none contain such paths. Untracked: 11 of 52 files (counted before this report) do, **including my own earlier report** `E1-S2-claude-review-03b1bb8-worktree-2026-11-25.md`. The full list is in the companion.
- 58 author/committer address entries on the published refs; none uses a GitHub no-reply address. The values are not reproduced here.

Codex reports the repository is public. I did not re-query GitHub or fetch, so published state here means local remote-tracking refs.

### NR-5 — P3. Shutdown throws when storage is unavailable

`apps/server/src/main.ts:73-79`. **Executed** against real `main.ts` with a fictional runtime. Windows cannot deliver SIGINT to a child process, so a preload emitted the event.

`shutdown()` calls `reconcile()` without a guard, and `reconcile()` now throws. With the shard moved: **exit 1**, `PrivateStorageError`, 10 stack frames (3 with absolute paths), and `auth.close()` is skipped. Control: exit 0, no stack. This contradicts ADR-0004 D4 (`docs/adr/0004-upload-validation-and-limits.md:46`). New in this uncommitted set.

**Regression criteria:** with storage unavailable, shutdown still closes auth and the store, exits cleanly and writes no stack or path; no row changes.

### NR-6 — P3. Maintained regression protection is weaker than the totals suggest

Of 42 single-control reverts (19 corrections, 23 `caee540` controls), 36 were detected. **Executed.**

**Survivors:** removal of a deleted document from the local list; each of three CR-6 guards; C1 control-character rejection; disabling download while the parent case is not ready.

1. **A test that cannot fail (Executed).** `CasesPage.test.tsx:420-436` asserts `queryByText(DOC.originalName)` is absent. `CasesPage.tsx:651` renders name, type and size as one text, so the exact-text query never matches. With the removal code deleted, the shipped test passes. Changing the query to a pattern in the disposable copy: passes with the shipped source, fails without the removal. The product behavior is present; its protection is not.
2. **CR-6 is unprotected (Executed).** With all three guards removed together, 376/376 pass. The real-server probe then recorded 2 `ERR_HTTP_HEADERS_SENT` mentions and 29 stack frames, 22 with absolute paths. Restored: none. The two tests named "does not attempt a second response" (`privateHardening.test.ts:346-387`, `389-430`) spy on `console.error`. **Inspection of the likely cause:** Express's default handler does not call it when the environment is `test` (`node_modules/express/lib/application.js:645-648`). Observe the second write or the forwarded error directly.
3. **C1 rejection** and **non-ready-case download disabling** have no detecting maintained test. Server-side download denial is separately protected.
4. **Inspection:** `workerLifecycle.test.ts:44-55` would pass if validation resolved instead of rejecting; assert the rejection. `57-66` checks requested options, not live limits. I found no maintained test for disconnect slot retention, event-loop availability or the default deadline.
5. Gaps behind NR-1 (no post-write 401/403/404) and NR-2 (no upload during a directory loss).

My earlier CR-2 (the suite did not detect any CV revert) is **largely resolved**: all seven CV reverts are now detected.

**Regression criteria:** each new or repaired test must be observed failing with its control removed.

### NR-7 — Needs triage. The full audit is not clean

**Executed**, in both the copy and the original repository; `package.json` and the lockfile are identical in both and at HEAD.

The full audit reports **9 vulnerabilities (4 moderate, 3 high, 2 critical)** involving `tinypool` (listed critical), `vitest` 2.1.8, `vite` 6.0.3, `esbuild`, `tsx` 4.19.2 and `@playwright/test` 1.49.1. `npm audit --omit=dev` reports 0. These do not conflict: the recorded audit results I found for E1-S2, including Codex's and my earlier one, use `--omit=dev`. The companion's bare "found 0 vulnerabilities" is that production-only run. An E0-S1 report noted that this scope excludes development findings; I found no E1-S2 record of a full audit. The six advisories whose dates I checked were published between February 2025 and October 2026, so they are not new during this cycle.

"Development-only" is not the same as unused: the project has no production start script, and `dev:api` runs through `tsx` and `dev:web` through Vite. I did **not** assess whether any advisory is reachable in this setup. P11 asks for audit checks, and AGENTS.md blocks completion on critical security issues. The owner and reviewers need a recorded triage: affected package, reachability, upgrade or accepted limitation. Do not run `npm audit fix --force` unreviewed; npm says it installs versions outside the stated ranges. This predates the correction set; the E1-S2 development-dependency change I know of is `@types/multer`.

### NR-8 — P4 observations (Inspection)

- `listCasesWithProvenance` is still optional (`casesClient.ts:33`). Without it, initial load (`CasesPage.tsx:108-116`) and delete-error refresh (`222-240`) publish unverified lists, and reconciliation returns early (`175`). The production client supplies it. Make it required and remove these branches.
- `openCase` (`157-166`) checks selection but has no request sequence, so an older response for a reselected case could overwrite newer documents.
- After a case delete whose refresh is unverified (`343-357`), the selection closes but the deleted case remains in the list.
- A failed `me()` during reconciliation (`180-182`, `505-507`) keeps the view. Record this as policy.
- `docs/security/threat-model.md:47` says 401/403/404 UI actions reconcile `/me`; NR-1 shows otherwise. Line `49` says every successful refresh compares with `/me` (successful mutations compare with the displayed identity) and that missing provenance fails closed (not on the fallback paths). Any claim that root and shard verification protects deletion needs the NR-2 qualification.

## 6. Assessment by area

| Area | Assessment | Basis and limits |
| --- | --- | --- |
| Storage-fault correction (CR-5, CR-5-R1) | Startup, reconcile and delete checks work in the tested no-upload cases, and are detected by maintained tests. **Not sufficient: NR-2.** New shutdown effect: NR-5 | Focused 19/19; mutations; probes. Not power-loss, multi-process or race proof |
| Single-file loss and transient stat | A verified missing file is still marked and deletable; a transient stat failure no longer persists `error` | Maintained and focused controls; adapted probe |
| Identity and response provenance | Server `accountId` comes from the session. Tested mismatched lists are not rendered; mismatch now ends the session. **NR-1 blocks** | Provenance 16/16; 42-revert run; NR-1 probe |
| Cross-account writes from a stale page | Old A token gets 403 for create, edit and delete under B | API probe. Upload and document delete: same middleware (Inspection) |
| Worker lifetime (CV-6) | Result settles after worker exit; early settlement is detected | CV retest 3/3; revert detected. Test weaknesses in NR-6 |
| Uploads | Ownership before parsing, stored-session recheck, no publication after 408, slot retention after a timed-out response, extension and truncation rules are each detected when removed. The guard also covers disconnect, but I found no maintained private test that disconnects | Reverts. Per-user, per-process limit; no global CPU or memory bound. Stalled-body cleanup depends on Node timeouts (**Unverified**) |
| Late responses (CR-6) | Behavior fixed in my real-server probe. **Unprotected** by maintained tests | NR-6 item 2 |
| Test isolation | E2E mode requires an isolated runtime; removal is detected; 56/56 in the copy | The guard acts on flags equal to `1` and does not reject an explicit owner-runtime path; the preflight is a string match (from earlier review) |

Earlier findings: CR-1 fixed (revert detected). CR-3 reporting fixed for 503 and unavailable refresh, but introduced NR-1. CR-4 behavior implemented by the builder, **not owner-decided**; part of it is unprotected. CR-5's probed cases fixed, bypassed by NR-2. CR-6 fixed but unprotected.

## 7. Preserved failing assertions: recommended test maintenance

**No waiver is declared. All three remain failures until the owner records a decision.** None justifies early worker settlement, early slot release or accepting truncated tails.

| Assertion (exact message) | Why it conflicts | Not reached after the failure | Replacement control |
| --- | --- | --- | --- |
| `e1-s2-corrective-worker.test.ts:26` — `expected undefined to be 64` | Reads native `resourceLimits` after exit; CV-6 requires exit first | 3000 ms default-deadline check, wait for exit, log | Stage-aware `e1-s2-cv-retest-worker.test.ts`; idle default-deadline test in the same original file |
| `e1-s2-codex.test.ts:118` — `expected 429 to be 201` | Expects a free slot while abandoned validation still runs | Second upload 201, three closes, row count 2 | Corrective API slot tests; a maintained disconnect test is still needed |
| `e1-s2-codex.test.ts:220` — promise rejected `UploadValidationError: invalid-upload` instead of resolving | Expects a truncated tail to be accepted | None; last assertion | Corrective G/H; maintained trailing-bytes test |

1. Keep these files byte-identical: no edit, deletion, `skip`, `it.fails`, retry or weaker timing.
2. Before calling any superseded, add its safety properties to maintained tests, including unreached checks, event-loop availability, the default deadline, disconnect slot retention and no publication after abort.
3. Keep a disposition register (I found none): assertion, exact message, reason, unreached checks, replacements, owner decision and date. Status until then: **proposed superseded**.
4. Keep reporting 27/28 and 9/11. If supersession is accepted, a gate may expect **only these named failures with these messages**. Any other or changed failure blocks.

My own two unchanged UI characterizations and two reconciliation probes now fail for the intended behavior changes in section 4. Keep them as history; do not count them as passes. The builder report (`E1-S2-builder.md:99`) discloses that an earlier e2e byte comparison was replaced with a download event plus API bytes; that does not satisfy the saved-file check.

## 8. Pending decisions

These are recommendations, **not approvals**.

| Decision | Recommendation |
| --- | --- |
| Browser artifact bytes | **Blocked; do not waive.** EPERM also occurs without the app, so this environment neither passes nor fails the app. Close it in a supported environment, or by manual SHA-256 comparison of one fictional file in a disposable `PSC_RUNTIME_DIR` with both `PSC_PRIVATE_*` variables cleared (steps in my earlier report). Repeat if download code changes |
| Historical TDD exceptions | Record a permanent, enumerated exception or reject it. Later passing tests cannot repair ordering. Require observed RED for NR fixes |
| Concurrency value 2 | Reasonable for a fictional local demo, described as per-user and per-process only |
| Node minimum | Call `>=22.2.0` "declared, untested". Only 26.13.0 on Windows was run. Run the suites on the floor before claiming support |
| PDF boundary | Accept only in writing: rejects detected truncation; cannot detect a file cut at an earlier valid save. Scanner-output compatibility is unverified |
| Key-directory durability | `crypto.ts:109-135` syncs the file, not the directory; the existing-file path syncs neither (Inspection). Acceptable only for disposable fictional data with that limit; decide in E1-S3 |
| Readiness and quota | Treat `/api/ready` as initialization readiness only. Quotas are local best-effort |
| Legacy migration | Scope separately. Do not delete or hand-stamp the existing store. By code, a pre-identity store returns private 503; I did not open it |
| License | No tracked root LICENSE. Direct production dependencies declare permissive licenses with license files (installed metadata). Transitive dependencies and BMAD or skill assets are unchecked. Not legal advice; owner chooses |
| Publication | Before any push: decide on the 6 published files, the unpushed seventh, untracked evidence selection or redaction, and commit-email metadata. Current-tip redaction does not remove history. Cleanup remains proposed and unexecuted. Routine checkpoint pushing should pause for NR-4 |
| Dependency advisories | Triage NR-7 and record the result |
| CR-4 sign-out on mismatch | Matches my earlier recommendation; needs an owner or coordinator decision |
| `caee540` independence | See section 2 |

## 9. Story criteria

| Criterion | Disposition |
| --- | --- |
| P1, P2 | Met in the tested local server scope |
| P3 | Tested limits pass; PDF residual pending |
| P4 | Ciphertext and canary controls pass; NR-5 writes stack paths on a fault |
| P5 | API and crypto tests pass; **saved-file bytes unverified** |
| P6, P7, P8 | **Not met: NR-2** (P8 also NR-5) |
| P9 | **Not met: NR-1** |
| P10 | **Not met: NR-1** (expired session does not return to sign-in); artifact unverified |
| P11 | **Open:** NR-3, NR-6, NR-7, preserved failures, artifact, TDD, independence and owner gates |

No risk is closed. This review supports no hosted, real-user, real-record, recovery, legal-accuracy or production claim.

## 10. Unresolved gates

1. NR-1 and NR-2 fixes, with observed RED, then Codex retest on a new manifest and re-review of changed paths.
2. NR-3 historical evidence restored.
3. NR-4 and the wider publication decision, before any push.
4. NR-5 and NR-6 fixed or recorded by the owner as open limitations.
5. NR-7 triage.
6. Browser artifact bytes.
7. Disposition of the three preserved failing assertions.
8. Historical TDD exceptions.
9. No real multi-tab account-switch reproduction.
10. `caee540` review independence.
11. Concurrency, Node minimum, PDF boundary, key-directory durability, readiness and quota, migration, license, CR-4 policy.
12. Owner approval and merge decision. **Neither has been given.**

## 11. Handoff to DeepSeek, through the coordinator

I sent nothing to anyone. For each behavior fix, first observe a failing maintained test.

1. **NR-1** (blocking), using the criteria in section 5.
2. **NR-2** (blocking), including the API sequence upload, delete, delete.
3. **NR-3:** restore historical totals; append new ones. No publication action.
4. **NR-5**.
5. **NR-6:** repair the vacuous document assertion and the two late-response tests; add the missing protections. Show each failing without its control.
6. Correct the claims in NR-8; address its code points or record them as limitations.

NR-4, NR-7 and section 8 go to the owner and coordinator. Preserve all earlier reports, tests and failures.

**Stopped at review. No owner approval or E1-S2 completion is claimed.**
