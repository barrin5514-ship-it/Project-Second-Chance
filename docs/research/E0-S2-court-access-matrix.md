# E0-S2 Georgia/Nebraska court-access matrix

Research date: **2026-11-23** (all URLs accessed that day). Scope: public official documentation about court-record access, coverage, entry points, fees and permission for automation. No live case query, account, purchase, agency contact or scraping was performed. This is a research artifact, not legal advice, a permission grant or an approved integration.

Confidence: **verified** = directly supported by the cited official page; **inference** = reasoned from cited evidence; **unknown** = not established by accessible sources. A public web page is not permission to automate collection.

## Comparison

| Question | Georgia | Nebraska |
| --- | --- | --- |
| Statewide public case search? | **No single statewide public case search.** The Judicial Council's E-Access page routes users court-by-court to vendors; it says an account is required. [C1][C2] | **Yes, through the Judicial Branch's statewide JUSTICE trial-court system and SCCALES appellate system**, with paid one-time or subscriber access. [C6][C7] |
| Official entry points | Georgia Courts E-Access; Georgia Courts directory/Registrar; county Superior Court clerks; GSCCCA (civil case data/records projects); PeachCourt; re:SearchGA [C1][C2][C12] | Nebraska Judicial Branch Case Information; JUSTICE one-time search; Nebraska.gov subscriber/court case search; courthouse/law-library kiosks; SCCALES for appellate [C6][C7][C8] |
| Coverage | Court-by-court and vendor-by-vendor; E-Access lists many Superior and State courts but not every court/record type; some entries point to a vendor-choice page. **Do not infer statewide coverage.** [C1] | Statewide trial courts: county, district and separate juvenile courts in Douglas, Lancaster and Sarpy; appellate Supreme Court and Court of Appeals. Workers' compensation and other specialized records are not established by these pages. [C6] |
| Name search without case number? | Available only where a listed vendor offers it; each vendor/account controls search fields. Not uniform statewide. [C1][C3] | Yes: party name, court type, case type, county, year, judge, attorney; appellate requires case number or trial case number. [C6] |
| Public vs restricted | Court records are public unless access is limited by law or court rule (e.g., sealed files). Juvenile records are protected by O.C.G.A. § 15-11-704. [C13][C15] | Public case records, but juvenile records have statutory confidentiality restrictions (Neb. Rev. Stat. § 43-2,108); sealed-case indexes are separately provided. [C8][C14] |
| Login/registration | **Required** by E-Access vendor links; GSCCCA accounts are per-user; PeachCourt requires an authorized account. [C1][C4][C3] | One-time search requires payment (credit card); subscriber access requires a Nebraska.gov subscription and usernames/passwords. [C6][C7][C10] |
| Documented fees | GSCCCA: $14.95/month Regular, $29.95/month Premium, $5 single-use activation, $0.50/page print. PeachCourt: $2.00 per document + $0.50/page + 3.5% + $0.30 convenience fee; eFiling fees also listed. [C4][C3] | One-time: **$17** per search, up to 30 records, 3-day access. Subscriber: **$100/year** plus **$2.00** per case detail (effective 1 Jan 2026). Bulk: **$1,000/month** up to 20,000 records, then $2/record; New Case Index **$1,200/month**; Statewide Case Index **$2,000/month**. [C6][C9][C11] |
| Permission for automation/API | **Not found / not permitted by the reviewed terms.** GSCCCA prohibits robots, spiders or other automated devices and prohibits compiling/bundling its materials without written permission. PeachCourt prohibits collecting data in a way that avoids billing. No public case-search API is documented. [C4][C3] | **No public case-search API documented.** Subscriber/bulk services are contracted, end-user, non-transferable and do not authorize tampering or redistribution; one-time terms prohibit redistribution/retransmission. Bulk/eFiling webservice is a separate contracted service, not a public search API. [C8][C9][C10] |
| Redistribution/retention | GSCCCA: no compile/bundle/share/transmit without written permission; images may only be printed, not screen-scraped. PeachCourt: proprietary/licensed; no data collection avoiding billing. [C4][C3] | One-time: no redistribution, republish or retransmit; personal view/print only. Subscription: end-user license, compliance with copyright/limitations, no tampering. Bulk terms require separate agreement review. [C9][C10][C8] |
| Guided manual lookup | Feasible and approved as fallback: E-Access court list, Georgia Courts directory, county clerk offices, official court/vendor links. Do not automate. [C1][C2] | Feasible and approved as fallback: courthouse/law-library JUSTICE terminals, one-time search, clerk offices, official Judicial Branch guidance. [C6][C7] |

## Georgia detail

