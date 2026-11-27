# E1-S2 builder evidence — private cases and encrypted documents

> **Evidence-integrity restoration — November 27, 2026.** The “Final checks” and CV-cycle totals in this historical report were overwritten during later work with the then-current suite totals. They have been restored from Git and the preserved independent reports; see `E1-S2-history-restoration-2026-11-27.md`. Current totals belong in the dated later sections, not in earlier run records.

Builder: DeepSeek. Status: **IMPLEMENTED AND BUILDER-VERIFIED — STOPPED FOR CODEX INDEPENDENT TESTING AND ACTUAL CLAUDE REVIEW.** This is not independent verification, a security certification or merge approval. Fictional data only. No real records, uploads, private cases, hosted deployment, paid service, external message or live provider session was used. The real `.env` was not read or disclosed.

## Identity and base

- Story: `docs/stories/E1-S2-private-cases-encrypted-documents.md`; branch `feature/e1-s2-private-documents`; base local `main` `e2edea5a11ba250b881449acaa951844e38abba0`.
- Spec: `_bmad-output/implementation-artifacts/spec-e1-s2-private-documents.md`.
- ADRs: `docs/adr/0003-private-storage-and-key-management.md`, `docs/adr/0004-upload-validation-and-limits.md` (written before behavior implementation).
- BMAD 6.12.4 renderer run once for this invocation; the printed workflow was followed. Runtime Node **v26.13.0**, npm **11.20.0**, Windows.
- Existing auth, foundation, health and Mira code preserved. No merge, push, deploy, external account or live provider/court action.

## Delivered

- Owner-isolated case CRUD: create/list/read/edit/live-delete, owner derived only from the session, unknown/foreign IDs generic 404, no owner/role/blob/key input trusted.
- Encrypted document lifecycle: one-file PDF/PNG/JPEG upload, content detection + structural limits, encrypted BLOB + encrypted metadata, integrity-checked download, confirmed live deletion.
- SQLite migrations in the existing auth DB; opaque IDs, owner/status/random blob name/technical counters only in plaintext. Case labels/jurisdictions, filenames, MIME, size and SHA-256 are inside AEAD metadata.
- AES-256-GCM envelope (`node:crypto`), fresh 12-byte nonce, 16-byte tag, keyId/version parsing, AAD binding owner/case/document/version. Separate metadata/blob subkeys derived with HKDF from a 32-byte master key.
- Key file `runtime/keys/master-key.json` (mode 600 where supported), data under `runtime/private`; both git-ignored. A key-check record detects a wrong/corrupt key at startup; missing key with existing data fails closed; no silent regeneration.
- Staged encrypted writes, fsync, atomic rename, ready update; failed write/rename leaves no ready row; startup reconciliation removes staging/pending/orphan managed files and marks missing ready blobs error; live deletion denies downloads while cleanup is failed/pending.
- Reusable expiry-aware `auth.requireAuth` plus CSRF/exact-Origin/loopback-Host guards for private routes; absolute/idle/revoked/disabled-session tests.
- Minimal `/cases` UI: case list/detail/create/edit, upload, metadata, download, confirmed document/case delete, keyboard/narrow states and session-ended return to sign-in. Account link updated; no upload/extraction/legal/AI claim.

## Libraries and probes

- Added exact pins: `multer@2.5.0`, `file-type@22.3.0`, `pdf-lib@1.17.1`, `image-size@2.1.0`; dev `@types/multer@2.3.0`. `npm audit --omit=dev` reports **0 vulnerabilities**.
- Content type is detected from bytes, not browser MIME/extension. PDF: 1–50 pages, unencrypted/parsable via `pdf-lib`. PNG/JPEG: positive dimensions ≤12,000 px and ≤40 MP via `image-size`. File cap 5 MiB, one file, bounded multipart fields/parts, 30-second upload window. Filename safety rejects path/control/unsafe forms even though it is never a storage path.
- No antivirus or full decoder sandbox is claimed; structural parsers are not a malware guarantee.

## TDD evidence (honest gaps included)

| Behavior | RED observation | GREEN observation |
| --- | --- | --- |
| AEAD/key envelope/key-check behavior | `crypto.test.ts` against stub → **8 failed** | **8 passed** |
| SQLite migrations, encrypted metadata, ownership, restart/deletion/faults | `privateStore.test.ts` → **6 failed / 2 passed** | **8 passed** (after test corrections and fsync compatibility fix) |
| Upload content/limits/traversal | `uploadValidation.test.ts` → **9 failed** | **9 passed** |
| Private API routes/auth/CSRF/validation/tamper/faults | **No valid RED claimed:** route tests were written after the initial route implementation. `npm test` green is regression evidence, not historical TDD for routes. | **12 passed** |
| Cases UI | Mostly implemented before UI tests; **genuine REDs** for initial 401 private load and for a late-upload success message under a newly selected case (`1 failed` each). Other UI/client tests are post-implementation regression evidence. | **16 page + 4 client passed** |
| E2E private flow | Written after implementation; **no RED claimed** | **6 passed** (3 per desktop/narrow) |

