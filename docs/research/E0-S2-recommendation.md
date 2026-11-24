# E0-S2 feasibility recommendation

Research date: **2026-11-23**; bounded corrections **2026-11-24**. This document converts the [court-access matrix](E0-S2-court-access-matrix.md) and [legal-source inventory](E0-S2-legal-source-inventory.md) into **proposals** for the owner. It does not grant permission, approve spending, select a provider or authorize implementation. No account, purchase, access request, live query or agency contact occurred.

## Decision summary

1. **Do not build automated live court-record access on current evidence.** No documented public case-search API with redistribution rights was established. No single statewide public Georgia case search was established in this review; reviewed GSCCCA/PeachCourt terms impose source-specific automation/billing restrictions; Nebraska statewide access is paid and its display/redistribution permission is not established. Live access is **not feasible on current evidence** without written permission/contract; revisit only through a separately scoped owner decision.
2. **Use the already-approved functional fictional candidate search plus guided official manual lookup** for E6. Both capabilities are required; manual lookup alone does not complete the approved MVP fallback without a separate owner scope change. Make the fictional/live distinction unmistakable and carry it through candidate lists, selection and any export.
3. **Treat paid Nebraska access and any Georgia vendor/authority permission as owner decisions for a later, separately scoped integration.** Do not purchase, register, request access or write an adapter now.
4. **Use the legal-source inventory as a candidate corpus, not as approved legal content.** A qualified legal reviewer must approve source versions, scope, jurisdiction/date rules and claim-support criteria before E4/E5 expose legal statements.
5. **Proceed next with E1-S1 authentication** as the next coding slice, because private cases/documents depend on accounts and authorization. This research does not implement it.

## Georgia recommendation

**Recommendation: approved MVP fictional/manual fallback; live automation not authorized on current evidence.**

Reasons:

- The Judicial Council's E-Access page is a court-by-court vendor redirect table; no single statewide public case search was established in this bounded review. It states that an account is required for the linked provider search. [C1][C2]
- Reviewed GSCCCA terms prohibit robots/spiders/automated devices and compiling/bundling without express written permission; accounts are per-user and image access is print-only. These findings concern the inspected GSCCCA terms, not every Georgia vendor. [C4]
- Reviewed PeachCourt terms charge per document/page and prohibit collecting data in a way that avoids billing. The document states a 2022-04-13 update; current applicability and canonical host need confirmation. [C3]
- A county clerk describes juvenile records as protected by O.C.G.A. § 15-11-704; the underlying statute text was not independently parsed, and restricted-record handling requires legal review. [C15]
- No official public search API, written automation permission or statewide coverage statement was found. These remain **unknown**.

**Approved MVP fallback:** a user-initiated page that opens the court-designated route (which may be a third-party provider) or county clerk, states which court/provider the user is visiting, warns that the destination's terms govern, and never fetches case data itself. Deep-link terms were not reviewed. The interface must not imply that a provider search covers all Georgia courts.

## Nebraska recommendation

**Recommendation: approved MVP fictional/manual fallback; paid live access deferred to the owner.**

Reasons:

- JUSTICE/SCCALES provide statewide trial/appellate search, but remote access is paid: $17 one-time (30 records/3 days) or $100/year plus $2 per case detail. [C6][C9]
- Bulk/index options are $1,000–$2,000 per month and are contracted services; the 2026 fee notice supports the $2 excess-record charge above 20,000. [C8][C11]
- The **one-time** terms prohibit redistribution/republishing/retransmission. The **subscriber** agreement's non-transferable end-user licence expressly concerns provided **software**; it does not by itself establish a blanket data-display right. Affirmative display/redistribution permission for subscriber/bulk data was not established, and bulk agreements were not retrieved. [C9][C10][C8]
- No public search API or affirmative display/redistribution permission was found. These remain **unknown**.

**Approved MVP fallback:** guided manual lookup links to the free courthouse/law-library JUSTICE terminal guidance, the paid one-time search, clerk contacts, the Judicial Branch case-information page, and the Public Records Act request route (court-record applicability unverified). The app must not submit searches or display retrieved case data without a written data-use agreement.

**If the owner later wants live Nebraska access:** require a written agreement that expressly permits application display/use, a budget approval, retention/redaction rules, and a security review before any code. That a personal subscriber account is insufficient for an application displaying case data is an **inference**, not a reviewed contractual finding.

## Options and documented cost units

No option is purchased or activated. Figures are documented public units, not quotes or total project costs. Annualized figures are illustrative arithmetic (12 months), not budgets.

