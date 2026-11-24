---
title: 'E1-S2 private cases and encrypted documents'
type: 'feature'
created: '2026-11-24'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0844251'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/process/BMAD_STABLE_TDD.md'
  - '{project-root}/docs/planning/RISK_REGISTER.md'
  - '{project-root}/docs/adr/0003-private-storage-and-key-management.md'
  - '{project-root}/docs/adr/0004-upload-validation-and-limits.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Authenticated fictional users still cannot organize case evidence; a login screen and hidden filenames are not storage security.

**Approach:** Add owner-isolated private case CRUD and validated encrypted document upload/list/detail/download/live-delete using SQLite metadata plus separately encrypted blobs, AEAD/AAD, external local keys, staged atomic publication and expiry-aware authorization. Preserve auth/foundation/Mira.

## Boundaries & Constraints

**Always:** fictional data; owner from session only; per-resource + parent ownership; expiry-aware auth guard; CSRF/exact Origin/Host on mutations; authenticated encryption with AAD; encrypted metadata; keys outside Git/DB/blobs/browser/logs; validated content; staged encrypted writes; generic non-disclosing errors; live deletion; honest failure/reconciliation; TDD RED before behavior.

**Never:** real records; OCR/extraction/AI/legal/court/sharing/admin/hosted; inline preview; user filename as path; plaintext temp/journal/logs; success on incomplete write/delete; key regeneration over existing data; backup/erasure guarantees; merge/push.

## I/O & Edge-Case Matrix

| Scenario | Input/State | Expected Output/Behavior | Error Handling |
|---|---|---|---|
| CASE_CREATE/LIST/READ/EDIT | owner session, valid label/jurisdiction | owned case; restart persists; metadata decrypted only for owner | generic 400/404; no owner field accepted |
| CASE_DELETE | owner + CSRF + confirm | child blobs/rows removed; no download afterward | incomplete cleanup → error/pending, retry; no false success |
| UPLOAD_OK | PDF/PNG/JPEG ≤5MiB, one file | encrypted blob + encrypted metadata; 201 detail | no filename/path/hash plaintext |
| UPLOAD_BAD | spoofed MIME/ext, corrupt/truncated/encrypted PDF, oversize/multiple/parts, traversal filename, dimensions/pages over cap | generic 400/413; no publication | no plaintext temp/orphan ready row |
| CROSS_USER | B requests A case/doc IDs or altered parent | consistent 404; no existence/bytes leak | server derives owner |
| DOWNLOAD | owner, ready blob | byte-identical attachment; tagged/verified | tamper/wrong key/missing → generic failure, zero plaintext |
| EXPIRY/REVOKE | expired/revoked/disabled session | 401/return to sign-in; no private data | revalidate before commit/disclosure |
| STORAGE_FAULT | DB/write/rename/disk/lock failure | no success/incomplete row; scoped cleanup | retry/reconcile; no broad delete |
| KEY_LOSS | missing/wrong/corrupt key with data | fail closed; no regeneration/destruction | generic unavailable |
| RESTART | same key/data/store | cases/docs survive, integrity/owner preserved | pending/orphans hidden/cleaned |
| UI | narrow/keyboard; pending/failure | case list/detail/create/edit/upload/download/delete; no false saved badge | session-ended state; honest retry |

</frozen-after-approval>

## Code Map

- `apps/server/src/auth/auth.ts` -- expose reusable expiry-aware `requireAuth`, CSRF, loopback Host and exact-Origin middleware; preserve startup single-flight and auth behavior.
- `apps/server/src/private/` -- migrations, key manager, AEAD envelope, encrypted metadata store, blob storage, upload validation, case/document routes.
- `apps/server/src/app.ts` / `main.ts` -- optional private dependency after auth; load config/key only at startup; no key logging.
- `apps/web/src/cases/` -- minimal authenticated case/document page/client; link from account page when signed in.
- `tests/e2e/private-documents.spec.ts` -- two contexts, upload/download/tamper/delete/expiry/narrow.
- Existing `accountClient`/account UI preserved; existing request budgets/auth startup behavior unchanged.
- `docs/adr/0003...`, `docs/adr/0004...`, `docs/evidence/E1-S2-builder.md`, threat/README/risk updates.

## Tasks & Acceptance