The route/UI/E2E ordering is a process gap and is stated rather than fabricated. The crypto, store, upload, initial-401 and stale-upload-message behaviors had observed RED. The concurrency tests are post-implementation regression: their first harness attempt timed out because supertest requests had not been started, which was a test-setup failure rather than app RED.

## Independent verification of Claude review fixes (`caee540`)

I did not accept the review's claims on trust. I read the `caee540` diff, the hardening/UI tests and the preserved `.setup/codex-private-independent.test.ts`, ran the probe unchanged, and re-ran the relevant suites. The probe passed **6/6**; its six checks cover logged-out pending upload, truncated PNG, 408-before-publication, junction escape, non-managed-file preservation, and two-account/tamper behavior.

Verification disposition for the 18 listed findings:

- **1–3 (session/logout/disable/408):** code re-reads the stored session and account before publication, destroys the request session when the stored one is gone, and checks `headersSent`/`destroyed`; all three behaviors are covered by hardening tests and the probe.
- **4–6 (reconciliation/key reset):** cleanup uses `lstat`-based directories, managed name patterns and only direct shard entries; unmanaged files and junctions are preserved; a database without a key check with rows/blobs fails closed. Tests cover junctions, unmanaged names and reset/no-key-check cases.
- **7–8 (unfinished case/pending document):** download requires a `ready` parent; pending documents are filtered from list and detail. Hardening tests cover deleting/error parents and pending rows.
- **9–11 (truncation, extension, UTF-8):** PNG CRC/IEND, JPEG marker/scan/EOI and PDF trailing-EOF checks are present; filename extension must match detected content (case-insensitive `.pdf/.png/.jpg/.jpeg`); multipart filenames decode as UTF-8 and bidi/C1 controls are rejected. Tests cover truncation, mismatched extensions, bidi and non-ASCII names.
- **12–14 (ownership/no-store/multipart):** case ownership runs before multipart parsing (spy proves validation not called); all private JSON responses get `no-store`; malformed multipart becomes generic 400. Tests cover each.
- **15–18 (UI selection/session/deletion):** tests cover reset edit fields, stale document loads, chosen-file reset, stale upload result, session-ended/different-account handling and incomplete deletion. My additional test found that a late upload could still show “Document uploaded…” under a newly selected case; I fixed it with a **RED→GREEN** guard and added the assertion to the existing selection test.

**Residual disagreement/limit:** the review's own open item is still true — a PDF truncated after an earlier incremental-save `%%EOF` can pass the trailing-marker check. Structural validation remains a bounded check, not a complete decoder or malware scan. I did not claim otherwise. The review's TDD history was not independently witnessed; only current behavior and the unchanged probe were independently executed here.

## Corrective cycle — Claude final review (`3600dd6`)

Claude's final review requested changes F1–F11. The corrective implementation and evidence are in `E1-S2-corrective-2026-11-25.md`. Summary: PDF parsing moved to a 64 MiB/3s worker; store identity binds DB/data dir; missing required blob is a deletion error; ambiguous uploads reconcile and do not advise retry; upload slots represent actual work lifetime; all late responses recheck session/cookie; raw bidi controls replaced with escapes + source scan; PDF final-EOF rule tightened; key creation exclusive/fsynced; `/api/ready` distinguishes readiness; quota counts persisted rows. Browser tests now use an isolated runtime; owner runtime metadata was unchanged. The browser artifact-byte gate remains blocked.

## CR-5-R1 directory-availability correction

Codex focused retest found reconciliation still treated a missing blob root/shard as individual-file loss. Maintained RED: root and shard tests failed because reconciliation did not throw and marked intact docs `error`. Reconciliation now verifies root and shard directories with `lstat`; unavailable directories throw closed without row mutation, while verified file `ENOENT` remains missing/deletable. Focused independent suite is **19/19**; maintained suite **376/34**, API **227/20**, browser **56/56**. GitHub report corrected: six tracked files on both published refs contain absolute owner paths; main has 26 commits, published feature 29, local HEAD 32. No history rewrite or publication was performed.

## CV-3-R2 corrective follow-up (reconstructed wording; numeric facts from Codex reports)

Codex's provenance retest found five successful-mutation paths (create/edit/upload/document-delete/case-delete) that reloaded cases without checking provenance. Prospective RED: provenance suite **11 passed / 5 failed**, all five logging `displayedBCase:true`. The builder added a single verified-list boundary, made `reloadSelected` check provenance and request generation before `setCases`/`setDocuments`, moved case-delete to the same helper, and retained known state with a non-verification message when provenance is unavailable/mismatched. Provenance suite now **16/16**; seven original CV assertions **7/7**; CV-3-R1 retest **3/3**. Codex independent retest observed maintained **348/32**, API **213/18**, browser **56/56** this run. The later 34-file counts include additional maintained files; the exact 32→34 cause is not reconstructed. Original independent suite remains **9/11**; supplementary remains **27/28** due the preserved post-exit worker assertion.