| Option | Jurisdiction | Documented units | Illustrative annualized arithmetic | Access/cost note | Status |
| --- | --- | --- | --- | --- | --- |
| Fictional labeled demo | GA + NE | $0 external data cost; synthetic fixtures only | $0 | No external lookup; labels persist through selection/export | **Required part of approved MVP fallback** |
| Guided official manual lookup | GA + NE | $0 app cost; users may pay the official provider | $0 to the project; user-borne fees vary | User must complete the lookup; GA may require a vendor account; NE online one-time search costs $17 | **Required part of approved MVP fallback** |
| NE free courthouse/law-library terminal | NE | $0 listed for public terminal access | $0 | In-person; available at courthouses/law libraries; not remote | Approved manual route |
| NE Public Records Act request | NE | Statutory copy fees may apply (actual added cost; §84-712) | Not estimated | Manual written request; court-record applicability unverified | Manual option; legal review needed |
| GSCCCA Regular account | GA | $14.95/month per user; $5 single-use; $0.50/page print | 12 × $14.95 = **$179.40/user/year** (before print) | Account-gated; relevance to criminal case discovery is an inference | Restricted/paid; no automation permission established |
| GSCCCA Premium account | GA | $29.95/month per user; $5 single-use; $0.50/page print | 12 × $29.95 = **$359.40/user/year** (before print) | Account-gated; property/UCC/civil-index focus; coverage inference | Restricted/paid; no automation permission established |
| PeachCourt document access | GA | $2.00/document + $0.50/page + 3.5% + $0.30 convenience | Per-document; no statewide total possible | Third-party account; terms updated 2022-04-13; current applicability unconfirmed | Restricted/paid; anti-data-collection clause |
| NE one-time online search | NE | $17/search, up to 30 records, 3 days | 10 searches = **$170**; 100 = **$1,700** | No-result searches still charged; personal view/print for this service | Restricted/paid; no redistribution |
| NE subscriber + details | NE | $100/year + $2/case detail | 100 details = **$300/year**; 1,000 = **$2,100/year** | General searches free; no affirmative data-display right established | Restricted/paid; permission unknown |
| NE bulk case search | NE | $1,000/month up to 20,000; $2 per excess record | 12 × $1,000 = **$12,000/year** | Contract/index service; agreement not retrieved | Contract required; not approved |
| NE New Case Index | NE | $1,200/month | **$14,400/year** | Contract/index service; agreement not retrieved | Contract required; not approved |
| NE Statewide Case Index | NE | $2,000/month | **$24,000/year** | Contract/index service; agreement not retrieved | Contract required; not approved |
| **Unknown options** | GA + NE | Not priced | Not estimated | Whether any court/authority/vendor will grant written automation or display permission; record date ranges and court-type coverage; current applicability of vendor terms | **Unknown — do not infer permission** |

