# E0-S2 — Feasibility and source readiness

Status: ready for DeepSeek's bounded investigation, 2026-11-23. This refines the next slice already selected in `docs/planning/RISK_DRIVEN_DELIVERY.md`. It approves research within the existing architecture; recommendations, source suitability and access feasibility remain proposals until evidenced and accepted. It is not an approved live-integration specification.

## Value and starting point

As the project owner, I want evidence about permitted Georgia/Nebraska court access and authoritative legal sources before we depend on an integration, so the MVP can use the approved fictional/manual fallback if access, coverage or cost is unsuitable.

Work in `feature/e0-s2-source-readiness`, based on local main merge `04a0fb8dcad1d539aaf44e56d28fe63d6e9d8dec`. Mira and E0-S1 are integrated; preserve both. Do not recreate the scaffold or repeat completed setup. Read AGENTS.md, START_NEXT_BUILD.md, the approved PRD/Architecture Spine, risk register and delivery plan. Use installed stable BMAD 6.12.4's relevant research workflow, discovered through its actual catalog; do not install a different version or invent a skill name. Follow required workflow checkpoints while treating settled owner decisions as settled.

## Requirements and risks

Primary links: FR-16–20 and FR-21–27; NFR-04, NFR-07–12, NFR-17, NFR-21–22; AD-05 and AD-07. Applicable risks from the planned slice: R01/R02/R04/R06/R07/R08/R10/R24. Also preserve R03 match ambiguity, R22 fictional/live provenance and R23 honest review/evidence. Research alone does not mitigate the later implementation risks.

## Scope and acceptance criteria

1. **Official court-source matrix, separately for GA and NE.** Identify official entry points, responsible agencies/courts, actual geographic/court-type coverage, name-search availability without a case number, public versus restricted records, login/registration requirements, usage terms, permission for automation/API access, applicable fees, redistribution/retention restrictions and accessibility of guided manual lookup. Do not imply a portal covers every court or that public browser access permits automated collection.
2. **Traceable dated evidence.** Each material finding has a directly supporting official URL, page title, access date, relevant section and a short quote or precise paraphrase. Distinguish verified facts, inference, proposal and unresolved questions. Record inaccessible pages, missing terms or unavailable fees as unknown. Do not invent permission, source versions, statewide coverage, zero-cost access or current prices. Historical PRD prices are not current quotes.
3. **Legal-source inventory.** Identify authoritative sources needed for the approved legal-information and employment-notice workflows (including relevant federal and GA/NE material). Record issuer, jurisdiction, subject, URL, publication/effective dates when available, version/amendment handling, last-checked date, reuse/access conditions, and gaps requiring qualified legal review. This is a source inventory, not substantive individualized legal advice or certification that a source supports every future claim.
4. **Feasibility recommendation with alternatives.** For each jurisdiction recommend permitted live access only where adequately evidenced; otherwise recommend the already-approved functional fictional search plus guided official lookup. Separate free/manual, restricted/paid and unknown options. Include a cost model only if current billing units and costs are documented; show assumptions and unknowns. No purchases, account registrations, access requests or messages are authorized here. Any paid option remains a decision for the owner.
5. **Fallback and future acceptance scenarios.** Specify how later implementation will handle same-name ambiguity, multiple/no candidates, access denial/outage, wrong jurisdiction, unavailable distinguishing data, stale/broken official links, explicit user selection that is not identity verification, and persistent fictional/live labels. Include negative scenarios for stale/conflicting/missing legal sources, wrong effective period and unsupported claims requiring abstention. These are planned tests, not passing tests or implemented features.
6. **Bounded dependency decisions.** Record any court-access or legal-review decisions needed before E6/E4 activate, and carry provider terms/consent, hosting restrictions and budget questions forward to their existing gates. Do not select or wire a new model/hosting provider, build auth, or expand into all future stories. Identify E1-S1 authentication as the next coding slice after this research is accepted, without implementing it here.
7. **Reviewable handoff.** Supply the deliverables below, list open blockers and next decisions, update applicable risk references without closing future controls, then stop for independent Codex source verification and actual Claude review. The owner remains merge authority. An honest blocked/unknown finding is preferable to an invented integration promise.

## Deliverables

- `docs/research/E0-S2-court-access-matrix.md`
- `docs/research/E0-S2-legal-source-inventory.md`
- `docs/research/E0-S2-recommendation.md` (proposals, tradeoffs, decision list and future negative-path acceptance scenarios)
- `docs/evidence/E0-S2-builder.md` (workflow/version, scope, actual evidence checks, requirement/risk mapping, unresolved items and final handoff)
- References in `docs/planning/RISK_REGISTER.md` for actual findings, preserving OPEN status where capability evidence is still missing.

Use public official documentation and public landing/help/terms pages. Do not query a real person's case or identifiers, collect case records, scrape broadly, bypass access controls, contact agencies, create accounts, or start a live Mira/provider session. Do not read real `.env` values. No application, dependency, database, generated implementation spec or migration change is required for this research slice.

## Evidence discipline and stopping rule

Source inspection and research are not TDD. Record actual lookups and manual link verification with dates and limitations; do not fabricate RED/GREEN. Mandatory behavior-by-behavior TDD remains binding for future application code. If investigation reveals a need for implementation, stop at a proposed separately scoped story instead of activating that capability.

Do not rerun the entire application suite repeatedly for research-only Markdown changes. Verify citations, internal links, scope and the documentation diff. Run application checks only if code/config unexpectedly changes and explain why; normally leave such changes to a later story. Save progress after each completed research deliverable and save a clear checkpoint if a source or tool blocks progress. Do not spin indefinitely or silently leave the run marked generating.

Finish by reporting observed findings, unknowns, files changed and the exact Git commit. Builder completion is not Codex verification, Claude review, legal review, or permission for paid/live access. No merge, push or deployment is authorized for this new story.