**Structure and gatekeepers.** The Judicial Council of Georgia/Administrative Office of the Courts publishes the E-Access list and directory; the Georgia Superior Court Clerks' Cooperative Authority (GSCCCA) is a legislatively created authority that maintains a statewide civil-case-filing database and property/UCC indexes; individual Superior Court clerks are the custodians of their courts' records; PeachCourt (GreenCourt) and re:SearchGA (Tyler) are the vendor access paths named by the Judicial Council. [C1][C2][C12]

**Coverage and search.** E-Access is not a search engine: it is a court-by-court link table, and many links go to PeachCourt or re:SearchGA while some go to a vendor-choice page. It states: "You'll be redirected to the provider's website and must have an account to search court records." Some courts/record types are absent or unverified. [C1]

**Public/restricted.** Uniform Superior Court Rule 21 provides that court records are public unless access is limited by law or the rule's sealing procedure; the secondary reproduction quotes this text. Juvenile records are protected by O.C.G.A. § 15-11-704, as described by a county clerk office ("strictly protected ... cannot be generally viewed by the public"). These are legal-access constraints, not merely portal settings. [C13][C15]

**Terms and automation.** GSCCCA's Terms of Use prohibit unauthorized use of "any robot, spider or other automated device" and state that its materials may not be "compiled, bundled, grouped, reproduced, shared, transmitted, transcribed, stored in a retrieval system" without express written permission; accounts cost $14.95/$29.95 per month and image access is print-only. PeachCourt's 2025 terms state: "Any attempt to collect data from PeachCourt in a manner that avoids billing is strictly prohibited and may result in criminal prosecution or civil action." PeachCourt charges $2.00 per document plus $0.50/page plus a convenience fee. [C4][C3]

**What is not established:** whether any Georgia court or GSCCCA would grant written permission for a bounded read-only integration; whether an API exists for a permitted use; statewide coverage of a single vendor; current complete fee schedule for every court; and retention/redistribution terms for each clerk. These remain **unknown** and require owner/vendor/court decisions before any live integration.

## Nebraska detail

**Structure and entry points.** The Nebraska Judicial Branch provides statewide trial-court searches from JUSTICE and appellate searches from SCCALES, with free public terminals in courthouses/law libraries and paid remote access through Nebraska.gov. The Court Records Search Policy describes the courthouse terminal, one-time internet search, subscriber access, and formal Public Records Act requests. [C6][C7]

**Coverage.** Trial courts are the 93 counties' county and district courts plus separate juvenile courts in Douglas, Lancaster and Sarpy; appellate coverage is Supreme Court and Court of Appeals. The page lists case summary, parties, offense information (criminal), financial information, register of actions, judge notes, and document images where available. It does not establish coverage of every specialized tribunal. [C6]

**Fees (documented units).** One-time: $17, up to 30 records, results available for three days; no-record searches are still charged. Subscriber: $100 annual account fee; general searches free; viewing case details is $2; no additional charge for document images. Bulk: $1,000/month up to 20,000 cases, then $2/record; New Case Index $1,200/month; Statewide Case Index $2,000/month. The 1 January 2026 fee notice confirms the $2 subscriber record, $1,000 bulk, $1,200 new-case index and $2,000 statewide-index changes. [C6][C9][C11]

**Terms and automation.** The one-time terms prohibit redistribution, republishing or retransmission and allow personal view/print only. The subscriber agreement grants a non-transferable end-user license, requires compliance with copyright/limitations, prohibits tampering, and permits audits of access. No public case-search API is documented; bulk court-record indexes are contracted paid services, and eFiling webservice access is limited to attorneys/contracted users. [C9][C10][C8]

**What is not established:** whether the owner can obtain a data-use agreement permitting application display of case data (as opposed to personal use); the current bulk agreement's redistribution/retention terms (the linked agreement PDF was not retrievable in this run); whether the $17 one-time fee changed in the 2026 schedule; and whether any agency would authorize a read-only integration. These remain **unknown**.

## Source register

