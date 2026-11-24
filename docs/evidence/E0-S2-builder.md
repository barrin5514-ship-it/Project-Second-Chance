# E0-S2 builder evidence — feasibility and source readiness

Builder: DeepSeek. Status: **RESEARCH COMPLETE — STOPPED FOR CODEX INDEPENDENT VERIFICATION AND ACTUAL CLAUDE REVIEW.** This is research evidence, not TDD, not legal advice, not permission for live access and not a merge request. No account, purchase, access request, live case query, court contact, provider call, merge, push or deployment occurred. The real `.env` was not read.

## Identity and scope

- Story: `docs/stories/E0-S2-source-readiness.md`. Delivery sequence: `docs/planning/RISK_DRIVEN_DELIVERY.md` slice 2.
- Date: 2026-11-23. Workspace: `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance`.
- Branch: `feature/e0-s2-source-readiness`, based on local `main` merge `04a0fb8dcad1d539aaf44e56d28fe63d6e9d8dec`. No application, dependency, database, migration or generated implementation-spec change.
- BMAD: stable **6.12.4** verified in `_bmad/_config/manifest.yaml`; the installed `bmad-deep-recon` skill was rendered/activated through the project tooling. No install or version change.
- Workflow: **Deep Recon `run` intent**, type **`domain`**, `standard` preset, `validation: normal`, inline sequential (no subagent fan-out), breadth-first dimensions, max 8 sources/round and depth 2 as configured. The DSH runtime is autonomous with an explicit owner-approved research scope, so the plan was recorded as a decision/assumption and research proceeded rather than inventing an interactive approval.
- Run workspace: `_bmad-output/planning-artifacts/research/domain-georgia-nebraska-court-access-and-author-2026-11-23/` with `research.md`, `digests/` and `.memlog.md`. Memlog tally: **21 entries — 5 source batches, 11 claims (10 verified, 1 disputed), 1 decision, 1 assumption, 3 events**. Mechanical citation check: **20 markers / 20 appendix rows, 0 dangling, 0 orphaned, ok=true**.
- Scope: official court-access matrix for Georgia and Nebraska; dated legal-source inventory; feasibility recommendation; fallback and future negative-path scenarios; bounded dependency decisions; reviewable handoff.
- Exclusions preserved: no authentication, private records, uploads, live court integration, paid access, provider selection, hosting, forms, deployment or next coding story.

## Actual evidence work

- Inspected the cited official/limited sources across both research documents (20 core report citations plus inventory entries C1–C18 / L1–L25) on 2026-11-23: Georgia Judicial Council E-Access/Data pages, GSCCCA terms/home, PeachCourt 2025 terms (PDF parsed), Georgia official code volumes (Title 50/35/34; selected sections text-extracted), Georgia juvenile/rule references, Georgia appellate entry points, EEOC/FTC guidance, FCRA U.S. Code, Nebraska Judicial Branch case-information and records-search policy, Nebraska.gov subscriber/one-time terms, Nebraska 2026 fee notice (PDF parsed), Nebraska statutes §§29-2264, 48-1101/1104, 84-712, 43-2,108, Nebraska appellate opinions, legal-aid referrals.
- **Access failures recorded, not worked around:** FTC employer-guidance page returned HTTP 403; the U.S. Code direct section page returned 404 (used the GPO 2023 subchapter instead); Nebraska bulk/subscription agreement PDFs were not retrievable; Georgia USCR 21 official text was not obtained (secondary reproduction used, marked limited); Georgia §34-1-2 statutory text was not cleanly extractable from the volume; Georgia §15-11-704 was confirmed through a county-official page, not the code text.
- **Disputed finding:** EEOC's 2012 arrest/conviction guidance remained published on 2026-11-23, while a secondary report claimed a 2026-10-29 rescission. No official rescission notice was found; marked **unresolved** and not relied on as current policy.
- **No live query, login, purchase, account, agency message, scraping or court-record retrieval** occurred. Only public documentation/landing/help/terms pages and public opinion listings were read.
- No application checks were run: this slice changed Markdown only. That is deliberate per the story's stopping rule, not a skipped application test report.

## Deliverables

- `docs/research/E0-S2-court-access-matrix.md` — GA/NE entry points, coverage, name search, public/restricted records, accounts, terms/automation, fees, redistribution, manual fallback, source register and unknowns.
- `docs/research/E0-S2-legal-source-inventory.md` — federal, Georgia and Nebraska authoritative-source candidates with issuer, jurisdiction, URL, dates/version, reuse/access conditions, status and legal-review gaps.
- `docs/research/E0-S2-recommendation.md` — fallback recommendation, alternatives, documented cost units, planned court/legal negative-path scenarios, dependency decisions and owner questions.
- This evidence file; risk-register references; Deep Recon run workspace (`research.md`, digests, memlog).

## Requirement and risk mapping

