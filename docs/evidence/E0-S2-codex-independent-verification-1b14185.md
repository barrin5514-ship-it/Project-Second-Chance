# E0-S2 independent Codex verification — 1b14185

Date: 2026-11-23 (America/New_York). Reviewed commit: `1b1418543ed5b19b533ed678e665769dafa5c561`, branch `feature/e0-s2-source-readiness`.

## Verdict: corrections required before merge

The bounded research usefully supports the already-approved functional fictional search plus guided official lookup fallback. Current permission to automate or redistribute live case data has not been established. However, the candidate legal-source status, a contract-scope inference, and one proposed MVP alternative need correction before this research becomes downstream authority. Codex did not edit the builder's research or implement application code.

## Findings

### F1 — P2: official EEOC rescission evidence was missed

`docs/research/E0-S2-legal-source-inventory.md:13` labels the rescission secondary-only disputed/unresolved and says no official notice was found. This status also appears in the run report, digest, memlog, builder evidence and recommendation. Independent public-source verification found the [EEOC's 2026-10-29 announcement](https://www.eeoc.gov/newsroom/eeoc-votes-rescind-enforcement-guidance-arrest-and-conviction-records), which reports the vote and immediate rescission of the 2012 guidance. The [Federal Register meeting-cancellation notice](https://public-inspection.federalregister.gov/2026-22407.pdf) separately records that the matter had been decided by notation vote; the cancellation notice alone is not a substitute for the EEOC announcement's explicit outcome.

Correct the current source status and affected summaries. Mark the 2012 guidance as historical/rescinded, not an approved current source. Add the official announcement and access date, preserving the original failed/missed lookup as historical evidence rather than silently rewriting the research history. The continuing availability of a Q&A or historical PDF does not establish current policy. Do not infer that rescission repeals statutes or eliminates anti-discrimination obligations; individualized legal conclusions still require qualified review. The directly cited guidance URL returned 404 during this independent check.

### F2 — P2: manual-only alternative contradicts the approved fallback

`docs/research/E0-S2-recommendation.md:68` calls guided manual lookup alone an acceptable subset. The PRD/story require a functional labeled fictional search **plus** guided official lookup when permitted live access is unavailable. Change the alternative to explicitly insufficient for completion unless the owner separately approves a scope change. Preserve both capabilities in downstream acceptance criteria; research approval cannot silently remove one.

### F3 — P2: distinguish software licensing from court-data restrictions

The recommendation and matrix use the general Nebraska subscriber agreement's non-transferable end-user license to characterize access/data-display restrictions. The [agreement, Conditions of Use 4.5](https://www.ne.gov/subscriber/tac.html) expressly addresses provided **software**. Its separate copyright/limitations clause requires compliance with applicable restrictions; neither clause by itself proves a blanket personal-use-only license for all subscriber court data. The [one-time search terms](https://www.nebraska.gov/justicecc/terms_and_conditions.html), by contrast, explicitly prohibit redistribution of information from that service.

Keep those service-specific statements separate. For subscriber/bulk data display, state that affirmative permission was not established and applicable agreements remain unreviewed/unknown; do not extend the one-time service prohibition or software license into a proven universal restriction. Retain the no-live-integration gate until appropriate permission is evidenced. The safe fallback recommendation does not require overstating the contract.

### Provenance/qualification notes

- PeachCourt's linked PDF lives in a `/2025/01/` path but identifies its most recent update as **April 13, 2022** on its first page. Calling it the “2025 terms” without distinction is misleading for version tracking. Record hosted-path context separately from the document's stated date; current applicability still needs confirmation before integration.
- Georgia's E-Access page demonstrates court-by-court links, not proof that no statewide option exists anywhere. Qualify the global negative as no single statewide public service established in this bounded review. Preserve the concrete observed coverage and account requirements.

## Independent source checks actually performed

These are public documentation checks, not live case queries, TDD, legal advice or permission grants. Dates are 2026-11-23. The following findings were independently supported or bounded:

| Source | Observation |
| --- | --- |
| [Georgia Courts E-Access](https://georgiacourts.gov/eaccess-court-records/) | Court-specific vendor links and account requirement; no complete statewide coverage established |
| [GSCCCA terms](https://www.gsccca.org/terms-of-use) | Listed $14.95/$29.95 monthly accounts; $5 single-use activation; $0.50 print pages; unauthorized automation and reproduction/compilation restrictions. Exact permission scope matters; not a finding about all Georgia vendors |
| [PeachCourt terms PDF](https://awesome.peachcourt.com/wp-content/uploads/2025/01/230422-PeachCourt-TC-1.pdf) | Parsed pages 6–7 support $2/document, $0.50/page and 3.5% + $0.30 convenience fee; page 10 addresses billing avoidance. Document states 2022 update, not 2025. No purchase or account used |
| [Nebraska case-information page](https://nebraskajudicial.gov/e-services/case-information-eservices) | $17 one-time search; $100 annual subscriber account; $2 case details; trial name-search criteria and appellate case-number requirements |
| [Nebraska one-time terms](https://www.nebraska.gov/justicecc/terms_and_conditions.html) | Three-day access, limit of 30 results, charged no-result search, explicit restrictions on redistributing results |
| [Nebraska subscriber portal](https://www.nebraska.gov/subscriber/) and [fee notice](https://www.nebraska.gov/documents/court-fee-notice.pdf) | $1,000 monthly bulk/20,000 records, $2 excess records, $1,200 new-case index and $2,000 statewide index; Jan 1, 2026 change. The fee notice does not itself authorize data reuse |
| [Nebraska subscriber agreement](https://www.ne.gov/subscriber/tac.html) | Software license and applicable-use conditions; data-display rights not affirmatively established |
| [EEOC announcement](https://www.eeoc.gov/newsroom/eeoc-votes-rescind-enforcement-guidance-arrest-and-conviction-records) | Resolves the reported rescission uncertainty; see F1 |
| [2023 FCRA official edition](https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap41-subchapIII.htm) | Edition is correctly identified as 2023, with current-text verification still required. No section-by-section legal validation performed |
| [Nebraska §43-2,108](https://nebraskalegislature.gov/laws/statutes.php?statute=43-2,108) and [§29-2264](https://nebraskalegislature.gov/laws/statutes.php?statute=29-2264) | Official source entry/text supports inventory subjects; confidentiality has specific categories/exceptions. Broad exclusion of juvenile records is a project safety boundary, not a statement that every juvenile record is universally confidential |

The numerical annualization examples inspected are arithmetically consistent; they are not total-cost quotes. Source-access evidence was sampled for the decision-critical findings, not every legal/referral inventory link. No complete legal or contract interpretation, legal review or statewide completeness certification is claimed. Nebraska fee-PDF screenshot retrieval failed with a cache miss; the textual PDF and matching official portal were readable. PDF fees here were checked from their parsed text.

## Repository/workflow and mechanical checks

- Git confirms `1b14185`, with only owner-local `.vscode/` untracked before this review. Relative to `2f9a0c2`, all 11 changed files are Markdown; no application/dependency/test/config changes.
- Independently counted 20 unique report citation markers and 20 appendix entries: zero dangling/orphaned. Relative Markdown links in changed files resolved locally. `git diff --check` exited 0.
- Independently counted memlog entries: 1 decision, 1 assumption, 3 events, 5 source batches, 11 claims (21 total). Tally consistency is not validation of each claim.
- Installed manifest identifies BMAD 6.12.4. The installed Deep Recon skill's Headless Mode explicitly allows plan-and-proceed, skipping checkpoints and logging assumptions. The documented bounded autonomous run is consistent with that mode; no extra approval is required merely because the interactive mode has a plan checkpoint.
- No application suite was rerun for Markdown-only changes. No live query, login, purchase, message, provider session, merge, push or deployment was performed. Real `.env` values were not read.

## Handoff

DeepSeek should make bounded documentation corrections and propagate current findings into the source register, recommendation, research report/digests, memlog and builder evidence. Preserve historical evidence with an explicit correction event, rerun citation/link checks, and stop for Codex re-verification and actual Claude follow-up. Do not begin E1-S1 application work within this correction pass. Owner merge approval remains pending.
