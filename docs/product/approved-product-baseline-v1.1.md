---
title: Next Chapter Capstone — Legal Assistance and Reentry Platform
status: Approved product direction; implementation feasibility pending
version: 1.1
updated: 2026-11-18
presentation_target: 2026-12-14
method: BMAD guided PRD
---

# Product Requirements Document

## 1. Product vision

**Guiding principle: No False Hope.** Build an accessible AI-assisted platform that helps people understand criminal records, organize case information, identify reliable legal resources, and take practical reentry steps. The product explains information; it does not replace legal counsel, determine eligibility conclusively, or promise outcomes.

**Primary audience:** People with criminal records and people navigating reentry. **Long-term expansion:** pretrial and other criminal-justice users.

**Release approach:** Private, invitation-only capstone demonstration using fictional records. No real-user access until independent legal-content and security validation.

## 2. Problem statement

Unequal access to justice leaves people with criminal records unable to reliably identify and navigate options available to them. Information complexity, financial constraints, inaccessible case records, employment background-check barriers, and low trust in inaccurate guidance compound the problem. The product addresses information and workflow barriers, without implying every user has a legal remedy.

## 3. Users and journeys

**Primary users:** People with criminal records and those navigating reentry. **Secondary:** authorized family advocates, legal aid and reentry professionals (future supported roles; no shared access in MVP).

**Account policy:** Every user must register and authenticate before using the platform. A user can: (1) search for a possible case without knowing the case number, (2) explicitly confirm a match, (3) organize documents and review extracted facts, (4) understand a background-check notice and draft a response, (5) read cited legal information and practical next steps. A search result must never be silently attributed to a user.

## 4. Scope

### Five mandatory MVP features
1. Secure accounts and document protection.
2. Case document organizer.
3. Employment notice assistant.
4. Verified legal information.
5. **Court case discovery:** pursue a working, permitted official court-record integration where feasible; if blocked, deliver a clearly labeled, tested fictional-record search and guided manual lookup to official resources.

### Future roadmap (not required for Dec 14)
Multi-jurisdictional case discovery; record relief navigator (expungement, sealing, set-asides, pardons); civil-rights restoration; reentry resources; deeper case review; pretrial support; attorney/advocate collaboration.

### Explicit exclusions
No automatic legal eligibility determinations, legal representation, automatic sending of employment responses, broad court scraping, circumvention of authentication or paywalls, or production use of real client records.

## 5. Functional requirements

### Accounts and privacy
- **FR-01:** Create account, sign in and sign out.
- **FR-02:** Enforce per-user data access and ownership.
- **FR-03:** Encrypt sensitive stored data and documents.
- **FR-04:** Provide deletion requests and disclose retention/backup limits.
- **FR-05:** Prevent unauthorized access to other users' information.

### Case documents
- **FR-06:** Upload supported PDFs and images within defined limits.
- **FR-07:** Organize by case and document type.
- **FR-08:** Extract readable text and generate plain-language summaries where processing is available and consented to.
- **FR-09:** Let users review and correct extracted information and note missing documents.
- **FR-10:** Distinguish document evidence from AI interpretation.

### Employment notices
- **FR-11:** Upload pre-adverse or adverse action notices.
- **FR-12:** Explain notices in plain language.
- **FR-13:** Extract explicit dates and deadlines; label ambiguous or inferred timelines as uncertain.
- **FR-14:** Draft professional responses using user-confirmed facts.
- **FR-15:** Require user review and approval before copy/export; no auto-send.

### Verified legal information
- **FR-16:** Retrieve information from curated authoritative sources.
- **FR-17:** Provide inspectable citations for material legal claims.
- **FR-18:** Track source jurisdiction, effective/publication date when known, and verification status.
- **FR-19:** Disclose missing, outdated, contradictory or unverified information.
- **FR-20:** Avoid invented eligibility or guarantees and abstain when evidence is insufficient.

