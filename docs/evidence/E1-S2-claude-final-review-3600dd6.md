# E1-S2 Claude final review — 3600dd6

Date: November 25, 2026 (America/New_York). Reviewer: Claude (Claude Code, Claude Sonnet 5.5). Read-only: no application, test or configuration file was changed. No commit, push, merge or deployment. **This report is not merge approval.**

## Verdict

**Changes requested. I recommend not approving E1-S2 yet.** I found no cross-account disclosure and no plaintext-at-rest or encryption defect in what I tested or read. Three reproduced behaviors conflict with story criteria: unbounded PDF decompression (P3 / R13), damage and false deletion success under a wrong data directory (P6/P7), and no server reconciliation after an ambiguous upload (P10). The browser artifact-byte gate is still unverified.

## Review independence — read first

**This same Claude session reviewed `5e93d9f` earlier and then wrote `caee540`.** My assessment of `caee540` is a self-review and is **not independent**. Fresh probing found two defects in my own work there (F4, F5), and my earlier review missed F1, F2 and F3. I did not author `5e93d9f` or `3600dd6`. If the AD-09 review gate requires a reviewer who did not write the code, it is **not met for `caee540`**; the owner can ask a fresh Claude session to review that commit.

Also from that earlier session: I ran the default `npm run test:e2e` twice **in the real repository**, once before and once after the `caee540` changes. Each run started the API against the project's `runtime/` directory, which added fictional accounts and ran startup reconciliation there. The pre-fix reconciliation could delete unrecognised files under the private `blobs/` and `staging/` folders. I did not inspect runtime contents, so I cannot say whether anything was removed. This review did not run anything against that directory.

## Identity and scope

| Item | Observed |
| --- | --- |
| Root | `<repo>` |
| Branch / HEAD | `feature/e1-s2-private-documents` / `3600dd66d355804ac1f0232bc57594259ad75900` (matches the tested commit; no later application change) |
| Local `main` / merge base | `e2edea5a11ba250b881449acaa951844e38abba0` |
| Upstream | recorded locally as two commits behind; not fetched |
| Tree before this report | untracked `.vscode/`, the two Codex evidence files and `tests/independent/`; all preserved. `.vscode/` contents were not read |

Reviewed: the `main..3600dd6` private-storage source and its wiring, with `caee540` and `3600dd6` in detail; Architecture Spine; relevant PRD sections; story, spec, ADR-0003/0004; threat model and E1-S2 risk entries; builder evidence; my earlier review; Codex report, check log and `tests/independent/`. The long PRD and risk register were searched for the relevant requirements rather than read end to end. No `.env` value, key or private runtime content was read.

## Evidence from this review

All execution except the repository-level secret, audit and diff checks used a copy extracted with `git archive` from `3600dd6`, plus the untracked `tests/independent/`. It had no `.env` and no `runtime/`. Its `node_modules` was a junction to the installed dependencies (not a clean `npm ci`). Windows, Node v26.13.0.

