# E0-S2 builder evidence — feasibility and source readiness

Builder: DeepSeek. Status: **BOUNDED CORRECTIONS APPLIED — STOPPED FOR FRESH CODEX VERIFICATION AND ACTUAL CLAUDE FOLLOW-UP.** This is research evidence, not TDD, not legal advice, not permission for live access and not a merge request. No account, purchase, access request, live case query, court contact, provider call, merge, push or deployment occurred. The real `.env` was not read.

## Identity and scope

- Story: `docs/stories/E0-S2-source-readiness.md`. Delivery sequence: `docs/planning/RISK_DRIVEN_DELIVERY.md` slice 2.
- Original research date: 2026-11-23. Correction date: **2026-11-24** (America/New_York). Workspace: `<repo>`.
- Branch: `feature/e0-s2-source-readiness`, based on local `main` merge `04a0fb8dcad1d539aaf44e56d28fe63d6e9d8dec`. No application, dependency, database, migration or generated implementation-spec change.
- BMAD: stable **6.12.4** verified in `_bmad/_config/manifest.yaml`; the installed `bmad-deep-recon` skill was rendered/activated through the project tooling. No install or version change.
- Workflow: **Deep Recon `run` intent**, type **`domain`**, `standard` preset, `validation: normal`, inline sequential (no subagent fan-out), breadth-first dimensions, max 8 sources/round and depth 2 as configured. The DSH runtime is autonomous with an explicit owner-approved research scope, so the plan was recorded as a decision/assumption and research proceeded rather than inventing an interactive approval.
- Run workspace: `_bmad-output/planning-artifacts/research/domain-georgia-nebraska-court-access-and-author-2026-11-23/` with `research.md`, `digests/` and `.memlog.md`. Memlog after correction: **23 entries — 5 source batches, 12 claim entries (11 verified; 1 retained historical entry for the original disputed lookup, superseded by ref=L3's verified correction), 1 decision, 1 assumption, 4 events**. Mechanical citation check: **21 markers / 21 appendix rows, 0 dangling, 0 orphaned, ok=true — run report only.**
- Scope: official court-access matrix for Georgia and Nebraska; dated legal-source inventory; feasibility recommendation; fallback and future negative-path scenarios; bounded dependency decisions; reviewable handoff.
- Exclusions preserved: no authentication, private records, uploads, live court integration, paid access, provider selection, hosting, forms, deployment or next coding story.

## Correction history (preserve, do not rewrite original history)

- **2026-11-23 builder run:** public-source lookup did **not** find an official EEOC rescission notice; the 2012 guidance was marked disputed/unresolved based on a secondary report. Other limitations (FTC 403, U.S. Code 404, unretrieved Nebraska bulk agreements, secondary Georgia rule text) were recorded.
- **2026-11-23 independent Codex verification of `1b14185`:** found the official EEOC **2026-10-29** announcement reporting the vote and immediate rescission of the 2012 arrest/conviction enforcement guidance. The builder's missed lookup is preserved as history; this correction adopts the official outcome. The separate Q&A and the 2014 joint EEOC/FTC guidance are **not assumed** rescinded and remain separately qualified.
- **2026-11-24 corrections:** reclassified the 2012 guidance historical/rescinded; added the official announcement and Federal Register corroboration; separated Nebraska one-time redistribution terms from the subscriber software licence and unreviewed bulk agreements; restored the mandatory fictional-search-plus-manual-lookup fallback; qualified Georgia no-statewide-search, name-search, login, Rule 21 scope, juvenile-text and PeachCourt date claims; added coverage/permission unknowns and CF-11–CF-13 scenarios; corrected evidence coverage and citation-check scope; appended memlog correction event/claim.

## Source coverage — what was actually read, identified only, or failed

- **Directly fetched/parsed by the builder:** C1–C11 (C3 and C11 PDF text parsed; GSCCCA terms; Nebraska case-information/records policy/subscriber/one-time/subscription terms), C17, C18 (home/redirect), L1 (GPO 2023 FCRA text), L2, L3 (original pages), L7, L8, L9 (partial extraction), L15, L16, L17–L24 (Nebraska statutes/policy/opinions/legal aid). No live case query, login or purchase.
- **Identified only/secondary, not directly fetched:** C13 (secondary USCR 21 reproduction; official rule text pending), C15 (county clerk description; underlying §15-11-704 text not parsed), L10 (same Rule 21 limitation), L11 (county reference), L14 (legislature URL not fetched), L25 (Nebraska bar URL not fetched), L4 (Title VII text not fetched), L6 (eCFR not fetched), C12 (homepage read; exact case coverage remains an inference).
- **Failed/inaccessible:** L5 FTC employer-guidance page returned HTTP 403; the U.S. Code direct section page returned 404; Nebraska bulk/subscription agreement PDFs returned 404/not retrievable; the 2012 guidance URL returned 404 during Codex's independent check; Codex reported a Nebraska fee-PDF screenshot/cache failure while the parsed text and portal were readable.
- **Observed by independent Codex check, not re-fetched by builder:** L3a EEOC 2026-10-29 announcement; L3b Federal Register public-inspection cancellation notice (process corroboration only). The builder accepts those observations as review evidence, not as its own direct lookup.
- **No live query, login, purchase, account, agency message, scraping or court-record retrieval** occurred. No application checks were run: this slice changed Markdown only, deliberately per the story's stopping rule.

## Citation-check scope and crosswalk

The 21/21 citation check covers only the Deep Recon run report (`research.md`), not every claim in the matrix/inventory/recommendation. The report's `[n]` numbering and the research documents' `C#`/`L#` IDs differ; this is the concise crosswalk:

`[1]=C1, [2]=C2, [3]=C3, [4]=C4, [5]=C6, [6]=C15, [7]=C7, [8]=C9, [9]=C8, [10]=C11, [11]=C10, [12]=L1, [13]=L2, [14]=L3, [15]=C13, [16]=L8, [17]=L17, [18]=L18, [19]=L19, [20]=L20, [21]=L3a.`

## Deliverables

- `docs/research/E0-S2-court-access-matrix.md` — GA/NE entry points, coverage, name search, public/restricted records, accounts, service-specific terms/automation, fees, redistribution, manual fallback, source register and unknowns.
- `docs/research/E0-S2-legal-source-inventory.md` — federal, Georgia and Nebraska candidate sources with issuer, jurisdiction, URL, dates/version, reuse/access conditions, status and legal-review gaps; EEOC correction history preserved.
- `docs/research/E0-S2-recommendation.md` — fallback recommendation, alternatives, documented cost units, planned court/legal negative-path scenarios, dependency decisions and owner questions.
- This evidence file; risk-register references; Deep Recon run workspace (`research.md`, digests, memlog); preserved Codex/Claude review files.

## Requirement and risk mapping

| Requirement / risk | Research evidence | Status |
| --- | --- | --- |
| FR-16–20 (curated legal information, citations, jurisdiction/date, uncertainty, abstention) | Legal-source inventory; LS-01–LS-10 planned scenarios; explicit gaps requiring qualified legal review | **Research evidence only — implementation gate OPEN** |
| FR-21–27 (court search, permitted access, candidates, explicit selection, manual fallback, restrictions) | Court-access matrix; CF-01–CF-13 planned scenarios; no permitted automation established | **Research evidence only — implementation gate OPEN** |
| NFR-04/07–12/17/21–22 (secrets, minimization, citations, uncertainty, AI/source labels, qualified review, fictional data) | Reuse/access notes; no real records; fictional/manual recommendation; legal-review gaps | **Preserved; future implementation controls OPEN** |
| AD-05 / AD-07 | No live integration prescribed; both fallback capabilities retained; source/version/claim-support gaps identified | **Research supports the approved fallback; no new architecture approval** |
| R01 court access/permission | No documented public API or written automation/display permission established; GA fragmented; NE paid/service-specific | **OPEN** — research evidence recorded; live access not authorized |
| R02 fees | Documented GA/NE units with source-specific notes; no purchase; totals unknown; owner decision required | **OPEN** — owner budget decision outstanding |
| R03 match ambiguity | Planned CF-01/02/06/08/11/13; selection not identity verification | **OPEN** — future implementation/tests |
| R04 legal hallucination/staleness | Source inventory with dates/versions; EEOC 2012 guidance now historical/rescinded; LS scenarios; qualified review gate | **OPEN** — no legal review or content certification |
| R06 schedule/scope | Bounded research plus correction pass; next slice identified | **OPEN** — later stories unimplemented |
| R07 service unavailable | Manual fallback and outage scenarios planned; no live dependency activated | **OPEN** — future E6 tests |
| R08 independent review | Codex/Claude reviews occurred and required corrections; fresh re-verification pending | **OPEN — AWAITING RE-VERIFICATION** |
| R10 framework drift | BMAD 6.12.4 verified; no dependency change | **AWAITING INDEPENDENT VERIFICATION** for this slice |
| R22 fictional/live provenance | Persistent-label requirement CF-09; CF-03 fictional-dataset wording; fallback recommendation | **OPEN** — future implementation/tests |
| R23 honest evidence | Correction history, failures and unknowns recorded; no fabricated RED/GREEN; citation scope narrowed | **AWAITING RE-VERIFICATION** |
| R24 scope creep | Research only; no code, auth, paid access or provider selection | **AWAITING RE-VERIFICATION** |

No risk is closed by this research. Passing research does not mitigate future implementation risks.

## Acceptance criteria mapping

| AC | Evidence | Status |
| --- | --- | --- |
| 1. Separate GA/NE official-source matrix with coverage, search, restrictions, terms, automation, fees, redistribution, manual lookup | Court-access matrix, source register C1–C18; unknowns explicit | Met as research; permission/coverage unknowns explicit |
| 2. Traceable dated evidence with URL/title/section/quote, fact/inference/unknown distinctions | Source registers and confidence labels; 2026-11-23 access date; correction history | Met; secondary/limited sources and failed lookups marked |
| 3. Legal-source inventory with issuer/jurisdiction/subject/URL/dates/version/reuse/gaps | `E0-S2-legal-source-inventory.md` L1–L25 incl. L3a/L3b | Met as candidate inventory; legal review pending |
| 4. Feasibility recommendation with alternatives and documented cost units | `E0-S2-recommendation.md` decision summary, options table, assumptions | Met; live access not feasible on current evidence |
| 5. Fallback and future acceptance scenarios | CF-01–CF-13, LS-01–LS-10; manual-only marked insufficient | Met as planned scenarios, explicitly not passing tests |
| 6. Bounded dependency decisions; E1-S1 next; no new provider/auth/hosting | Recommendation dependency section; no code/config change | Met |
| 7. Reviewable handoff with blockers and risk refs; stop for fresh Codex/Claude | This file, risk register update, deliverables, preserved review files | Met; fresh independent verification pending |

## Limitations and blockers

- **No permission or API established.** Absence of a documented permission is a blocker, not a finding that permission is impossible. The owner would need to request written terms for any live option.
- **No qualified legal review.** The inventory is candidate source material; no source is certified to support a future legal claim. FCRA currency, separate Q&A/2014 guidance status, state-law overlays and record-restriction eligibility all require legal review.
- **Incomplete official text:** Georgia USCR 21 came from a secondary reproduction; §15-11-704 from a county-official description; §34-1-2 text was not cleanly extracted. Do not treat these as final legal text.
- **No current total cost:** documented units only; coverage, taxes, convenience fees, agreements and integration costs are unknown.
- **No live query or account:** the matrix describes public documentation, not actual search results or record accuracy.
- **No TDD claim:** research/source inspection is not a behavior test. Mandatory TDD resumes with application code (E1-S1 onward).
- **Independent gates:** Codex and actual Claude review occurred on `1b14185` and required these bounded corrections; fresh re-verification and Claude follow-up are pending. Owner merge approval has not been given. No merge, push or deployment was performed.

## Handoff

- Owner decisions needed: approve the approved fictional-search-plus-manual-lookup fallback for E6 (both capabilities); decide whether to seek written paid-access terms; name the qualified legal reviewer for E4/E5; confirm referral links/retention policy if case data is ever displayed.
- Recommended next coding slice: **E1-S1 authentication/sessions**, not implemented here.
- Review this corrected research for source accuracy, scope discipline and whether any claim exceeds its cited evidence. Fresh Codex verification and actual Claude follow-up remain separate gates.