**Assumptions and unknowns:** fees may change (Nebraska's 1 Jan 2026 notice already changed several); taxes/convenience fees may apply; Georgia per-court/vendor coverage is incomplete; Nebraska bulk agreements were not retrievable in this run; no price includes integration, storage, redaction, security or legal review. Do not treat these numbers as a purchase recommendation.

## Alternatives assessment

| Alternative | Benefits | Risks/costs | Recommendation |
| --- | --- | --- | --- |
| Automated live court search | Potentially current candidates | No permission/API established; source-specific anti-automation terms; fees; identity false-match risk; redistribution/retention unclear; high security/legal burden | **Not feasible on current evidence**; revisit only with written permission/contract and a separately scoped story |
| Paid manual access by staff/owner | Uses official source; no scraping | Per-search cost; service-specific terms; not a user product feature | Allowed for owner research, not application automation |
| Fictional labeled search + guided official lookup | Approved fallback; testable; no provider dependency; preserves No False Hope | Not live; user must complete official lookup | **Required for E6 (both capabilities)** |
| Guided manual lookup only | Simplest, no fabricated results | Removes the approved fictional candidate-search capability | **Insufficient for MVP completion**; permitted only as an interim build step unless the owner separately approves a scope change |
| Wait for a court API/permission | Avoids unauthorized access | Schedule/feasibility unknown; capstone must proceed | Keep as a future option; do not block MVP |

## Fallback acceptance scenarios (planned tests, not implemented)

These become acceptance tests in E6 after the owner approves the fictional/manual story. They are **not passing tests** today.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| CF-01 | Same-name candidate | Show it as a **possible** candidate with source, court, jurisdiction and available distinguishing details; never say identity verified |
| CF-02 | Multiple candidates | List all returned candidates; require explicit user selection; preserve labels after selection |
| CF-03 | No candidates | Say no results were returned by the **searched fictional demo dataset** (fictional mode) or by the official source the user visited (manual route); “no results” is not proof no case exists; offer manual lookup |
| CF-04 | Access denied/outage | Show an actionable unavailable state and official manual route; no fabricated or cached “live” results |
| CF-05 | Wrong jurisdiction | Require jurisdiction selection and keep results scoped; do not merge GA/NE or fictional/live results |
| CF-06 | Missing distinguishing data | Display “unknown” fields; do not rank or assert a match from name alone |
| CF-07 | Stale/broken official link | Show last-checked date, explain the link may have moved, and offer the official court/clerk starting point; never silently substitute a different source |
| CF-08 | User selection | Record that the user selected a candidate, with source and time; selection is not identity verification or legal confirmation |
| CF-09 | Fictional/live labels | Persistent `FICTIONAL DEMO — NOT LIVE RECORDS` or `COURT-DESIGNATED OFFICIAL ROUTE — THIRD-PARTY PROVIDER MAY APPLY` labels on list, detail, selection and export; no mixing |
| CF-10 | Automated collection attempt | No application code fetches case data from a court/vendor; only user-initiated navigation to official pages is allowed |
| CF-11 | Sealed/juvenile/restricted record | Exclude restricted categories from fictional search; do not display or attach sealed/juvenile data; manual route explains the limitation without implying access |
| CF-12 | Minimization and retention | Collect only the minimum query/selection fields; do not store case data by default; if a later approved design stores anything, show retention/deletion terms and redact unrelated identifiers |
| CF-13 | Explicit confirmation before linking | Present a separate confirmation step before linking/attaching a candidate to a case; record the user’s confirmation, source and time; never describe it as identity verification |

## Legal-source acceptance scenarios (planned tests, not implemented)

| ID | Scenario | Required behavior |
| --- | --- | --- |
| LS-01 | Supported claim | Every material legal claim links to an applicable source version/passage; citation presence alone is not enough |
| LS-02 | Unsupported/irrelevant citation | Withhold the claim or label it unsupported; do not present it as verified |
| LS-03 | Stale source | Show effective/review dates and staleness; abstain or qualify when current law is not established |
| LS-04 | Conflicting sources | Show the conflict and uncertainty; do not average or choose silently |
| LS-05 | Wrong jurisdiction/effective period | Reject the mismatch; require applicable jurisdiction/time context before display |
| LS-06 | Missing source | Abstain and offer a referral/next step; never invent a citation or rule |
| LS-07 | Invented deadline/eligibility | Never calculate or assert an unsupported deadline or eligibility outcome |
| LS-08 | Evidence vs interpretation | Separate quoted source facts, user corrections, AI interpretation and legal claims; label each |
| LS-09 | Version/provenance | Store source URL/version/access date/review status with each claim; preserve after edits |
| LS-10 | Qualified review | Human legal review is required before real-user launch; automated checks are not certification |

## Dependency decisions before later activation

1. **Before E6 court work:** implement **both** a functional labeled fictional candidate search **and** guided official manual lookup; manual-only is insufficient without a separate owner scope change. For any live option: owner decision, written court/vendor permission/contract, budget, data-display/redistribution/retention terms, security/privacy review, and no real records. Until then, only the fictional/manual fallback is authorized.
2. **Before E4 legal-information activation:** qualified legal review of the source inventory; source version/effective-date policy; jurisdiction/period filters; claim-support/abstention criteria; referral resources; no individualized legal advice.
3. **Before E5 employment-notice assistance:** current FCRA/Title VII/EEOC status (the 2012 EEOC arrest/conviction guidance is rescinded per the 2026-10-29 announcement; the separate Q&A and 2014 joint guidance are not assumed rescinded and need current-status review); state-law overlays; explicit notice facts with source spans; user review before any copy/export; no automatic send or filing.
4. **Before hosted/provider work:** provider terms/consent, hosting restriction and budget remain at their existing gates; this research does not select a model or host.
5. **Next coding slice:** E1-S1 authentication/session work, with maintained library, Argon2id and negative-path tests. Not implemented here.

## Open blockers / questions for owner

- Is the owner willing to fund and contract a paid Nebraska live feed, or accept the approved fallback for the capstone? Recommendation: fallback now; revisit live only with a written data-use agreement.
- Will the owner request written automation/data-use terms from GSCCCA, PeachCourt and/or Nebraska.gov for a future integration, or defer entirely?
- Who will perform qualified legal review of the source inventory and claim-support policy before E4/E5?
- What retention/redaction policy applies if any case data is ever displayed? (Not decided; default is no case data stored.)
- Confirm the final legal-aid/referral links and any jurisdiction-specific referral wording before user-facing use.

## What this research does not establish

No permission, API access, current total cost, statewide coverage, legal correctness, identity match, deadline, eligibility or integration readiness. The absence of a source in this bounded review is not proof that no such law or service exists.
