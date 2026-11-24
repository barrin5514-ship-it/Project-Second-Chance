# Actual Claude review — E0-S2 at 1b14185

Date: 2026-11-23 (America/New_York).
Commit: `1b1418543ed5b19b533ed678e665769dafa5c561`.
Actual reviewer: installed authenticated first-party Claude Code, requested model `sonnet`, reported model `claude-sonnet-5-5`. Exit 0; success result; no permission denials.
Read-only Read/Glob/Grep only; shell/edit/MCP disabled and private-file reads denied. Claude did not browse or run tests. Codex separately checked official public sources and supplied the observed rescission finding. This is therefore an independent source/scope consistency review, not a second independent live verification of those URLs. Codex's saved report was also available to Claude during review.

Verdict: corrections required before owner merge consideration. See `E0-S2-review-triage-1b14185.md` for Codex's disposition of reviewer suggestions, including externally supported statements that need not be downgraded. Do not blindly implement every review assertion. No application change, legal certification, paid action or merge is authorized by the review.

The response below is preserved verbatim.

---
# Claude independent review: E0-S2 research at `1b14185`

**Verdict: not ready for owner merge consideration yet.** The core recommendation is sound: no live access now, and the approved fictional search plus guided manual lookup. Five P2 items need narrow documentation fixes first, so merge consideration should wait for those fixes, Codex re-verification and a Claude follow-up.

This was a read-only review using only Read, Glob and Grep. I did not browse or run anything. Every source-content conclusion below is source-review-only: it comes from the repo text and checks whether claims match their own register. Items marked **[Codex-observed]** come from the user's message or from `docs/evidence/E0-S2-codex-independent-verification-1b14185.md`. I did not re-observe those external pages. This is not legal certification.

## P2: fix before merge

**1. EEOC rescission is mis-stated as "disputed / no official notice found". [Codex-observed]**
- **Locations:**
  - `docs/research/E0-S2-legal-source-inventory.md:13` (L3) and `:61` (gap 5)
  - `docs/research/E0-S2-recommendation.md:107`
  - `docs/evidence/E0-S2-builder.md:20`
  - `docs/planning/RISK_REGISTER.md:52`
  - `_bmad-output/.../research.md:25,37`
  - memlog line 24
  - `digests/legal-sources-r1.md:7,18` and `digests/access-terms-fallback-r1.md:10`
- **Problem:** Codex found the official EEOC newsroom announcement and a Federal Register notice. Codex's own file says the FR item is a Sunshine Act meeting-cancellation notice. It records only that the matter was decided by notation vote, so the EEOC announcement is the primary source for the outcome. Codex also reports the old guidance URL returned 404. That undercuts L3's claim that "both official EEOC pages remained published".
- **Narrow correction:**
  - Reclassify L3 as **historical/rescinded, not a current approved source**.
  - Add a new row for the EEOC announcement (primary) with the Codex access date.
  - Add the FR cancellation notice as corroboration of the vote only.
  - Keep the McDonald Hopkins article as secondary and non-authoritative.
  - Do **not** state the 2026-10-29 date or the effective scope as settled until the announcement text is read. The only date currently in the repo comes from the secondary source.
  - Append a **correction event** to the memlog and builder evidence. Preserve the missed lookup as history rather than rewriting it.
  - Update the "disputed" wording in all the locations above.
- **Do not overcorrect:** The inventory should not say rescission repeals Title VII or any anti-discrimination duty. It should only say the 2012 guidance is no longer a usable current source.
- **External verification needed:**
  - Does the rescission reach the 2012 Q&A?
  - Does it affect the 2014 EEOC/FTC joint guidance (L2)? L2 is currently marked verified without that check.
  - Has the Federal Register notice been formally published, or is it only a public-inspection copy?

**2. The recommendation calls manual-only lookup an "acceptable subset". [Codex-observed; I confirm it against the baseline text]**
- **Location:** `docs/research/E0-S2-recommendation.md:68`.
- **Conflict:** FR-22 and FR-26, baseline §4 item 5, and the release gate in `docs/product/approved-product-baseline-v1.1.md:131-133` require a **functional** fictional search **plus** guided manual lookup, and say a static screenshot is insufficient.
- **Correction:** Change the row to "Insufficient for MVP completion; permitted only as an interim build step unless the owner approves a scope change".
- **Also tighten:** `recommendation.md:8,67` and `builder.md:62` are correct and should keep both capabilities. Add the same "both required" wording to the E6 dependency at `recommendation.md:105`.