**Execution:**
- [x] `privateCrypto.test.ts` -- AEAD round-trip, AAD owner/case/doc/version binding, nonce freshness, tamper/truncation/wrong key/keyId; RED **8 failed** then implement crypto/key manager.
- [x] `privateStore.test.ts` -- migration, case/doc create/read/update/list/ownership, encrypted metadata at rest, restart, deletion, reconcile/orphans/pending, storage faults; RED **6 failed / 2 passed** then implement/refactor to **8 passed**.
- [x] `uploadValidation.test.ts` -- PDF/PNG/JPEG valid + spoof/corrupt/encrypted/oversize/limits/filename/dimensions; RED **9 failed** then implement **9 passed**.
- [x] `private.routes.test.ts` -- auth/expiry/CSRF/Origin, case CRUD, upload/list/download/delete, two owners, foreign IDs, canaries, tamper/wrong key, faults, confirmations; **post-implementation regression, no valid RED claimed**; **11 passed**.
- [x] `casesClient.test.ts` + `CasesPage.test.tsx` -- lifecycle, pending/errors, session-ended, no false saved badge, keyboard/narrow; one genuine initial-401 RED; other UI/client checks are post-implementation evidence; **7 page + 4 client passed**.
- [x] `tests/e2e/private-documents.spec.ts` -- two-account isolation, upload/download/delete, narrow; **post-implementation, no E2E RED claimed**; **6 passed**.
- [x] ADRs/spec/evidence/threat/README/risk; full checks and preserved probes.

**Acceptance Criteria:**
- [x] Given owner session, when creating/reading/editing/listing/deleting cases, then only that owner can; restart preserves; foreign IDs are 404.
- [x] Given valid PDF/PNG/JPEG, when uploading, then only ciphertext + encrypted metadata persist; download is byte-identical and integrity-checked.
- [x] Given another owner, forged IDs, invalid/expired session, CSRF/Origin failure, then no private data/bytes are disclosed.
- [x] Given spoofed/corrupt/oversized/multi-part/traversal uploads, then generic rejection and no published row/plaintext temp.
- [x] Given tampered blob/metadata, wrong/missing key or swapped AAD context, then generic failure with zero plaintext.
- [x] Given storage fault/restart/pending upload/deletion, then no success before durable completion; reconciliation is scoped and hidden; no resurrection.
- [x] Given case/document deletion, then live bytes/rows removed only by owner/CSRF/confirmation; downloads denied; no backup-erasure claim.
- [x] Given `/cases` UI, then keyboard/narrow lifecycle works; expired session returns to sign-in; pending/failure states honest.
- [x] Given full checks, then maintained/API/browser/type/build/secrets/audit and preserved probes pass; evidence maps requirements and risks.

## Implementation Notes

- Storage: existing auth SQLite DB + additive migrations; AES-256-GCM `node:crypto`; HKDF-derived metadata/blob keys; key-check row; three-component envelope (magic/version/keyId/IV/tag/ciphertext) with AAD owner/case/document/version.
- Key/data defaults: `runtime/keys/master-key.json` and `runtime/private`; tests use isolated temp stores. Key creation is allowed only for a fresh store; missing/corrupt/wrong key with data fails closed.
- Upload: `multer` memory storage with one file/part/field limits, `file-type` detection, `pdf-lib` PDF checks, `image-size` dimensions, filename rejection, 5 MiB cap; no user filename/path used for storage.
- Publication: ciphertext staging + fsync + pending row + rename + ready update; failures clean up and do not return success. Reconciliation handles staging/pending/orphan files and missing blobs within managed roots.
- Auth: exported expiry-aware `requireAuth` and CSRF/Origin/Host guards from the existing auth module; no `req.isAuthenticated()`-only route.
- Test ordering gap: route/UI/E2E tests were mostly written after implementation; only crypto/store/upload and one UI 401 path have genuine RED. This is recorded in builder evidence rather than claimed as TDD history.

## Spec Change Log

- No approved product-scope change. Exact limits/key design are builder proposals recorded in ADR-0003/0004 for independent/owner review.

## Review Triage Log

- No independent E1-S2 review yet.
- One earlier full E2E run had a narrow private timeout caused by browser downloaded-stream byte verification; the test now verifies the download event plus authenticated API bytes, and the clean run passed 56/56. Recorded in builder evidence.

## Verification

**Actual results (2026-11-24, builder):**
- `npm test` — **293 tests / 30 files, 0 failed**.
- `npm run test:e2e` — **56 passed** (desktop + narrow).
- Preserved probes: auth **8**, foundation **6**, SDK **3**, Mira **2**, race **1** — all passed.
- `npm run typecheck` — exit 0.
- `npm run build` — exit 0; existing SDK chunk-size warning only.
- `npm run verify:secrets` — exit 0; `npm run test:secrets` — **7 passed**.
- `npm audit --omit=dev` — **0 vulnerabilities**.
- **Independent Codex testing and actual Claude review remain PENDING; no merge, push or deployment.**
