# E0-S2 feasibility recommendation

Research date: **2026-11-23**. This document converts the [court-access matrix](E0-S2-court-access-matrix.md) and [legal-source inventory](E0-S2-legal-source-inventory.md) into **proposals** for the owner. It does not grant permission, approve spending, select a provider or authorize implementation. No account, purchase, access request, live query or agency contact occurred.

## Decision summary

1. **Do not build automated live court-record access in the capstone MVP.** Neither state provides a documented public case-search API with redistribution rights. Georgia has no statewide public case search and its reviewed vendor/authority terms prohibit automated collection; Nebraska's statewide access is paid, contracted and limited to end-user/personal use, with no documented display/redistribution permission.
2. **Use the already-approved functional fictional search plus guided official manual lookup** for E6. Make the fictional/live distinction unmistakable and carry it through candidate lists, selection and any export.
3. **Treat paid Nebraska access and any Georgia vendor/authority permission as owner decisions for a later, separately scoped integration.** Do not purchase, register, request access or write an adapter now.
4. **Use the legal-source inventory as a candidate corpus, not as approved legal content.** A qualified legal reviewer must approve source versions, scope, jurisdiction/date rules and claim-support criteria before E4/E5 expose legal statements.
5. **Proceed next with E1-S1 authentication** as the next coding slice, because private cases/documents depend on accounts and authorization. This research does not implement it.

## Georgia recommendation

**Recommendation: approved fictional/manual fallback; live automation not approved.**

Reasons (verified unless noted):

- The Judicial Council's E-Access page is a court-by-court vendor redirect table, not a statewide search; it states an account is required. [C1][C2]
- Reviewed GSCCCA terms prohibit robots/spiders/automated devices and prohibit compiling, bundling or sharing its materials without express written permission; accounts are per-user and image access is print-only. [C4]
- Reviewed PeachCourt terms charge per document/page and prohibit collecting data in a way that avoids billing. [C3]
- Juvenile records are protected by law and must not be exposed as ordinary public records. [C15]
- No official public search API, written automation permission or statewide coverage statement was found. These remain **unknown**.

**Allowed fallback:** a user-initiated page that opens the official E-Access/vendor or county clerk route, states which court/vendor the user is visiting, warns that the destination's terms govern, and never fetches case data itself. The interface must not imply that a vendor search covers all Georgia courts.

## Nebraska recommendation

**Recommendation: approved fictional/manual fallback; paid live access deferred to the owner.**

Reasons (verified unless noted):

- JUSTICE/SCCALES provide statewide trial/appellate search, but remote access is paid: $17 one-time (30 records/3 days) or $100/year plus $2 per case detail. [C6][C9]
- Bulk/index options are $1,000–$2,000 per month and are contracted services. [C8][C11]
- One-time terms prohibit redistribution/republishing/retransmission; the subscriber agreement is a non-transferable end-user license with audit/compliance obligations. [C9][C10]
- No public search API or display/redistribution permission was found. These remain **unknown**.

**Allowed fallback:** guided manual lookup links to the official one-time search, courthouse/law-library JUSTICE terminal guidance, clerk contacts and the Judicial Branch case-information page. The app must not submit searches or display retrieved case data without a written data-use agreement.

**If the owner later wants live Nebraska access:** require a written agreement that expressly permits application display/use, a budget approval, retention/redaction rules, and a security review before any code. A personal subscriber account is not sufficient for an application that displays case data to users.

## Options and documented cost units

No option is purchased or activated. Figures are documented public units, not quotes or total project costs. Annualized figures are illustrative arithmetic (12 months), not budgets.