**3. The Nebraska license and redistribution language is over-extended. [Codex-observed; matches the text I read]**
- **Locations:**
  - `docs/research/E0-S2-court-access-matrix.md:18,19,42,59`
  - `docs/research/E0-S2-recommendation.md:35,40`
  - `research.md:23`
- **Problem:** The subscriber agreement's "non-transferable end-user license" is used to characterize data display and redistribution. Codex says that clause concerns provided **software**. The explicit redistribution ban comes only from the **one-time** terms.
- **Correction:**
  - Keep the two services separate.
  - For subscriber and bulk data, say "affirmative display or redistribution permission not established; agreements unreviewed (bulk PDFs not retrieved)".
  - Mark `recommendation.md:40` ("a personal subscriber account is not sufficient") as **inference**, not a finding.
  - The no-live-integration gate still stands without this overstatement.
- **Related unsupported claims:**
  - `matrix.md:19,42` say "personal view/print only". The register quotes only no redistribution, republishing or retransmission.
  - `matrix.md:18,42` say the eFiling webservice is "limited to attorneys/contracted users". No register row supports this.
  - `matrix.md:17` says "then $2/record" and cites C6, C9 and C11, but the C8 and C11 register rows show only "$1,000/20k".
  - Each of these needs a source row, or must be labeled unverified.

**4. Confidence labels and claim qualification are inconsistent.**
- **Secondary and county sources labeled "verified":**
  - The matrix labels C13 and C15 "verified" (`matrix.md:62,64`). Its own definition at `:5` says verified means "directly supported by the cited official page".
  - The inventory labels the same sources **limited** (L10, L11 at `inventory.md:25,26`). The matrix should use the same downgrade.
- **Scope of Rule 21:** `matrix.md:15` presents Uniform Superior Court Rule 21 as general Georgia law ("Court records are public unless…"). A Superior Court rule is being generalized to the whole Georgia court system. Qualify it as Superior Court only, from a secondary host, with official text pending.
- **Georgia name search:** `matrix.md:14` says name search is "available where a listed vendor offers it" and cites C1 and C3. Nothing in the register shows search fields for any Georgia vendor. Either source it or mark it **unknown/inference**. FR-21 depends on this.
- **Georgia login generalization:** `matrix.md:16` says login is "Required" for Georgia as a whole. The Georgia appellate and Supreme Court entry points (C18, L12, L13) were never assessed for login or name search.
- **Negative claim:** Codex also asks that the Georgia "no statewide search" negative be qualified as "none established in this bounded review". `matrix.md:11` and `recommendation.md:7` currently state it flatly.
- **PeachCourt document date:** `matrix.md:30,52` and `recommendation.md:21` call this "2025 terms". Codex found the PDF's first page says it was last updated April 13, 2022. The `/2025/01/` upload path and the `230422` filename are not the document's date. The host is also `awesome.peachcourt.com` over http; the register doesn't establish that it is the canonical host.

**5. The builder evidence overstates what was inspected and mechanically checked.**
- **Location:** `docs/evidence/E0-S2-builder.md:12,18`.
- **Claim:** "inspected … inventory entries C1–C18 / L1–L25".
- **Contradiction:** The inventory itself says L4 and L25 were not fetched (`inventory.md:14,45`), L5 returned 403 (`:15`), and L6 was not fetched (`:16`). The matrix register's C12 has no URL at all (`matrix.md:61`).
- **Checker scope:** The "20 markers / 20 rows, ok=true" check covers only `research.md`. It does not cover the matrix, inventory or recommendation. That wording appears at `builder.md:12`, and Codex's count at `codex-verification:54` also covers the report only.
- **Correction:** State which entries were fetched, which were identified only, and which failed. Say the citation check covers the run report only. Add a crosswalk between the report's `[n]` numbering and the `C#`/`L#` IDs, since they differ (for example `[8]` is C9, and `[6]` is C15).

## P3: advisory, non-blocking

- **Accessibility of manual lookup (AC1) is not analyzed.** `matrix.md:20` says "Feasible" and stops there.
  - Georgia's route requires a vendor account and per-document fees.
  - Nebraska's remote route costs $17.
  - The free in-person terminal route is mentioned in the Nebraska text but is not listed in the options table at `recommendation.md:46-57`.
  - The table also says user-borne fees are "unknown" (`:48`) although per-unit figures are recorded.
  - Add a one-line cost, access and ability-to-use note per route.
  - Add a Nebraska Public Records Act request option (§84-712, already in L19) to the options table.
  - The table also has no separate "unknown options" group, which AC4 asks for.
