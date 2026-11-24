# Actual Claude follow-up — E0-S2 295d413

Date: 2026-11-24 (America/New_York).
Reviewed commit: `295d413598832af88c55348585a193c871cf9738`.
Actual reviewer: authenticated first-party Claude Code, requested `sonnet`, reported model `claude-sonnet-5-5`. Exit 0, success, no permission denials. Read-only Read/Glob/Grep; no shell/edit/MCP, private-file reads denied. Claude did not browse or execute checks.

Codex disposition: all five correction groups pass re-verification. The mechanical checks on which this review is conditional have passed: 21/21 report citations with no dangling/orphaned IDs, no unknown C/L refs or broken relative links, preserved original ledger entries, Markdown-only diff, clean diff/secret checks. See `E0-S2-codex-reverification-295d413.md`. Remaining P3 wording/provenance notes are deferred nonblocking follow-ups; they do not authorize reliance on unverified legal content or court access. Owner merge approval is pending. No application changes, live provider session, merge, push or deployment occurred.

Reviewer response preserved verbatim below.

---
# Claude follow-up review: E0-S2 at `295d413`

**Verdict: all five correction groups are resolved, and I found no new P1 or P2 blocker. From a source-consistency standpoint it is ready for owner merge consideration, provided Codex's mechanical re-verification passes.**

This was a read-only Read/Glob/Grep review of the repo text only. I did not browse, run tests, check the git diff or edit anything. I could not confirm external URLs, the Markdown-only diff, link resolution or `git diff --check`. Those remain Codex's. This is not legal review. I did not reopen the triage-contradicted items (personal view/print, $2 excess fee, $100/$17 prices, eFiling conditions); the docs now carry them as sourced facts.

## Correction groups

| # | Group | Result | Evidence |
|---|---|---|---|
| 1 | EEOC status | **Resolved** | Inventory L3 is marked historical/rescinded. L3a records the official announcement (2026-10-29, previous day's vote, immediate effect) as observed by Codex, not re-fetched by the builder. L3b is limited to corroborating the notation-vote process. L2 and the Q&A are explicitly not assumed rescinded. The inventory says rescission does not repeal Title VII or FCRA. The change is propagated to gap 5, the recommendation (lines 113 and 111), the report (lines 25, 37 and 70), the digests, the memlog (lines 30–31), builder line 19 and the risk register line 52. The original missed lookup survives as history, and the remaining "disputed" strings are all historical. |
| 2 | Both fallback capabilities | **Resolved** | The manual-only alternative now reads "Insufficient for MVP completion" unless the owner changes scope (`recommendation.md:71`). Both capabilities are required in the decision summary, the options table, the E6 dependency (line 111) and the report. CF-09 and CF-13 keep the fictional labels, explicit confirmation and selection-not-identity-verification. |
| 3 | Service-specific permission | **Resolved** | The one-time redistribution ban, the subscriber software licence and the unreviewed bulk agreements are kept separate (matrix lines 18, 19 and 42; recommendation line 35). The "personal subscriber account is insufficient" statement is labeled an inference (line 40). Georgia restrictions are scoped to the inspected GSCCCA and PeachCourt terms, with re:SearchGA/Tyler and county sites marked unreviewed. The live-access gate is kept, and eFiling is narrowed to "not a court-search API". |
| 4 | Provenance and coverage | **Resolved** | PeachCourt is recorded as "2022-04-13 update, 2025/01 path", with the canonical host and applicability marked unknown. The statewide-search negative is qualified as "established in this bounded review". Rule 21 is scoped to the Superior Court and marked a secondary reproduction. C13 and C15 are downgraded to limited. Georgia name search, login for appellate courts and date or court-type coverage are marked unknown. Vendor and court-issued sources are kept distinct. |
| 5 | Evidence coverage | **Resolved** | Builder lines 22–28 split sources into fetched, identified-only and failed. Line 32 limits the citation check to the run report. I checked the crosswalk for [1]–[21] against the report's appendix and it is correct. I recounted the memlog at 23 entries (1 decision, 1 assumption, 4 events, 5 source batches, 12 claims: 11 verified, 1 historical disputed), which matches the builder's count. Correction history is appended rather than rewritten. |

## New P1/P2 blockers

None.

## Non-blocking limits (P3, none a hard gate)

1. **L14 label conflict.** The inventory marks L14 (legislature site) "verified entry point". Builder line 25 says its URL was not fetched. The same applies to C16 (Georgia directory), which appears in none of the three coverage lists. Relabel either one as "identified entry point" if a touch-up is convenient.
2. **C12 coverage list.** C12 is listed under "identified only, not directly fetched" but annotated "homepage read". It also duplicates C5's URL.
3. **PeachCourt account claim.** Matrix line 16 cites C3 for "PeachCourt requires an authorized account", which the C3 register row doesn't show. E-Access (C1) supports the general account statement.
4. **Residual wording.**
   - The Nebraska digest's C10 line says "non-transferable end-user license" without the "software" qualifier. The access-terms digest has it.
   - The Nebraska digest still has the lead "check one-time fee current status", which the triage resolved.
   - The memlog's historical lines 12 and 17 ("PeachCourt 2025 terms", flat "no statewide public search") are not individually qualified. Event line 30 covers them in general terms.
5. **Source-consistency only.** The EEOC announcement, the rescission scope and all fee and term facts rest on Codex's observation. The Q&A, the 2014 guidance, FCRA currency, official Rule 21 and §15-11-704 text, Georgia vendor terms and the Nebraska bulk agreements are explicitly labeled open future gates. Per your direction I'm treating them as limitations, not blockers.

## Before owner merge consideration

- Codex's fresh mechanical checks (links, diff scope, `git diff --check`, counts) still need to pass.
- The owner's merge approval is separate and has not been given.
- No merge, push, deployment, paid action, provider session or legal approval is implied by this review.

Plan mode was active, so I wrote no plan file and made no edits.