| Option | Jurisdiction | Documented units | Illustrative annualized arithmetic | Status |
| --- | --- | --- | --- | --- |
| Manual official lookup | GA + NE | $0 app cost; user may pay the official provider directly | $0 to the project; user-borne fees unknown | **Recommended fallback** |
| Fictional labeled demo | GA + NE | $0 external data cost; synthetic fixtures only | $0 | **Recommended fallback** |
| GSCCCA Regular account | GA | $14.95/month per user; $5 single-use; $0.50/page print | 12 × $14.95 = **$179.40/user/year** (before print) | Restricted/paid; no automation permission found |
| GSCCCA Premium account | GA | $29.95/month per user | 12 × $29.95 = **$359.40/user/year** | Restricted/paid; no automation permission found |
| PeachCourt document access | GA | $2.00/document + $0.50/page + 3.5% + $0.30 convenience | Per-document; no statewide total possible | Restricted/paid; anti-data-collection clause |
| NE one-time search | NE | $17/search, up to 30 records, 3 days | 10 searches = **$170**; 100 = **$1,700** | Restricted/paid; personal view/print only |
| NE subscriber + details | NE | $100/year + $2/case detail | 100 details = **$300/year**; 1,000 = **$2,100/year** | Restricted/paid; no display permission established |
| NE bulk case search | NE | $1,000/month up to 20,000; $2 after | 12 × $1,000 = **$12,000/year** | Contract required; not approved |
| NE New Case Index | NE | $1,200/month | **$14,400/year** | Contract required; not approved |
| NE Statewide Case Index | NE | $2,000/month | **$24,000/year** | Contract required; not approved |

**Assumptions and unknowns:** fees may change (Nebraska's 1 Jan 2026 notice already changed several); taxes/convenience fees may apply; Georgia per-court/vendor coverage is incomplete; Nebraska bulk agreements were not retrievable in this run; no price includes integration, storage, redaction, security or legal review. Do not treat these numbers as a purchase recommendation.

## Alternatives assessment

| Alternative | Benefits | Risks/costs | Recommendation |
| --- | --- | --- | --- |
| Automated live court search | Potentially current candidates | No permission/API found; anti-automation terms; fees; identity false-match risk; redistribution/retention unclear; high security/legal burden | **Reject for MVP**; revisit only with written permission and a separately scoped story |
| Paid manual access by staff/owner | Uses official source; no scraping | Per-search cost; personal-use limits; not a user product feature | Allowed for owner research, not application automation |
| Fictional labeled search + manual official lookup | Approved fallback; testable; no provider dependency; preserves No False Hope | Not live; user must complete official lookup | **Adopt for E6** |
| Guided manual lookup only | Simplest, no fabricated results | Less product value than a fictional demo | Acceptable subset; prefer fictional demo + manual links |
| Wait for a court API/permission | Avoids unauthorized access | Schedule/feasibility unknown; capstone must proceed | Keep as a future option; do not block MVP |

## Fallback acceptance scenarios (planned tests, not implemented)

These become acceptance tests in E6 after the owner approves the fictional/manual story. They are **not passing tests** today.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| CF-01 | Same-name candidate | Show it as a **possible** candidate with source, court, jurisdiction and available distinguishing details; never say identity verified |
| CF-02 | Multiple candidates | List all returned candidates; require explicit user selection; preserve labels after selection |
| CF-03 | No candidates | Say no results were returned by the searched fictional/official source; “no results” is not proof no case exists; offer manual lookup |
| CF-04 | Access denied/outage | Show an actionable unavailable state and official manual route; no fabricated or cached “live” results |
| CF-05 | Wrong jurisdiction | Require jurisdiction selection and keep results scoped; do not merge GA/NE or fictional/live results |
| CF-06 | Missing distinguishing data | Display “unknown” fields; do not rank or assert a match from name alone |
| CF-07 | Stale/broken official link | Show last-checked date, explain the link may have moved, and offer the official court/clerk starting point; never silently substitute a different source |
| CF-08 | User selection | Record that the user selected a candidate, with source and time; selection is not identity verification or legal confirmation |
| CF-09 | Fictional/live labels | Persistent `FICTIONAL DEMO — NOT LIVE RECORDS` or `OFFICIAL MANUAL LOOKUP` labels on list, detail, selection and export; no mixing |
| CF-10 | Automated collection attempt | No application code fetches case data from a court/vendor; only user-initiated navigation to official pages is allowed |

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

1. **Before E6 live court work:** owner decision on live vs fallback; written court/vendor permission or contract; budget; redistribution/retention terms; security/privacy review; no real records. Until then, only the fictional/manual fallback is authorized.
2. **Before E4 legal-information activation:** qualified legal review of the source inventory; source version/effective-date policy; jurisdiction/period filters; claim-support/abstention criteria; referral resources; no individualized legal advice.
3. **Before E5 employment-notice assistance:** current FCRA/Title VII/EEOC status (including the disputed 2026 EEOC rescission report); state-law overlays; explicit notice facts with source spans; user review before any copy/export; no automatic send or filing.
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
