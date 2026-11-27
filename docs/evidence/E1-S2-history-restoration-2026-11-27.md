# E1-S2 historical evidence restoration — November 27, 2026

Scope: documentation/evidence only. No application source, maintained test behavior, owner runtime, database, key, real record or `.env` was accessed or changed. No Git history was rewritten.

## Root cause

Later E1-S2 work updated the **historical** builder “Final checks” and risk-register totals in place with the then-current suite counts. That made earlier runs appear to have executed tests that did not exist at those checkpoints and erased the original snapshots. This is an evidence-provenance defect, not an application defect.

## Affected evidence and restoration

| Historical record | Overwritten value | Restored value | Trustworthy source |
| --- | --- | --- | --- |
| `E1-S2-builder.md` — Final checks | 376 tests / 34 files; API 227 / 20 | **347 tests / 32 files; API 213 / 18** | `git show 03b1bb8:docs/evidence/E1-S2-builder.md` |
| `E1-S2-builder.md` — CV-3-R2 section | 376 / 34; API 227 / 20 | **348 / 32; API 213 / 18** | `E1-S2-codex-cv3-provenance-retest-2026-11-25.md` and `E1-S2-codex-cv3-r2-retest-2026-11-25.md` |
| `E1-S2-builder.md` — CV corrective section | 376 / 34; API 227 / 20 | **374 / 34; API 225 / 20** | `E1-S2-corrective-cv-2026-11-25.md` |
| `RISK_REGISTER.md` — E1-S2 corrective update | 376 / 34; API 227 | **347 / 32; API 213** | `git show 03b1bb8:docs/planning/RISK_REGISTER.md`; `E1-S2-corrective-2026-11-25.md` |
| `RISK_REGISTER.md` — CV corrective update | 376 / 34; API 227 | **374 / 34; API 225** | `E1-S2-corrective-cv-2026-11-25.md` |
| `RISK_DRIVEN_DELIVERY.md` — November 25 current position | 376 / 34; API 227 | **347 / 32; API 213**, with later November 26 totals in a separate entry | `git show 03b1bb8:docs/planning/RISK_DRIVEN_DELIVERY.md` |

The later CR-5-R1 section retains its actual later values: focused **19/19**, maintained **376/34**, API **227/20**, browser **56/56**. It is a later run and must not be used to replace earlier totals.

Provenance dates/commits:

- `03b1bb8aee712db73d4c690be850030e050e6361` — 2026-11-25; builder final snapshot, local main `e2edea5a11ba250b881449acaa951844e38abba0`.
- CV-3-R2 tree: HEAD `03b1bb8` plus 21 uncommitted tracked files; manifest `E1-S2-cv3-r2-source-manifest-2026-11-25.json`, SHA-256 `481079317C5D1811FDF116FE44055D38CF1D430EFCD7D70ADEDBEB5E9AEA3988`; reports dated 2026-11-25.
- CV corrective report dated 2026-11-25; builder prospective RED **10 failed / 18 passed / 28 assertions**; seven CV failures plus three fixture-environment failures.
- CR-5-R1 report dated 2026-11-25/26; focused 19/19; GitHub path correction retained.

## Historical failures preserved

The restoration does not convert failures into passes:

- Preserved original Codex independent suite remains **9/11**; the immediate-disconnect-release and old incremental-PDF assertions remain failed/stale expectations.
- Supplementary worker-lifecycle suite remains **27/28** because the preserved post-exit `worker.resourceLimits` assertion conflicts with CR-6; not waived or edited.
- Browser artifact-byte verification remains **BLOCKED** on Windows/EPERM; no waiver.
- Historical TDD gaps remain recorded: routes/UI/E2E and several corrective tests were not all observed RED first; prospective `10 failed / 18 passed` and the later CV RED are preserved as such, not rewritten as historical RED.
- The later CR-5-R1 and Tasks 01–05 results are separately dated and attributed; they are not backfilled into earlier cycles.

## Unrecoverable or reconstructed evidence

- The exact original **prose** of the uncommitted CV-3-R2/CV builder sections is not in Git. Their numeric facts, dates and commit/manifest provenance are recovered from the preserved independent reports above; the restored wording is labeled as reconstructed rather than an unchanged byte copy.
- Some intermediate overwritten working-tree versions were never committed and cannot be recovered byte-for-byte. No missing value was invented; unknown text is not presented as original.
- All test totals/dates in this report are sourced above; no current run is substituted for an earlier one.

## Permanent evidence-integrity policy

Adopted in `docs/process/EVIDENCE_INTEGRITY.md`; briefly:

- Historical evidence is append-only. Corrections use dated amendments/addenda and preserve the old value/provenance.
- New results go into new, dated, attributed sections; they never replace earlier totals.
- Builder, Codex, Claude and owner attribution must remain explicit.
- Failed tests, stale assertions, TDD exceptions and blocked gates stay visible; passing later work cannot erase them.
- Risk-register status changes require linked executed evidence.
- Unverified claims stay labeled; unavailable evidence is marked unavailable, never fabricated.
- Sensitive owner paths/credentials do not enter evidence.

## Reconciled task and gate status

| Item | Verified status | Not waived / still open |
| --- | --- | --- |
| Task 01 NR-1 session-loss | PASS, independent Codex + Claude; checkpoint `f1b18e0` | E1-S2 approval/merge |
| Task 02 NR-2 storage/deletion | PASS, independent Codex + Claude; checkpoint `a440516` | E1-S3 recovery/backup policy |
| Task 03 NR-5 shutdown | PASS for shutdown behavior; checkpoint `1dd128d` | **Active-upload-during-shutdown coverage remains outstanding**; historical NR-3 wording inconsistency remains recorded |
| Task 04 deleted-document test | PASS test-only; checkpoint `ac296f9` | No application change |
| Task 05 late-response test | PASS test-only; checkpoint `52d7508` | **Guard 1 alone is not independently observable**; Claude’s three optional hardening recommendations remain open |
| Task 06 evidence integrity | This report; local checkpoint recorded separately | NR-4 GitHub publication remains blocked; no push |
| NR-3 historical totals | **Corrected/restored** in this evidence pass | Not a waiver of future evidence requirements |
| NR-4 absolute owner paths | **OPEN**; six tracked published files identified; no history rewrite or push | Owner decision required |
| NR-6 test effectiveness | Tasks 04/05 improved specific coverage | Other NR-6 items and optional recommendations remain open |
| NR-7 audit | **OPEN/needs triage**; production-only audit versus full dev-tree advisories | Owner/reviewer triage |
| NR-8 | **OPEN** | Separate review |
| Browser artifact bytes | **BLOCKED** | Supported-environment execution or explicit owner/reviewer disposition |
| Historical TDD exceptions | Preserved as exceptions/failures | Owner/reviewer disposition |
| Owner key/retention/readiness/concurrency/Node decisions | **OPEN** | Owner decisions |
| E1-S2 merge/publication | **Not approved** | Owner approval; no push |

## Verification plan

Documentation-only: compare restored values to Git and reports; `git diff --check`; secret scan; Codex independent evidence verification; Claude provenance/policy review. No unrelated application suite rerun is required unless verification finds a discrepancy.