## CV corrective cycle — Codex verification (`03b1bb8`) (reconstructed wording; numeric facts from `E1-S2-corrective-cv-2026-11-25.md`)

Codex's supplementary probes confirmed six issue groups. Builder captured prospective RED (10 failed / 18 passed in the repository; the seven CV assertions plus fixture-only startup/legacy setup failures) and fixed: E2E mode/runtime and inherited narrow-path guards; lstat-consistent deletion; `/me` before ambiguous refresh; unexpected-exception late-session recheck; selection-scoped definite upload errors; and worker-exit acknowledgement before validation settles. Targeted CV probes pass **7/7**. The supplementary full suite is **27/28** in a disposable copy; the remaining failure reads native `worker.resourceLimits` after exit, which Node clears, and directly conflicts with CV-6. It is preserved, not edited. Maintained suite was **374/34**, API **225/20** for this CV run; this run's isolated browser suite passed **56/56**, with Codex's prior 54/2 navigation run retained as a reproducibility gap. Original independent suite remains **9/11**. Browser artifact bytes remain **BLOCKED**.

## Proposed settings (pending owner approval)

- **Concurrent uploads:** per-user in-memory limit **2**; third concurrent upload returns generic `429 {error:"too-many-uploads"}` with `Retry-After: 1`; slots represent actual parsing/validation work and release when that work terminates, not on response finish/disconnect. Tests cover the limit, 408-held slots, release, and a second account remaining unaffected. Recorded in ADR-0004 D3. This is per-process, not distributed.
- **Extension policy:** retained the stricter rule that `.pdf/.png/.jpg/.jpeg` must match detected content; mismatches/missing extensions are rejected. Existing tests cover this.
- **Node engine:** `package.json`/lockfile now require **Node >=22.2.0**, because PNG CRC validation uses `node:zlib.crc32` (added in Node 22.2). Runtime remains Node v26.13.0.

## Final checks

| Command | Result |
| --- | --- |
| `npm test` | **347 tests / 32 files, 0 failed** |
| `npm run test:api` | **213 passed / 18 files** |
| `npm run test:e2e` | **56 passed** (desktop + narrow Chromium), isolated runtime |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | **8 passed** |
| foundation/SDK/Mira preserved probes | **6 + 3 + 2 passed** |
| private preserved probe / delayed-cookie race | **6 / 1 passed** |
| preserved Codex independent probe | **9/11 passed**; 2 stale assertions documented |
| independent browser artifact bytes | **BLOCKED** (`readFileSync` EPERM; no-app control reproduced) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; existing SDK chunk warning only |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed / 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |

E2E uses `PSC_E2E_NO_KEY=1`, relaxed auth limits and `PSC_RUNTIME_DIR=test-results/e2e-runtime-<pid>`; production throttles are covered by API tests. One earlier full E2E run had a narrow private **timeout/flaky downloaded-stream byte comparison**; the test was changed to verify the browser download event plus the authenticated API byte response. Browser **artifact-byte** integrity remains unverified: the independent download probe failed with EPERM on `readFileSync`, and a no-app control reproduced the Windows limitation. It is not marked passed.

## Key/security limitations

- No E1-S3 backup/recovery rehearsal, retention policy or secure-erasure guarantee. Live deletion is not backup deletion.
- Key loss makes data unrecoverable; no recovery/escrow or HSM. Key creation is exclusive/fsynced but directory fsync is best-effort on Windows.
- DB+filesystem are not a single transaction; crash/reconciliation tests cover controlled faults, not every power-loss or multi-process race.
- Store identity is new; older owner data without a marker is not auto-adopted and needs owner-approved migration. This is fail-closed, not data recovery.
- Quotas are pre-publication checks without a serializable multi-process lock.
- Ambiguous uploads reconcile the list but have no durable idempotency key; a user who ignores the warning can create a duplicate.
- Loopback HTTP/no Secure cookie, per-process limiters, no hosted TLS/secret manager.
- No malware scanner, OCR/extraction, preview, sharing, AI or legal/court features. Structural validation is bounded but not proof of safety; exact truncation at an earlier valid incremental-save boundary remains undetectable.
- Browser artifact-byte verification is blocked on Windows; only the download event and API bytes were checked.
- No independent Codex retest/fresh Claude review or owner merge approval. The `.vscode/` owner-local directory remains untracked.

## Handoff

- Review the spec, ADRs, migrations, crypto envelope/key handling, blob lifecycle, validation, deletion/reconciliation, auth guard reuse, UI and this evidence.
- Codex should attack cross-owner IDs, multipart/parser limits, tampered/swapped envelopes, wrong/missing keys, DB/fs faults, deletion retries, restart/reconciliation and session expiry/revocation.
- Actual Claude review remains separate and may challenge the crypto/storage design. Owner decides E1-S2 merge after both gates. No merge, push or deployment occurred.
