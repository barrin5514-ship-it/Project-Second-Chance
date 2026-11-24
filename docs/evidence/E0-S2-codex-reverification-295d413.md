# E0-S2 Codex re-verification — 295d413

Date: 2026-11-24 (America/New_York). Reviewed commit: `295d413598832af88c55348585a193c871cf9738`, branch `feature/e0-s2-source-readiness`.

## Verdict

The five agreed correction groups are addressed. No blocking finding remains from this bounded Codex re-verification. [Actual Claude follow-up](E0-S2-claude-followup-295d413.md) also completed: all five groups resolved, no P1/P2 blockers. Its mechanical-verification condition is satisfied by the observations below. Owner merge approval remains pending. Remaining P3 label/digest/source-coverage wording notes are explicitly deferred, not new authorization to use unverified sources. This verdict concerns research readiness only, not legal certification, court permission or capability activation.

## Correction checks

| Group | Independent observation |
| --- | --- |
| EEOC source status | Inventory L3 is historical/rescinded; L3a cites the official announcement and attributes the original observation to Codex. Separate Q&A and 2014 joint guidance remain qualified. L3b describes process corroboration, not a separate outcome announcement. Current report/digests/risk note adopt the correction; the original failed lookup remains historical |
| Required dual fallback | Recommendation explicitly requires functional fictional candidate search plus guided official manual lookup. Manual-only is insufficient absent a separate owner scope change. CF-11–CF-13 add restricted-category, minimization and separate confirmation scenarios as planned tests |
| Service-specific permissions | Nebraska one-time redistribution terms are separated from the subscriber software licence and unknown subscriber/bulk data-display rights. Georgia restrictions are limited to inspected services; no new permission is inferred |
| Provenance/scope | PeachCourt's stated 2022 update is distinguished from its upload path. Georgia statewide coverage, name-search fields and appellate login remain bounded/unknown. Rule 21's court scope and secondary status are explicit; a county description is not mislabeled as verified underlying statute text |
| Honest evidence | Builder evidence separates fetched, identified/secondary, failed and Codex-observed content. It limits the numeric citation check to the run report, provides a report/C/L crosswalk, and preserves the earlier ledger entries with appended correction event/claim |

## Mechanical checks actually executed

An independent Node read-only audit of the Git diff and Markdown observed:

- 13 changed files relative to `1b14185`, all Markdown. No app, dependency, configuration or test changes.
- Run report: 21 unique citation markers, 21 appendix rows; zero dangling or orphaned IDs.
- 45 defined C/L source IDs; zero unknown bracketed C/L references in the three research deliverables.
- Zero broken relative Markdown links in changed files.
- Memlog: 23 entries — 1 decision, 1 assumption, 4 events, 5 source batches, 12 claim entries. Raw entries contain 11 verified and 1 historical disputed claim. With last-status-wins, 11 unique current claim references are verified; the old disputed L3 entry is superseded. These labels are the ledger's claims, not independent certification of every source.
- All original ledger entries are preserved verbatim in the same order; only the metadata timestamp and appended correction entries changed.
- `git diff --check`: exit 0.
- `npm run verify:secrets`: exit 0; no tracked-source credential patterns found.

No application suite was rerun for Markdown-only corrections. Existing application tests are not evidence of source/legal accuracy. The three original review reports are now tracked in the correction commit. Before this re-verification, only owner-local `.vscode/` was untracked.

## Source checks and limits

On 2026-11-24 Codex reopened the [official EEOC announcement](https://www.eeoc.gov/newsroom/eeoc-votes-rescind-enforcement-guidance-arrest-and-conviction-records), which supports the corrected date/outcome, and the [Nebraska one-time terms](https://www.nebraska.gov/justicecc/terms_and_conditions.html), which support that service's specific restrictions. The subscriber agreement URL returned an unexpected-status retrieval error in this repeat check; the narrow software-licence distinction remains supported by Codex's recorded successful 2026-11-23 read. No failed fetch was worked around with authenticated access or a real-record query. Not every original source was fetched again.

Legal-source currency, Georgia official Rule 21/juvenile statutory text, Q&A/joint-guidance status, referral suitability and subscriber/bulk display permission remain explicitly unverified or review-gated. The research does not grant permission for live access, paid services, private records, hosting or legal conclusions. A qualified legal reviewer is still distinct from Codex/Claude. Persistent future risks remain OPEN.

No application changes, merge, push, deployment, external messages or live provider session were performed. Owner merge approval for E0-S2 remains pending. The next coding slice identified by the existing plan is E1-S1 authentication; this re-verification does not implement it or expand its approval scope.
