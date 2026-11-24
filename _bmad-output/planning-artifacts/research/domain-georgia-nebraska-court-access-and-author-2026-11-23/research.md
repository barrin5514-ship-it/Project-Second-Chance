---
title: 'domain research: Georgia Nebraska court access and authoritative legal sources'
type: 'domain'
topic: 'Georgia Nebraska court access and authoritative legal sources'
decision: 'Whether to pursue permitted live Georgia/Nebraska court access or the approved fictional/manual fallback, and which authoritative legal sources can support later workflows'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-11-23'
updated: '2026-11-23'
---

# domain research: Georgia Nebraska court access and authoritative legal sources

**Decision this research serves:** Whether to pursue permitted live Georgia/Nebraska court access or the approved fictional/manual fallback, and which authoritative legal sources can support later workflows.

**Recommendation:** Adopt the approved fictional search + guided official manual lookup for E6. Do not build automated live court access; no documented public API, redistribution permission or anti-automation exception was found. Defer any paid live integration to a separately scoped owner decision. Use the legal-source inventory as a candidate corpus requiring qualified legal review; proceed next to E1-S1 authentication.

## Findings

1. **Georgia has no single statewide public case search.** The Judicial Council's E-Access page is a court-by-court vendor redirect table and states an account is required [1][2]. GSCCCA terms prohibit robots/spiders/automated devices and compiling/bundling without written permission [4]; PeachCourt charges per document and prohibits data collection that avoids billing [3]. Juvenile records are legally protected [6].
2. **Nebraska has statewide trial/appellate access, but it is paid and contracted.** JUSTICE/SCCALES remote access [5][7] is $17 one-time (30 records/3 days) or $100/year plus $2 per case detail [8]; bulk/index services are $1,000–$2,000/month [9][10]. One-time terms prohibit redistribution; the subscriber agreement is an end-user license [8][11]. No public search API or display/redistribution permission was found.
3. **The cost units are documented; statewide totals and permission are not.** Georgia's GSCCCA accounts are $14.95/$29.95 monthly plus print charges [4]; PeachCourt is $2/document + $0.50/page + 3.5% + $0.30 [3]. No total can be responsibly estimated without coverage and permission.
4. **Authoritative legal sources exist but need version/legal review.** FCRA is available in the U.S. Code but the inspected edition is 2023 and a current section lookup failed [12]; EEOC/FTC guidance is technical assistance, not law [13]. The EEOC's 2012 arrest/conviction guidance remains published, but a secondary report claims a 2026 rescission; status is unresolved [14]. Georgia code volumes are official but partial for the needed sections; §35-3-37 [16], USCR 21 and §15-11-704 were secondary/official-county text only [15][6]. Nebraska statutes §29-2264, §§48-1101/1104, §84-712 and §43-2,108 were inspected on the official legislature site [17][18][19][20].
5. **Fallback controls are clear:** persistent fictional/live labels, candidate ambiguity, no-result/outage/manual fallback, explicit selection not identity verification, stale-link handling, and legal claim support/abstention. These are planned acceptance tests, not implemented features.

## Recommendation and downstream bindings

- E6: approved fictional/manual fallback only. No accounts, purchases, access requests, scraping or adapters.
- If live access is later requested: written court/vendor permission or contract, owner budget approval, data-use/retention/security review, and a separately scoped story.
- E4/E5: qualified legal review of the source corpus, version/effective-date policy, claim-support criteria and referral resources before legal content activates.
- Next coding slice: E1-S1 authentication/session work; not implemented in this research.

## Contrary evidence and limits

- A secondary report claims the EEOC rescinded its 2012 criminal-record guidance on 2026-10-29; the official EEOC pages still published it on 2026-11-23. Treated as unresolved, not settled.
- FTC's employer guidance page returned HTTP 403; content was not inspected.
- Some official Georgia code sections were not cleanly extractable; USCR 21 and juvenile confidentiality rely on secondary/county sources pending official verification.
- No source in this run grants automation or redistribution permission. Absence of a finding is not proof that no such permission exists; it is a blocker to be resolved by the owner.