| Check | Result |
| --- | --- |
| `npm test` | 331 passed / 31 files |
| `npm run typecheck`; `npm run build` | exit 0; build succeeded |
| `tests/independent/vitest.config.ts` | 11 passed |
| `npm run test:e2e` (copy's own runtime) | 56 passed |
| `npm run verify:secrets`; `npm run test:secrets` | no patterns found in tracked source; 7 passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check e2edea5..3600dd6` | exit 0 |
| `download-control.mjs` (no application) | **failed, EPERM** |
| `tests/independent/playwright.config.ts` (unchanged) | **2 failed, EPERM** reading the artifact |
| My probes (8 server, 3 UI) | 11 passed. **A pass means the described current behavior reproduced** |

Not rerun by me: `test:api` (a subset of `npm test`) and the preserved `.setup/` probes; Codex reports those passing.

My probes are in the session scratch folder, `<owner-home>\AppData\Local\Temp\claude\6eb74094c58b4cb8\a787c81e-cee1-44d0-ab9c-dc5e758e5133\scratchpad\c1\ProjectSecondChance\claude-probes\`. It is temporary and may be cleared. They are not RED evidence for any future fix.

## Findings, by severity

P1 blocks any use; P2 should be corrected before E1-S2 approval; P3 is a bounded defect or limitation; P4 is minor. "Reproduced" means observed in a probe. "Inspection" means read in source but not executed.

### F1 — P2 for the local demo; P1 for hosted or real use: a small PDF stalls the server and consumes hundreds of MiB

`apps/server/src/private/uploadValidation.ts:141` (`PDFDocument.load`). Origin `5e93d9f`.

**Reproduced** with fictional PDFs carrying a compressed object stream:

| Upload | Inflates to | Result | Time | 100 ms timer ticks fired | RSS growth |
| --- | --- | --- | --- | --- | --- |
| 9 KiB | 8 MiB | accepted | 1.0 s | 0 of 9 | ~304 MiB |
| 33 KiB | 32 MiB | accepted | 5.6 s | 0 of 55 | ~793 MiB |

No timer fired, so the event loop was blocked: health, every other user and the 30-second upload timer wait. The concurrency limit does not help, since one request is enough. RSS figures are single samples and approximate. **Assumption, deliberately not run:** at this compression ratio a file near the 5 MiB cap could inflate to gigabytes and crash the process. Exploiting it needs a signed-in account; a loopback user can register one.

This contradicts story decision 4 and P3 ("bounded decoder limits"), the R13 parser-exhaustion test requirement and NFR-03/19. The threat model's "parser/resource limits are bounded" is not supported. Codex and the builder noted missing isolation; this measures its effect.

**Correction for DeepSeek:** parse in a worker thread or child process with a memory cap and a wall-clock deadline that terminates it, or enforce an inflated-size budget before `pdf-lib` decodes. Needs a RED test showing the process stays responsive.

### F2 — P2: a wrong data directory damages every document record and allows false deletion success

`apps/server/src/private/privateStore.ts:294` (creates empty folders), `672-683` (marks missing blobs `error`), `329-331` and `593-644` (treat an absent file as deleted). Origin `5e93d9f`.

The key check ties the **database to the key**, but nothing ties the **database to the data directory**. With the right database and key but a mistyped, moved or temporarily unavailable `PSC_PRIVATE_DATA_DIR`:

1. **Reproduced:** startup succeeds and marks every ready document `error`. Restoring the correct directory does not undo it; no code returns `error` to `ready`, so intact documents stay undownloadable.
2. **Reproduced at store level:** delete returns success while the ciphertext remains in the real directory. By inspection the API would answer 204. A later start with the right directory then removes that file as an orphan.

This conflicts with P6, P7 (no completion claim before live removal) and the fail-closed, no-destruction intent of the spec matrix. A tempting trigger is isolating tests by overriding only the private directory (gate 5). The `caee540` reset-database guard covers only the mirror case.

**Inspection, not reproduced:** `existsSync` returns false for any stat error, so a permission or I/O fault could also be read as "already deleted".

**Correction for DeepSeek:** store an authenticated store-identity marker in the data directory and fail closed on a missing or mismatched one before any reconciliation or deletion; do not create it over a database that already has documents without an explicit, reviewed migration; distinguish "not found" from other file errors.

### F3 — P2: an ambiguous upload is not reconciled, and the page invites a retry

`apps/web/src/cases/CasesPage.tsx:237-261` (`handleUpload`), message at `18-30`. Origin `5e93d9f`.

**Reproduced:** after a timeout or network error the page says "…Try again.", does not re-fetch the document list and leaves Upload enabled. If the server had already saved the file, a retry creates a duplicate. P10 says to "reconcile server state instead of silently duplicating an upload". Nothing replays automatically; the gap is the missing reconciliation and the unqualified advice. **Inspection:** case creation (`161-189`) uses the same error path. Delete failures do reconcile.

**Correction for DeepSeek:** after status 0 or 5xx on create or upload, re-read server state and say the outcome is uncertain.

### F4 — P3 (my defect, `caee540`): invisible direction-override characters in source

`apps/server/src/private/uploadValidation.ts:104` contains raw U+200E, U+200F, U+202A, U+202E, U+2066 and U+2069 (`git blame`: `caee540`). `apps/server/src/private/privateHardening.test.ts:419` contains a raw U+202E. I intended `\u` escapes. A scan of 80 source and test files found no other direction controls (only leading byte-order marks in two avatar tests).

Behavior is correct under the existing test, but a reviewer cannot see what the expression matches, and such characters can make source display differently from how it runs. **Correction:** use `\u` escapes and add a source scan.

### F5 — P3 (my incomplete fix, `caee540`): other late upload responses still re-send a logged-out cookie

`apps/server/src/private/privateRoutes.ts:155-162` (408), `246-259` (validation failure), `351-400` (error handler).

**Reproduced** for a validation failure (400) and the 408 after logout: both carry `Set-Cookie` for the dead session. Only the valid-file path calls `rejectUnauthorized`. By inspection, 413 and multipart errors behave the same. The dead session grants nothing. The risk is overwriting a newer sign-in cookie in that browser; I did not reproduce that in a browser. My earlier report presented this fix as complete; it is not.

### F6 — P3: the two-upload limit bounds open responses, not work

`apps/server/src/private/privateRoutes.ts:131-153`. Added in `3600dd6`.

**Reproduced:** after two 408s, the same user had **four** validations in flight. By inspection, a 408 stops neither body buffering nor parsing, and a client disconnect also frees the slot while parsing continues. Codex's disconnect test is consistent: a new upload is accepted while the abandoned one is still held. I found **no slot leak**: release is idempotent on `finish`/`close`, and tests cover success, validation failure and abort. ADR-0004 should not present this as a bound on parser or memory use.

### F7 — P3: one unreadable case row hides the whole case list

`apps/server/src/private/privateStore.ts:333-342`, `439-444`. **Reproduced:** damaged metadata in one case makes `GET /api/cases` return 500 `internal` for that account. Nothing is disclosed, but the other cases become unreachable in the UI, and the status differs from the 503 `unavailable` used elsewhere. By inspection the document list behaves similarly.

### F8 — P3: read-path identity change is not detected

`apps/web/src/cases/CasesPage.tsx:310-324`. **Reproduced:** identity is rechecked only on 401/403. If another account takes over the session and a read returns 404, the page keeps showing "Signed in as" the earlier account and its case list. No data of the second account appeared in this probe. P9 asks that old UI requests not show another identity after session loss; recheck on 404 as well. Idle pages also keep showing data until the next request.

### F9 — P4: UI messages

- **Reproduced:** "Case details saved." appears while a different case is open. `3600dd6` fixed this only for upload; by inspection, document-delete and error messages behave similarly.
- **Inspection:** `429 too-many-uploads` shows "wait a few minutes" despite `Retry-After: 1`; a 408 `invalid-upload` shows "check the fields".

### F10 — P4: publication and cleanup edges (inspection)

`privateStore.ts:521-523` does not check that the `ready` update changed one row, so a second process reconciling the same store could leave a false success (single-process use is the documented assumption). `main.ts` reconciles before binding the port, so an accidental second start touches the store before failing. `privateStore.ts:511` is outside the `try`, so its failure returns 500 instead of 503. Reconciliation counts a failed unlink as removed. A PDF with more than 1,024 trailing bytes after `%%EOF` is rejected.

### F11 — P3: records disagree with the code or with the owner's status

- "Owner decision(s)" wording at `docs/adr/0004-upload-validation-and-limits.md:37`, spec line 89, `docs/evidence/E1-S2-builder.md:58-62` and the `3600dd6` commit message ("owner-approved"). The current owner instruction says the limit and Node minimum are **pending**. Mark them, and the extension rule listed beside them, "proposed, pending owner" until confirmed. A commit message needs no history rewrite; record the correction.
- `docs/security/threat-model.md:37` says state-changing routes are POST-only; private routes use PATCH and DELETE. Its upload row needs F1, and its status line needs updating.
- ADR-0004 D3 says quotas are counted in a "best-effort transaction"; no transaction is used. D1's "request timeout 30 seconds" only sends 408; it does not end the work and cannot fire while parsing blocks (F1, F6).
- PNG trailing bytes are accepted; ADR-0004 mentions trailing bytes only for JPEG.
- My earlier review note says there is no concurrency limit (superseded by `3600dd6`) and overstates the cookie fix (F5).

## Assessed areas with no additional finding

These rest on source inspection plus the tests listed above. This is not a cryptographic audit or a full security assessment.

- **Authentication rechecks** (`auth.ts:204-241`): the stored session, matching user, absolute lifetime and enabled account are reread, with no `await` between that check and publication. It relies on the SQLite session store calling back synchronously; an asynchronous replacement would deny every upload (fail closed), so keep that assumption tested. Cookie handling is limited as in F5.
- **Ownership:** owner comes from the session; case and document queries are scoped by owner and parent; the Codex foreign-operation matrix passed.
- **Encryption:** AES-256-GCM, a fresh random 96-bit nonce per seal, a fixed 16-byte tag, `final()` before any plaintext is returned, AAD binding owner, case, record and version, and separate HKDF subkeys. Limits: status and lifecycle columns are not authenticated, a database writer could roll back a whole row version, and there is no key rotation.
- **Publication order:** encrypted staging, file fsync, pending row, rename, ready update. Failure and one real process-exit boundary are covered by Codex. Directory fsync is best effort.
- **Reconciliation file selection and deletion in the correct directory:** managed names only; links and junctions not followed; parent-state download denial. See F2.
- **Validation:** type from content, matching extension, size, page and dimension caps, PNG and JPEG completeness. These are not pixel decoders; data after a PNG `IEND` or the first JPEG end marker is accepted, including a truncated second image. No real camera or scanner corpus was tested.
- **UI race fixes:** the 18 earlier items and the stale upload message pass the maintained tests. Remaining gaps: F3, F8, F9.

## Outstanding gates

### Gate 1 — incremental-save PDF truncation: **OPEN, pending DeepSeek change or owner acceptance**

**Evidence:** an unfinished appended revision of about 20, 500 or 900 bytes is accepted; about 1,100 bytes is rejected, because the older `%%EOF` leaves the 1,024-byte window.

**Mitigation assessed, not implemented:** require that only whitespace or NUL follows the final `%%EOF`. In the probe this rejected the partial tails above, and it accepted complete `pdf-lib` output (both save modes) and a Chromium-printed PDF.

**Limit that no trailer rule removes:** a file cut exactly at an earlier save boundary is byte-identical to a valid earlier file. Without an expected length or hash, content checks cannot detect it.

**Recommendation:** adopt the stricter rule through DeepSeek with RED/GREEN, then have the owner accept the exact-boundary residual. The compatibility cost, rejecting PDFs with trailing junk, is untested on scanner output. If the owner declines the rule, accepting the current gap for an attachment-only fictional demo is defensible, but only as a written exception. Either way, replace blanket "truncated files are rejected" wording with: "rejects detected truncation; cannot detect every cut incremental PDF". This gate is separate from F1.

### Gate 2 — browser-download artifact bytes: **OPEN, UNVERIFIED**

In my environment, from the isolated copy, the no-application control and both browser projects failed with EPERM, matching Codex. I changed no permissions or protections and tried no workaround. Both attempts ran on the same machine, so an environmental cause is likely but **not established**; this neither passes nor fails the application.

Related evidence only: API download bytes are verified, and `CasesPage.tsx:263-287` passes the fetched blob to the download link unchanged (inspection). Neither is artifact evidence.

**To close:** run the unchanged spec where Playwright may read its own download, or have the owner upload a fictional file in their own browser, save the download and record matching hashes of both files:

```powershell
Get-FileHash .\original.pdf, .\downloaded.pdf -Algorithm SHA256
```

Substitute the two real paths and record the browser and version. An explicit owner waiver is the only other disposition; record it as a waiver, not a pass.

### Gate 3 — historical TDD: **permanent recorded gap**

Passing tests cannot repair ordering. Routes, most UI and E2E tests followed implementation (builder), as did the concurrency tests; Codex's additions are regression evidence. RED runs reported for `caee540` were observed only inside my own authoring session; the report that records them is not third-party witness. In `caee540` these changes had **no dedicated failing test**: C1 control-character rejection, the client-disconnect (`res.destroyed`) guard (Codex later added a disconnect regression), upload rejection for a non-ready case before parsing, disabling Download for a non-ready parent case, and the refresh after a failed **document** delete. My first stale-cookie code was written before its test, then removed and redone test-first.

**Disposition:** the owner accepts or rejects this as a process exception. Every correction from this review needs an observed RED before the change.

### Gate 4 — two-upload limit and Node minimum: **PENDING owner decision**

Neither is approved by this review. ADR-0003/0004 remain proposed. Fix the wording in F11.

- **Limit of 2:** a reasonable number for a one-user demo. If approved, describe it as a limit on open upload responses per user per process, or require the work-bounding correction (F6, and F1 for parser cost).
- **Node `>=22.2.0`:** installed `better-sqlite3` and `file-type` declare `>=22`; the 22.2 floor comes from `zlib.crc32` (version history per Codex's citation of Node documentation, which I did not fetch). Reasonable as a declared floor, labelled **untested**: only Node 26.13.0 on Windows has run this code.

### Gate 5 — durability, startup, quotas, isolation and recovery

| Item | Evidence | Disposition |
| --- | --- | --- |
| Key creation | Inspection, `crypto.ts:70-107`: direct write, no exclusive create, temp-and-rename or fsync, although blobs are fsynced. **Assumed, not reproduced:** power loss could leave durable data without a durable key; two first starts could overwrite each other's key | P2 before any data worth keeping. Tolerable for disposable fictional data only if the owner records it. Recommended fix: exclusive create, fsync, atomic publish |
| Startup failure and health | Inspection, `main.ts:38-53`: private initialization throws before `listen`, so health, auth and Mira are all unavailable | P3. Failing closed for private data is right; the story also asks to keep health working. Owner decides; recommended: start the API and answer private routes with 503. No such behavior is demonstrated today |
| Quota semantics | Inspection, `privateStore.ts:413-416`, `472-484`: case count excludes only `error`, so repeated failed deletions could exceed 100 stored cases; document counts include `ready` and `error`, not `deleting` or `pending`. In one process, count and insert run without an `await`, so I see no in-process race; multiple processes are unbounded. Quota refusal shows the generic validation message | P4 locally. Define "live" in ADR-0004. Revisit before hosting |
| Default E2E isolation | Inspection, `authConfig.ts:19,40` and `playwright.config.ts:45-54`: database and session secret are fixed under project `runtime/`; the config sets no private paths. See the earlier-session disclosure above | P2 test-isolation gap. Until fixed, run E2E from a disposable source copy, as Codex and this review did. **Do not override only `PSC_PRIVATE_DATA_DIR`: that triggers F2.** Database, key and data paths must move together |
| Recovery controls | No backup, restore, key recovery or retention. Restoring an older database would delete newer blobs as orphans (ADR-0003 D2); F2 covers the wrong directory | **OPEN for E1-S3** (R19; R18 retention/restore). F2 should be fixed in E1-S2 rather than deferred. No recoverability claim is supported |

## Story criteria

| Criterion | My disposition |
| --- | --- |
| P1, P2, P4 | Met in the tested local scope |
| P3 | **Not met:** F1; gate 1 |
| P5 | API and crypto met in tested scope; **artifact bytes unverified** (gate 2) |
| P6, P7 | Tested fault cases pass; **not met under a wrong data directory** (F2). This differs from Codex's tested-scope pass, which did not include that case |
| P8 | Restart and key-loss cases pass; recovery not covered |
| P9 | Publication checks pass; limits in F5, F6, F8 |
| P10 | **Gap:** F3; saved bytes unverified. This differs from Codex's maintained-state pass |
| P11 | **Open:** gates 1-5, TDD history and `caee540` review independence |

## Suitability

- **Supervised local fictional demonstration:** the core flows work in tests. This is a technical assessment, not approval. If the owner demonstrates this build before corrections: one trusted operator, only files they created themselves, no untrusted PDFs, default storage paths with database, key and data kept together, disposable data, and no claim of verified saved-download bytes, complete truncation detection or recoverability.
- **Hosted demonstration or real users or records: not ready.** At minimum F1 and F2, plus TLS and secure cookies, parser isolation and malware controls, shared-process limits, durable key handling, tested backup and recovery with retention policy, independent security review and legal review. Resolving this list would not itself grant approval.

## Handoff to DeepSeek, through the coordinator

Nothing was sent to another party by this review. Suggested order, each with an observed RED first:

1. F1 bounded parsing.
2. F2 data-directory identity and honest deletion.
3. F3 ambiguous-write reconciliation.
4. F4 escapes and F5 cookie handling on every late upload response.
5. Gate 1 rule, if the owner chooses it.
6. F11 record corrections.
7. Owner's choice on F6-F10 and the gate 5 items.

Codex then retests. A reviewer other than this session should examine `caee540` if independence is required, and review the corrections. The owner decides pending proposals, exceptions and any merge.

**Stopped here for owner review. No merge approval is granted and no new story was started.**