| ID | Source (publisher, title, URL) | Accessed | Relevant section / quote or paraphrase | Confidence |
| --- | --- | --- | --- | --- |
| C1 | Judicial Council of Georgia, "E-Access to Court Records," https://georgiacourts.gov/eaccess-court-records/ | 2026-11-23 | Court-by-court vendor table; "must have an account to search court records"; no statewide search box | verified |
| C2 | Judicial Council of Georgia, "Data and Records," https://georgiacourts.gov/data-and-records/ | 2026-11-23 | Links E-Access, E-File, Georgia Courts Directory/Registrar, research/data | verified |
| C3 | GreenCourt, "PeachCourt Terms & Conditions" (2025 PDF), http://awesome.peachcourt.com/wp-content/uploads/2025/01/230422-PeachCourt-TC-1.pdf | 2026-11-23 | "eAccess Fee = $2.00 per Document"; "$0.50 per Page"; "3.5% + $0.30"; no data collection avoiding billing | verified (PDF parsed) |
| C4 | Georgia Superior Court Clerks' Cooperative Authority, "Terms of Use," https://www.gsccca.org/terms-of-use | 2026-11-23 | Per-user accounts $14.95/$29.95; no robot/spider/automated device; no compiling/bundling without written permission; print-only images | verified |
| C5 | GSCCCA home, https://www.gsccca.org/ | 2026-11-23 | Authority services; civil case data/property/UCC indexes; fee changes | verified |
| C6 | Nebraska Judicial Branch, "Case Information - eServices," https://nebraskajudicial.gov/e-services/case-information-eservices | 2026-11-23 | JUSTICE/SCCALES; public terminals; $17 one-time/30 records/3 days; $100 annual; $2 details; coverage | verified |
| C7 | Nebraska Judicial Branch, "Court Records Search Policy for Nebraska Courts," https://nebraskajudicial.gov/rules/administrative-policies-schedules/court-records-search-policy-nebraska-courts | 2026-11-23 | Courthouse terminal; internet one-time/subscriber; Public Records Act §§84-712–84-712.09 | verified |
| C8 | Nebraska.gov, "Subscriber Portal," https://www.nebraska.gov/subscriber/ | 2026-11-23 | $2 details; bulk $1,000/20k; New Cases $1,200; Statewide Index $2,000; sealed-case index | verified |
| C9 | Nebraska.gov, "One Time Trial Case Search — Terms and Conditions," https://www.nebraska.gov/justicecc/terms_and_conditions.html | 2026-11-23 | $17; 3 days; 30-result limit; no redistribution/republish/retransmit | verified |
| C10 | Nebraska.gov, "Subscription Services Agreement," https://www.ne.gov/subscriber/tac.html | 2026-11-23 | End-user non-transferable license; copyright/limitation compliance; no tampering; audit | verified |
| C11 | Nebraska Administrative Office of the Courts, "Court fee notice" (PDF), https://www.nebraska.gov/documents/court-fee-notice.pdf | 2026-11-23 | Effective 1 Jan 2026: $2 subscriber record, $1,000 bulk, $1,200 new-case index, $2,000 statewide index | verified (PDF parsed) |
| C12 | GSCCCA "About Us" / service pages referenced from https://www.gsccca.org/ | 2026-11-23 | Statewide civil case filings database and clerk services | verified |
| C13 | Uniform Superior Court Rule 21, reproduced at https://rulesofcivilprocedure.com/ga/uscr/rule-21/ | 2026-11-23 | "All court records are public ... unless public access is limited by law or by the procedure set forth below"; reproduction claims verbatim Council text. Official Court rules page: https://www.gasupreme.us/rules/ | verified text, secondary host (official rule verification pending) |
| C14 | Neb. Rev. Stat. § 43-2,108, https://nebraskalegislature.gov/laws/statutes.php?statute=43-2,108 | 2026-11-23 | Juvenile reports/records "shall not be open to inspection, without order of the court"; confidential record information definition | verified |
| C15 | Jones County Clerk of Superior Court, "Juvenile Division," https://www.jonescountyclerkofcourt.org/juvenile-division | 2026-11-23 | Juvenile records "strictly protected by Georgia law (O.C.G.A § 15-11-704)" and not generally public | verified (county official; code text not separately parsed) |
| C16 | Georgia Courts Judicial Directory, https://georgiacourts.knack.com/gcd2/#home/ | 2026-11-23 | Directory for court/clerk contacts; manual lookup aid | verified |
| C17 | Nebraska Appellate Courts Online Library, https://www.nebraska.gov/apps-courts-epub/public/supreme | 2026-11-23 | Published Supreme Court opinions and minutes; PDFs | verified |
| C18 | Supreme Court of Georgia, https://www.gasupreme.us/ ; Court of Appeals, https://www.gaappeals.gov/ | 2026-11-23 | Official appellate opinions/case information entry points | verified |

## Unknowns and blockers

1. No written permission or API documentation was found for automated Georgia or Nebraska case search.
2. Georgia has no statewide public case search; vendor coverage and search fields vary by court.
3. Nebraska's case search is paid and contracted; redistribution/display permission beyond personal use is not established.
4. Juvenile, sealed and other restricted records must be excluded; exact redaction/selection rules require qualified legal review.
5. Current complete fee schedules and bulk-data agreements need owner/vendor confirmation before any budget or integration decision.
6. This matrix does not verify identity, case accuracy or completeness, and no name match is identity proof.