- **"Allowed fallback" and "OFFICIAL MANUAL LOOKUP" labels** (`recommendation.md:25,38,85`). PeachCourt and re:SearchGA are third-party vendors that the Judicial Council routes to.
  - Suggest "court-designated route (third-party provider)".
  - Note that terms for deep-linking to vendor pages were not reviewed.
  - Replace "Allowed" with "approved MVP fallback".
- **CF-03 wording** (`recommendation.md:79`) says "searched fictional/official source". In fictional mode it must say "searched fictional demo dataset" to protect R22.
- **FR-24 and FR-27 gaps in the planned scenarios.** There is no scenario for sealed or juvenile handling, minimization (FR-23, FR-27) or a distinct explicit confirmation step before linking to an account (FR-24, FR-25). CF-08 covers "selection" only. Add one scenario each.
- **GSCCCA fee relevance** (`matrix.md:17`, `recommendation.md:50,51`).
  - GSCCCA's reviewed services are property, UCC and civil-filing indexes. Their relevance as court-case-discovery options is not established. It is also not shown whether any GSCCCA civil case data covers the criminal records this product cares about.
  - Label this inference.
  - The $5 activation and $0.50 print figures are not in the C4 register row, though Codex observed them. Add them to the row.
  - The generalization at `recommendation.md:7` ("reviewed vendor/authority terms prohibit automated collection") rests on only two reviewed terms sets. Georgia has re:SearchGA/Tyler and county clerk sites that were not reviewed.
- **Coverage over time and court type is missing.** There are no date ranges, such as how far back records go, for either state. Georgia's "many Superior and State courts" (`matrix.md:13`) is unquantified. Magistrate, Municipal, Probate and Juvenile are not separated. Record these as unknown.
- **Register traceability (AC2):**
  - C5, C12, C16, C17 and C18 lack a specific section or quote.
  - C12 has no URL.
  - Several inventory rows carry no section or effective date. L18's "operative date shown in source note context" is non-specific. L1's "currency through Pub. L. 119-142 (Nov. 10, 2026)" cites no URL.
- **Off-scope or weakly tied sources.** L9 (Georgia age discrimination, §34-1-2) is limited and not tied to the five features, so drop it or explain its relevance. The same question applies to L18 (Nebraska FEPA §48-1104) and L7 (the Georgia Open Records Act). Neither states whether court records fall under it.
- **Recommendation wording.** `recommendation.md:7,65` say "Do not build / Reject". Because no permission request was made, which the story forbade, "not feasible on current evidence; revisit with written permission" is more accurate. The PRD frames live access as a preferred stretch, not a gate.

## Arithmetic and cost check

Checked from the repo text:
- 12 × $14.95 = $179.40.
- 12 × $29.95 = $359.40.
- 10 × $17 = $170, and 100 × $17 = $1,700.
- $100 + 100 × $2 = $300, and $100 + 1,000 × $2 = $2,100.
- 12 × $1,000 = $12,000; 12 × $1,200 = $14,400; 12 × $2,000 = $24,000.

All are correct, and Codex also found them consistent. Two points remain:
- The 12-month figures assume a 12-month commitment that the reviewed terms don't establish. They are already labeled "illustrative".
- The 1 Jan 2026 notice (C11) covers only the $2, $1,000, $1,200 and $2,000 changes. It does not confirm the $17 or $100 figures. The matrix already flags the $17 as unknown at `matrix.md:44`, but `recommendation.md:33` lists it as a verified unit.

## Passes, with limits

- **No scope violations.** In the inspected text there is no live query, account, purchase or contact. Codex reports the diff is Markdown only.
- **BMAD:** the manifest shows 6.12.4, and the Deep Recon skill is in the catalog (`_bmad/_config/bmad-help.csv:28`).
- **Plan-and-proceed run:** this is disclosed and consistent with the headless mode Codex says it checked.
- **Risk register:** it keeps R01–R04 and the rest OPEN without closing any, but needs the F1 wording update (line 52).
- **Memlog tallies:** 21 entries (1 decision, 1 assumption, 3 events, 5 source batches, 11 claims: 10 verified, 1 disputed) match the file I read. The "disputed" claim needs the F1 correction event.
- **Acceptance scenarios:** CF-01 to CF-10 cover every AC5 item, and LS-01 to LS-10 cover the legal-source negatives. They are labeled as planned, not passing tests.
- **Research is not presented as TDD** in the builder evidence.

## Needed before re-review

The builder should make the narrow corrections for items 1–5 above, add a correction event to the memlog and builder evidence, and re-run the link and citation checks. The P3 items can be fixed in the same pass or deferred, with a note in the handoff. Codex should then re-verify, and the owner decides on merge afterward. No owner approval, merge, paid access, live query or legal certification is implied by this review.