## Source appendix

| [n] | Source | URL | Accessed |
| --- | --- | --- | --- |
| [1] | Judicial Council of Georgia, E-Access to Court Records | https://georgiacourts.gov/eaccess-court-records/ | 2026-11-23 |
| [2] | Judicial Council of Georgia, Data and Records | https://georgiacourts.gov/data-and-records/ | 2026-11-23 |
| [3] | PeachCourt Terms & Conditions (2025 PDF) | http://awesome.peachcourt.com/wp-content/uploads/2025/01/230422-PeachCourt-TC-1.pdf | 2026-11-23 |
| [4] | Georgia Superior Court Clerks' Cooperative Authority, Terms of Use | https://www.gsccca.org/terms-of-use | 2026-11-23 |
| [5] | Nebraska Judicial Branch, Case Information - eServices | https://nebraskajudicial.gov/e-services/case-information-eservices | 2026-11-23 |
| [6] | Jones County Clerk of Superior Court, Juvenile Division | https://www.jonescountyclerkofcourt.org/juvenile-division | 2026-11-23 |
| [7] | Nebraska Judicial Branch, Court Records Search Policy | https://nebraskajudicial.gov/rules/administrative-policies-schedules/court-records-search-policy-nebraska-courts | 2026-11-23 |
| [8] | Nebraska.gov, One Time Trial Case Search Terms | https://www.nebraska.gov/justicecc/terms_and_conditions.html | 2026-11-23 |
| [9] | Nebraska.gov, Subscriber Portal | https://www.nebraska.gov/subscriber/ | 2026-11-23 |
| [10] | Nebraska Administrative Office of the Courts, fee notice PDF | https://www.nebraska.gov/documents/court-fee-notice.pdf | 2026-11-23 |
| [11] | Nebraska.gov Subscription Services Agreement | https://www.ne.gov/subscriber/tac.html | 2026-11-23 |
| [12] | U.S. Code, 2023 ed., Title 15, Chapter 41, Subchapter III | https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap41-subchapIII.htm | 2026-11-23 |
| [13] | EEOC/FTC, Background Checks: What Employers Need to Know | https://www.eeoc.gov/laws/guidance/background-checks-what-employers-need-know | 2026-11-23 |
| [14] | EEOC, 2012 arrest/conviction guidance and Q&A | https://www.eeoc.gov/laws/guidance/enforcement-guidance-consideration-arrest-and-conviction-records-employment-decisions | 2026-11-23 |
| [15] | Uniform Superior Court Rule 21 (secondary reproduction) | https://rulesofcivilprocedure.com/ga/uscr/rule-21/ | 2026-11-23 |
| [16] | Georgia General Assembly, Official Code of Georgia Annotated, Title 35/36 volume (2025) | https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t35-t36-ch1-59-(v27)-2025-pdf.pdf | 2026-11-23 |
| [17] | Neb. Rev. Stat. §29-2264 | https://nebraskalegislature.gov/laws/statutes.php?statute=29-2264 | 2026-11-23 |
| [18] | Neb. Rev. Stat. §§48-1101, 48-1104 | https://nebraskalegislature.gov/laws/statutes.php?statute=48-1104 | 2026-11-23 |
| [19] | Neb. Rev. Stat. §84-712 | https://nebraskalegislature.gov/laws/statutes.php?statute=84-712 | 2026-11-23 |
| [20] | Neb. Rev. Stat. §43-2,108 | https://nebraskalegislature.gov/laws/statutes.php?statute=43-2,108 | 2026-11-23 |

## Staleness map

- Court access permission/terms: re-check before any integration; regulatory/contract status must be current however recent.
- Fees: re-check quarterly and before any owner budget decision (Nebraska changed 2026-01-01; Georgia vendor fees can change).
- Legal sources: re-check U.S. Code currency, EEOC guidance status, Georgia code supplements and Nebraska effective dates before E4/E5.
- This run's access date: 2026-11-23.
