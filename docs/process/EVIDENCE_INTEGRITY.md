# Evidence integrity policy

Adopted November 27, 2026 for Project Second Chance. Applies to all builder, tester, reviewer, owner and imported evidence.

## Rules

1. **Append-only history.** Historical evidence reports, test totals, dates, commit references, reviewer findings, limitations and risk statuses must not be silently overwritten. Corrections require a dated amendment, addendum or restoration entry that names the old value and its source.
2. **No backfilled results.** A later passing suite must never replace an earlier run’s totals or make an earlier failure disappear. New results live in a new dated/attributed section.
3. **Attribution is explicit.** Builder (DeepSeek), independent tester (Codex), independent reviewer (Claude) and owner decisions remain distinguishable. A builder test is not independent verification; a review is not owner approval.
4. **Failures stay visible.** Failed tests, stale assertions, TDD-order exceptions, blocked gates, unrecoverable evidence and unverified claims remain recorded with their status and scope.
5. **Risk status needs evidence.** A risk may be marked mitigated/closed only with a linked executed test or review appropriate to its scope; a later feature or optional recommendation is not a waiver.
6. **No fabrication.** If a source cannot be recovered, mark it unavailable/unverifiable. Reconstructed wording is labeled; unknown values are not invented.
7. **Separate current from historical.** Current suite totals, current browser results and current review verdicts belong in current dated entries, not in earlier run records.
8. **Sensitive data boundary.** Never place owner-specific absolute paths, credentials, `.env` values, keys, private database contents, document contents or runtime records in evidence. Use redacted placeholders and metadata-only statements.
9. **Task tracker honesty.** Task PASS means only the scoped verified behavior. Outstanding verification, approval, publication, recovery and optional-hardening gates remain explicit; no automatic waiver.
10. **Preserve provenance.** Every restoration/correction records the Git commit or preserved report used, the date, the original value and the corrected value.

## Minimum evidence record

Each substantive verification entry should state: date, branch/HEAD or source manifest, exact command/agent, exit status, observed counts, failures, environment/isolation, attribution, limitations and whether the result is builder, independent, review or owner disposition.

## Task status reconciliation (as of 2026-11-27)

- Task 01 NR-1: PASS, independently verified; E1-S2 approval/merge open.
- Task 02 NR-2: PASS, independently verified; E1-S3 recovery policy open.
- Task 03 shutdown: PASS for shutdown; active-upload-during-shutdown coverage outstanding; historical NR-3 status wording inconsistency retained.
- Task 04 deleted-document test: PASS test-only.
- Task 05 late-response test: PASS test-only; Guard 1 alone remains non-observable; three optional hardening notes remain open.
- Task 06 historical restoration: documentation correction; this policy adopted.
- NR-3 historical totals: corrected/restored; no future-verification waiver.
- NR-4 owner-path publication: open; no history rewrite/push.
- NR-6 broader test-effectiveness items: partially addressed; remaining items and optional recommendations open.
- NR-7 audit: open/needs triage.
- NR-8: open.
- Browser artifact bytes: BLOCKED.
- Historical TDD exceptions: preserved; no waiver.
- Owner key/retention/readiness/concurrency/Node decisions: open.
- E1-S2 merge/publication: not approved; no push, merge, deployment, migration or E1-S3/Task 07.

This policy supplements, and does not weaken, `AGENTS.md`, BMAD/TDD and risk-register requirements.