### Court case discovery
- **FR-21:** Search without a known case number.
- **FR-22:** Investigate Georgia and Nebraska official court-record sources and implement a working authorized integration where feasible. If no permitted live method is available, implement a clearly labeled fictional-data search demonstration; never represent it as live court data.
- **FR-23:** Display available distinguishing details such as jurisdiction, court, case number and parties; minimize sensitive details.
- **FR-24:** Require explicit user confirmation before linking a case to an account.
- **FR-25:** Differentiate possible matches, confirmed selections, and unavailable/no-result states.
- **FR-26:** Provide guided manual lookup with links/instructions for official court-record resources when live access is blocked or unavailable. Test this fallback as part of MVP acceptance.
- **FR-27:** Respect access restrictions and minimize collection, storage and reuse of identifiers and court data.

**AI document-processing decision:** Explicit, specific informed consent before any uploaded content is sent to an external AI provider. Identify provider and shared data, offer refusal and revoke/stop future sharing where feasible. Basic account and document access remain usable without AI consent. Consent must be checked server-side, not only in the interface.

## 6. Nonfunctional requirements

### Security and privacy
- **NFR-01:** HTTPS/TLS in transit; appropriate encryption at rest with separate key management.
- **NFR-02:** Authentication, authorization and isolation between accounts.
- **NFR-03:** File type/size validation and malicious-file defenses; treat document contents as untrusted.
- **NFR-04:** Keep credentials, secrets and sensitive content out of logs and source control.
- **NFR-05:** User deletion and transparent backup/retention policy.
- **NFR-06:** Provider-specific informed consent before external document AI processing.
- **NFR-07:** Minimize identifying data, especially SSNs.

### Legal reliability
- **NFR-08:** Cite authoritative sources for substantive legal claims.
- **NFR-09:** Verify jurisdiction and relevant time period.
- **NFR-10:** Distinguish evidence, possible options and unknowns.
- **NFR-11:** Do not invent cases, statutes, deadlines, eligibility or outcomes.
- **NFR-12:** Direct individualized legal questions to qualified assistance.

### Reliability and accessibility
- **NFR-13:** Actionable failure and recovery states.
- **NFR-14:** Preserve saved work across ordinary failures.
- **NFR-15:** Responsive, keyboard-accessible interfaces and clear form controls.
- **NFR-16:** Plain-language explanations without distorting legal meaning.
- **NFR-17:** Label AI-generated versus source-derived versus user-provided content.

### Quality
- **NFR-18:** Unit, integration and browser end-to-end tests for critical paths.
- **NFR-19:** Authorization, prompt injection, malicious upload and data-leak tests.
- **NFR-20:** Adversarial fictional legal scenarios, including conflicting and insufficient evidence.
- **NFR-21:** Human legal-content review before real-user launch.
- **NFR-22:** Fictional/anonymized test data until safeguards are verified.

## 7. Success metrics and definition of done

**Targets, not achieved results:**
- 100% of defined critical MVP acceptance scenarios pass.
- Zero *known unresolved* critical security findings (not a claim of zero vulnerabilities).
- 100% of substantive legal claims in the evaluation set are supported by applicable citations or withheld.
- Zero unauthorized cross-user access and zero unconsented external document transfers in security tests.

**Feature acceptance demonstrations:**
- Accounts: two independent test accounts cannot read one another's data.
- Documents: upload, categorize, extract/summarize with consent, correct and delete fictional documents.
- Notices: explain a fictional notice, distinguish stated from uncertain deadlines, and produce an editable user-approved response.
- Legal information: provide source-supported answer and abstain on an unsupported one.
- Court discovery: demonstrate a **permitted live official-source search where feasible**. If access is blocked or unavailable, demonstrate a functional search over clearly labeled fictional records, show candidate results, require explicit case confirmation, test ambiguous/no-result states, and provide guided manual lookup links to official resources. A static screenshot alone is insufficient. Document evidence of the live-integration investigation and any blockers.