| Requirement / risk | Research evidence | Status |
| --- | --- | --- |
| FR-16–20 (curated legal information, citations, jurisdiction/date, uncertainty, abstention) | Legal-source inventory; LS-01–LS-10 planned scenarios; explicit gaps requiring qualified legal review | **Research evidence only — implementation gate OPEN** |
| FR-21–27 (court search, permitted access, candidates, explicit selection, manual fallback, restrictions) | Court-access matrix; CF-01–CF-10 planned scenarios; no permitted automation found | **Research evidence only — implementation gate OPEN** |
| NFR-04/07–12/17/21–22 (secrets, minimization, citations, uncertainty, AI/source labels, qualified review, fictional data) | Reuse/access notes; no real records; fictional/manual recommendation; legal-review gaps | **Preserved; future implementation controls OPEN** |
| AD-05 / AD-07 | No live integration prescribed; fallback recommended; source/version/claim-support gaps identified | **Research supports the approved fallback; no new architecture approval** |
| R01 court access/permission | No documented public API or written automation permission; GA fragmented; NE paid/contracted | **OPEN** — research evidence recorded; live access not authorized |
| R02 fees | Documented GA/NE units; no purchase; totals unknown; owner decision required | **OPEN** — owner budget decision outstanding |
| R03 match ambiguity | Planned CF-01/02/06/08; selection not identity verification | **OPEN** — future implementation/tests |
| R04 legal hallucination/staleness | Source inventory with dates/versions; LS scenarios; qualified review gate | **OPEN** — no legal review or content certification |
| R06 schedule/scope | Bounded research only; next slice identified | **OPEN** — later stories unimplemented |
| R07 service unavailable | Manual fallback and outage scenarios planned; no live dependency activated | **OPEN** — future E6 tests |
| R08 independent review | No live use; Codex/Claude gates pending | **OPEN** — no real-use claim |
| R10 framework drift | BMAD 6.12.4 verified; no dependency change | **AWAITING INDEPENDENT VERIFICATION** for this slice |
| R22 fictional/live provenance | Persistent-label requirement in CF-09; fallback recommendation | **OPEN** — future implementation/tests |
| R23 honest evidence | Sources, failures and unknowns recorded; no fabricated RED/GREEN | **AWAITING INDEPENDENT VERIFICATION** |
| R24 scope creep | Research only; no code, auth, paid access or provider selection | **AWAITING INDEPENDENT VERIFICATION** |

No risk is closed by this research. Passing research does not mitigate future implementation risks.

## Acceptance criteria mapping

| AC | Evidence | Status |
| --- | --- | --- |
| 1. Separate GA/NE official-source matrix with coverage, search, restrictions, terms, automation, fees, redistribution, manual lookup | Court-access matrix, source register C1–C18 | Met as research; permission unknowns explicit |
| 2. Traceable dated evidence with URL/title/section/quote, fact/inference/unknown distinctions | Source registers and confidence labels in both research docs; 2026-11-23 access date | Met; secondary/limited sources marked |
| 3. Legal-source inventory with issuer/jurisdiction/subject/URL/dates/version/reuse/gaps | `E0-S2-legal-source-inventory.md` L1–L25 | Met as candidate inventory; legal review pending |
| 4. Feasibility recommendation with alternatives and documented cost units | `E0-S2-recommendation.md` decision summary, options table, assumptions | Met; live access not recommended |
| 5. Fallback and future acceptance scenarios | CF-01–CF-10, LS-01–LS-10 | Met as planned scenarios, explicitly not passing tests |
| 6. Bounded dependency decisions; E1-S1 next; no new provider/auth/hosting | Recommendation dependency section; no code/config change | Met |
| 7. Reviewable handoff with blockers and risk refs; stop for Codex/Claude | This file, risk register update, deliverables | Met; independent review pending |

## Limitations and blockers

- **No permission or API established.** Absence of a documented permission is a blocker, not a finding that permission is impossible. The owner would need to request written terms for any live option.
- **No qualified legal review.** The inventory is candidate source material; no source is certified to support a future legal claim. FCRA currency, EEOC guidance status, state-law overlays and record-restriction eligibility all require legal review.
- **Incomplete official text:** Georgia USCR 21 came from a secondary reproduction; §15-11-704 from a county-official page; §34-1-2 text was not cleanly extracted. Do not treat these as final legal text.
- **No current total cost:** documented units only; coverage, taxes, convenience fees, agreements and integration costs are unknown.
- **No live query or account:** the matrix describes public documentation, not actual search results or record accuracy.
- **No TDD claim:** research/source inspection is not a behavior test. Mandatory TDD resumes with application code (E1-S1 onward).
- **No independent gates:** Codex verification and actual Claude review have not occurred for E0-S2; owner merge approval has not been given. No merge, push or deployment was performed.

## Handoff

- Owner decisions needed: approve fallback for E6; decide whether to seek written paid-access terms; name the qualified legal reviewer for E4/E5; confirm referral links/retention policy if case data is ever displayed.
- Recommended next coding slice: **E1-S1 authentication/sessions**, not implemented here.
- Review this research for source accuracy, scope discipline and whether any claim exceeds its cited evidence. Codex verification and actual Claude review remain separate gates.
