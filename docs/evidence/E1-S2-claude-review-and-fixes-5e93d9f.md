# E1-S2 Claude review and fixes (base `5e93d9f`, branch head `744f00a`)

Date: 2026-11-24. Reviewer: Claude (Claude Code), at the owner's request.

**Role note:** the same session reviewed the code and wrote the fixes, at the owner's direction (the usual split is that DeepSeek builds). This is therefore not an independent review of the fixes. They need Codex independent testing, and the owner decides whether a separate review is needed. This is not merge approval or a security certification. Fictional data only. No merge or push.

## Method

Read the spec, ADR-0003/0004, builder evidence and the private/auth/UI source. The git-ignored `.setup/codex-private-independent.test.ts` was also found and run unchanged. There is no matching E1-S2 Codex report in `docs/evidence`, so it was treated as an unreported probe: **5 of 6 failed** before the fixes and **6 passed** after. An earlier `.setup` Claude review attempt ended on a usage limit with no findings.

## Findings fixed

| # | Finding | Fix |
| --- | --- | --- |
| 1 | Logout or account disable during a pending upload still published the document (201) | Re-read stored session and account before publication |
| 2 | The late response re-sent the logged-out session cookie | Drop the request's session when its record is gone |
| 3 | An upload published after the server had answered 408 | No publication once answered or disconnected |
| 4 | Startup cleanup followed directory junctions and deleted files outside storage | Do not follow links |
| 5 | Startup cleanup deleted any unrecognised file under `blobs/` and `staging/` | Delete server-generated names only |
| 6 | A new or reset database with the same key and blob folders would delete all blobs | Fail closed |
| 7 | Downloads allowed while the parent case was `deleting`/`error` | Require a `ready` parent |
| 8 | Pending documents appeared in list and detail | Hidden |
| 9 | Truncated PNG, JPEG and some truncated PDFs accepted | Completeness checks (ADR-0004 D2) |
| 10 | Extension could contradict content (`.html`, `.exe`); bidi-override names accepted | Rejected |
| 11 | Non-ASCII filenames stored garbled (latin1 default) | Decode as UTF-8 |
| 12 | Upload body parsed before case ownership was checked | Check ownership first |
| 13 | Private JSON responses lacked `no-store` | Added for `/api/cases` |
| 14 | Malformed multipart returned 500 | Generic 400 |
| 15 | UI: edit fields kept the previous case's values, so saving could overwrite another case | Reset on selection |
| 16 | UI: late or failed loads and uploads showed another case's documents; a chosen file carried over | Track the current selection |
| 17 | UI: session loss on opening a case, or a different account on the session, did not leave the private view | Return to sign-in |
| 18 | UI: incomplete deletion looked normal | Label it and refresh after a failed delete |

All cross-case and cross-owner findings in the UI concern one account's own data, except 17. No server path was found that let one account read, change or delete another account's cases or documents.

## TDD evidence

Tests were written first and observed failing for the intended reason, before the matching production change:

- `privateHardening.test.ts`: first run **22 failed / 3 passed** (the 3 were controls or already-correct behaviour).
- PDF end-marker test, added after probing truncation points: **1 failed**.
- Stale-cookie test: **1 failed** (an untested first attempt at this fix was removed before the test was written).
- `CasesPage.test.tsx`: **8 failed**, then 1 more for refresh-after-failed-delete.

One existing test was adjusted: the oversize-PNG fixture now recomputes its IHDR CRC, so it still exercises the dimension cap rather than the new CRC check.

## Open items (not fixed)

- No limit on concurrent uploads, although story decision 4 asks for one. ADR-0004 records no value; it needs an owner decision.
- Structural checks are not a decoder or malware scan. A PDF truncated after an earlier incremental-save `%%EOF` can still pass. PDF parsing is not time- or memory-isolated.
- Image checks were exercised on test fixtures, installed PNGs and Chromium output, not on real camera or scanner files. A JPEG with stray bytes between header segments is now rejected. macOS-style decomposed (NFD) filenames are rejected under the ADR's reject-don't-rewrite rule.
- A key or database initialisation failure stops the whole API process, including health.
- All blobs share one shard directory (`blobs/bl/`), because every name starts `blob_`.
- Quota errors use the generic validation message. `error`-state cases do not count toward the case quota.
- The key file is not written atomically or fsynced.
- E2E writes fictional accounts and data into the real git-ignored `runtime/` directory.
- Backup/restore, retention and key recovery remain E1-S3.

## Final checks

Windows, Node v26.13.0, after the fixes. Baseline before the fixes: 293 unit/API tests and 56 browser tests passed, and typecheck, build, secrets scan and audit succeeded.

| Command | Result |
| --- | --- |
| `npm test` | 329 passed, 31 files |
| `npm run test:e2e` | 56 passed |
| `npm run typecheck` | exit 0 |
| `npm run build` | succeeded |
| `npm run verify:secrets` | no leak patterns found |
| `npm run test:secrets` | 7 passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Preserved probes (auth 8, foundation 6, SDK 3, Mira 2, cookie race 1, private 6) | all passed |
| `git diff --check` | exit 0 (line-ending warnings only) |

The fixes use `zlib.crc32`, which needs Node 22.2 or later; `package.json` still says `>=22.0.0`.
