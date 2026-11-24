# E1-S2 builder evidence — private cases and encrypted documents

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
| Cases UI | Mostly implemented before UI tests; **one genuine RED** for initial 401 private load (`1 failed` → **7 passed**). Other UI/client tests are honest post-implementation regression evidence. | **7 page + 4 client passed** |
| E2E private flow | Written after implementation; **no RED claimed** | **6 passed** (3 per desktop/narrow) |

The route/UI/E2E ordering is a process gap and is stated rather than fabricated. The crypto, store, upload and initial-401 behaviors had observed RED.

## Final checks

| Command | Result |
| --- | --- |
| `npm test` | **293 tests / 30 files, 0 failed** |
| `npm run test:e2e` | **56 passed** (desktop + narrow Chromium) |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | **8 passed** |
| foundation/SDK/Mira preserved probes | **6 + 3 + 2 passed** |
| delayed-cookie race probe | **1 passed** (`initialResponses:1`, status 201) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; existing SDK chunk warning only |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed / 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |

E2E uses `PSC_E2E_NO_KEY=1` and relaxed auth limits; production throttles are covered by API tests. One earlier full E2E run had a narrow private **timeout/flaky downloaded-stream byte comparison**; the test was changed to verify the browser download event plus the authenticated API byte response, and the subsequent full run passed **56/56**. The first failure is recorded rather than hidden.

## Key/security limitations

- No E1-S3 backup/recovery rehearsal, retention policy or secure-erasure guarantee. Live deletion is not backup deletion.
- Key loss makes data unrecoverable; no recovery/escrow or HSM. Key creation is a local single-process fresh-store path.
- DB+filesystem are not a single transaction; crash/reconciliation tests cover controlled faults, not every power-loss or multi-process race.
- Quotas are pre-publication checks without a serializable multi-process lock.
- Loopback HTTP/no Secure cookie, per-process limiters, no hosted TLS/secret manager.
- No malware scanner, OCR/extraction, preview, sharing, AI or legal/court features. Structural validation is bounded but not proof of safety.
- No independent Codex/Claude gate or owner merge approval. The `.vscode/` owner-local directory remains untracked.

## Handoff

- Review the spec, ADRs, migrations, crypto envelope/key handling, blob lifecycle, validation, deletion/reconciliation, auth guard reuse, UI and this evidence.
- Codex should attack cross-owner IDs, multipart/parser limits, tampered/swapped envelopes, wrong/missing keys, DB/fs faults, deletion retries, restart/reconciliation and session expiry/revocation.
- Actual Claude review remains separate and may challenge the crypto/storage design. Owner decides E1-S2 merge after both gates. No merge, push or deployment occurred.