**Release gate:** All five feature acceptance criteria must pass, including the court-discovery fictional-data and manual-search fallback if live integration is not permitted or feasible. A live court integration is a preferred stretch outcome, **not a mandatory MVP completion gate**. Disclose whether court results are live or simulated. Private demo only; production launch is a separate security/legal gate.

## 8. Delivery plan, dependencies and risks

| Dates (2026) | Milestone | Exit evidence |
|---|---|---|
| Nov 18–22 | Compare Georgia and Nebraska official access, seek permission/terms clarity, attempt a live integration proof of concept; plan the fictional-data/manual fallback; BMAD architecture and threat model | A reproducible official-source query or a documented blocker, plus a tested fallback plan |
| Nov 23–29 | Auth, access controls, court search, document organizer | Integration tests and end-to-end user journey |
| Nov 30–Dec 6 | Employment notice workflow, cited legal content, external AI consent | Fictional-scenario test results and citation checks |
| Dec 7–11 | Security, adversarial, accessibility and browser testing; remediation | Test evidence, remaining-risk register |
| Dec 12–14 | Demo rehearsal and presentation | Private fictional-data demo, honest status, limitations and roadmap |

### Initial official-source findings (Nov 18, 2026)
- **Georgia:** State judicial site lists court-specific e-access providers and says a provider account is required. There is no confirmed unified, public, authorized integration API from this research. Source: https://georgiacourts.gov/eaccess-court-records/
- **Nebraska:** Official JUSTICE offers statewide trial-case searches; current judicial page lists $17 for one-time party-name searches (up to 30 cases), or a subscriber account with a $100 annual charge, with some per-case fees. Public access does **not** itself establish permission for automated integration or data redistribution. Sources: https://nebraskajudicial.gov/e-services/case-information-eservices and https://www.nebraska.gov/justicecc/
- **Decision pending:** Compare permitted machine access, terms, authentication, fees, coverage, and reliability. Select the source with verified permission and feasible technical integration. Do not declare either source integrated based on a web listing alone.

### Risk register
| Risk | Impact | Response |
|---|---|---|
| No permitted official automated interface or approval | High: prevents live integration, but not MVP fallback completion | Verify early; seek authorization; implement labeled fictional search and guided official manual lookup; no bypassing restrictions |
| Fees or subscription requirements | High | Confirm and budget before coding; never automate paid actions without authorization |
| Court search false-positive match | High | Present candidates and require explicit selection; never equate name match with identity |
| Legal hallucination or outdated sources | Critical | Curated corpus, jurisdiction/effective-date checks, citation verification, abstention, adversarial tests |
| Sensitive records leaked to other accounts/providers/logs | Critical | Threat modeling, isolation tests, consent enforcement, encryption, minimal retention |
| Five workflows exceed time | High | Build thin vertical slices, test continuously; report unfinished gates transparently |
| External model or court service unavailable | Medium/high | Clear failure states; no fabricated results; document dependency |
| No independent legal/security review by demo | High for real-user launch | Remain private, fictional-data-only; block real-user launch |

### BMAD implementation handoff
1. Approve this PRD as the product baseline.
2. Perform official court-source access feasibility spike **before** committing to a provider.
3. Create architecture, data-flow diagram, threat model, and source/consent policies.
4. Break FR-01–FR-27 and NFR-01–NFR-22 into epics, user stories, and acceptance tests.
5. Use test-driven development and independent reviewer checks for each story.
6. Produce a traceability matrix linking requirements to test evidence and unresolved risks.

### Open implementation decisions
- Official court provider and written/contractual authorization for automated integration.
- Exact authentication mechanism, hosting and encryption/key-management design.
- File-size limits, supported OCR/extraction approach and data retention periods.
- AI provider, model, processing terms and consent wording.
- Curated legal-source inventory and reviewer availability.
- Quantitative performance budgets and accessibility verification plan.

**Status:** Eight PRD sections approved as product decisions, with the Section 7 court-discovery fallback amendment confirmed. Integration feasibility, technical architecture and actual acceptance-test results remain unverified. This is not a claim that the MVP has been built or validated.
