# Project Second Chance Product Requirements Document

## Project Second Chance Product Requirements Document

Instructor submission edition | Version 2.0 | November 19, 2026 | Presentation target December 14, 2026

Project Second Chance is a responsive legal-information and reentry-assistance web application for people with criminal records. It helps users organize private case documents, understand employment background-check notices, inspect authoritative legal information, and discover possible court records. Its operating principle is No False Hope: uncertainty must remain visible, and the application must not invent eligibility, deadlines, identity matches, citations, or outcomes.

### Document status and decision authority

This edition consolidates the approved November 18 product baseline and architecture. It is ready for instructor review as a design document. It does not claim that software, integrations, security controls, or legal accuracy have been implemented or validated. Newly authored details below remain proposals pending owner approval.

| Label | Meaning |
| --- | --- |
| APPROVED | Recorded as approved in the supplied PRD or Architecture Spine. |
| PROPOSED | New detail supplied in this edition; review before using it as a binding build requirement. |
| OPEN | Implementation choice or external dependency still needs evidence and a decision. |

### Problem statement and intended value

APPROVED. People with criminal records can face complex legal information, financial constraints, inaccessible case records, and employment background-check barriers. Fragmented documents and unreliable guidance make it difficult to understand facts and practical next steps. The product reduces information and workflow barriers without implying that every user has a legal remedy.

The intended value is a clearer, more organized basis for action: find the relevant document, understand what it actually says, identify what remains unknown, and prepare questions or a response for human review. Successful information access must not be presented as successful legal relief.

### Submission map

The following sections cover personas, value-focused stories, five-feature scope, all ten architecture decisions, privacy and AI consent, No False Hope safeguards, six actual wireframes, proposed schema, phase 1/2/3 roadmap, implementation handoff, and a consistency check. The final appendix preserves the approved requirement IDs.

## Users and value focused journeys

PROPOSED personas. The following names, ages, circumstances, and journeys are fictional design tools, not research participants, real records, or approved product decisions.

### Marcus Reed age 34

Marcus is rebuilding his work history after incarceration and mainly uses a phone. He receives a fictional pre-adverse-action notice while applying for a warehouse job. He has limited money for legal assistance and worries that a confusing letter means there is nothing he can do.

- Goal: understand the notice, see dates stated in it, and prepare an accurate response using facts he can confirm.
- Needs: short explanations, readable mobile controls, a visible source beside each extracted date, and an easy way to decline cloud AI.
- Risk: treating an AI suggestion as a guarantee or an uncertain date as a legally established deadline.
- Journey: sign in → create private case → upload fictional notice → review local extraction → choose AI consent → inspect cited explanation → edit and approve response → copy/export it himself.

### Denise Carter age 52

Denise has older court paperwork and is investigating what trustworthy information is available about her record. She uses a laptop at home and sometimes a shared device. She does not know every case number and has encountered people with similar names in searches.

- Goal: organize her papers, identify possible court records, and prepare informed questions for qualified assistance.
- Needs: explicit sign-out, clear distinction between possible matches and identity proof, jurisdiction labels, and a usable official manual-lookup route.
- Risk: attaching someone else’s record or interpreting a general legal explanation as a personal eligibility decision.
- Journey: sign in → choose jurisdiction → search without case number → inspect candidates → select one explicitly or use manual lookup → organize documents → read source-supported information.

### Future generic persona authorized supporter

An authorized family advocate or legal-aid/reentry professional may eventually help someone manage information. APPROVED boundary: shared access and supported advocate roles are future scope. The MVP must not grant a supporter access, encourage password sharing, or imply a collaboration feature already exists.

### Design implications

PROPOSED. Use descriptive labels, one clear primary action per step, expandable detail, keyboard navigation, and persistent labels for fictional records. Offer actionable recovery when extraction, AI, or court access fails. Accessibility is an approved requirement; the exact evaluation target is proposed later.

## Five MVP features and user stories

APPROVED scope. All five features are mandatory for the capstone. Story wording and packaging below are PROPOSED elaborations of the approved FR requirements.

| Feature and story | User value and acceptance evidence |
| --- | --- |
| F1 Secure accounts and document protection<br>US-01 As Denise, I want private access to my cases so that I can organize sensitive information without exposing it to another account. | FR-01–05. Register, sign in/out, enforce ownership, protect storage, and support deletion with backup disclosure. Two independent fictional accounts cannot read, alter, download, or discover each other’s resources through direct requests. |
| F2 Case document organizer<br>US-02 As Denise, I want documents grouped by case and reviewed extracted facts so that I can find evidence and spot mistakes. | FR-06–10. Validate and upload supported files, categorize, extract locally where possible, preserve provenance, allow corrections and flag missing documents. Declining cloud AI leaves organization and local extraction available. |
| F3 Employment notice assistant<br>US-03 As Marcus, I want a plain-language explanation and editable response so that I can act using facts I have checked. | FR-11–15. Distinguish pre-adverse/adverse or unknown notice type, show stated dates with source spans, flag uncertainty, and create a user-reviewed draft. Copy/export requires approval; no automatic sending. |
| F4 Verified legal information<br>US-04 As Denise, I want applicable sources behind explanations so that I can assess the information and prepare questions. | FR-16–20. Retrieve curated authoritative material, show jurisdiction/date/version and claim-level citations. Withhold unsupported material claims; disclose stale, missing or conflicting support. |
| F5 Court case discovery<br>US-05 As Denise, I want possible records without a known case number so that I can find leads without assuming a name match proves identity. | FR-21–27. Pursue permitted official-source integration. If unavailable, demonstrate functional labeled fictional search plus tested guided official lookup. Show candidates, ambiguity and explicit selection before linking. |

### Boundary that controls completion

APPROVED. A live court integration is a preferred stretch outcome, not a mandatory MVP gate. A screenshot alone is insufficient: the fictional search, candidate selection, ambiguous/no-result states, and manual fallback must work and be tested. Record the investigation and blocker when live access is unavailable.

## Experience states and scope boundaries

### Cross feature stories

- US-06 PROPOSED: As Marcus, I want to decline or revoke future AI sharing so that I retain control while still accessing my documents. Acceptance: no provider request occurs after refusal or applicable revocation; backend checks consent.
- US-07 PROPOSED: As Denise, I want uncertain results explained with a next step so that I avoid relying on unsupported information. Acceptance: missing evidence produces an uncertainty state, source limitations, and a qualified-assistance referral where appropriate.
- US-08 PROPOSED: As a reviewer, I want unmistakable fictional/demo labels so that I do not mistake a demonstration for a real court search or legal service. Acceptance: labels persist on search, detail, attached record, and exports containing fictional court data.

### Required states

| Flow | State and behavior |
| --- | --- |
| Account / storage | Unauthenticated, expired session, forbidden resource, failed upload, and deletion/backup limitation. Do not expose another account’s existence through an error. |
| Document / AI | Queued, extracting, unsupported or unreliable extraction, correction saved, consent declined, provider unavailable, verification failed, and output ready for review. Never replace a saved original with an AI revision. |
| Notice / research | Unknown notice type, explicit date, ambiguous date, insufficient source support, source conflict, outdated source, draft editing, and user-approved export. A draft is never a filed or sent response. |
| Court discovery | Live, fictional demo, manual only, multiple possible matches, no results, unavailable source, and explicitly selected candidate. “No results” is not proof that no case exists. |

### MVP exclusions

APPROVED. No conclusive automated eligibility decisions, legal representation, automatic sending of employment responses, broad court scraping, access-control or paywall circumvention, or production use of real client records. Shared advocate access is future scope. No native desktop dependency is required.

### Jurisdiction and data boundaries

APPROVED. Initial research focuses on Georgia and Nebraska. This does not establish complete statewide coverage or a working integration. Local and restricted hosted demonstrations use fictional data only. Treat the source PRD’s reference to anonymized testing as narrowed by the Spine’s stricter fictional-only demonstration/development policy.

PROPOSED. For unsupported jurisdictions, allow private document organization while clearly withholding jurisdiction-specific legal answers and automated court coverage. Review this behavior before implementation.

## Approved architecture decisions

APPROVED AD-01 through AD-10, November 18, 2026. Decision text is preserved from BMAD_Architecture_Spine.md; explanatory build implications follow. The later Spine resolves more general earlier implementation questions where it explicitly makes a choice.

| ID | Approved decision |
| --- | --- |
| AD-01 | Modular monolith, separated into domain modules |
| AD-02 | Responsive web app using React, Vite, TypeScript, Node.js and Express |
| AD-03 | Local-first development with SQLite metadata and separately encrypted document storage |
| AD-04 | Provider-independent cloud AI with explicit consent, source verification, and no automatic legal conclusions |
| AD-05 | Court adapters for permitted live integrations, clearly labeled fictional demonstration data, and guided manual fallback |
| AD-06 | Maintained server-side authentication library, secure sessions, Argon2id, per-resource authorization, encrypted files |
| AD-07 | Curated, versioned authoritative legal sources with RAG, claim-level citation verification, jurisdiction/date checks, and abstention |
| AD-08 | Local-first PDF text extraction and OCR where supported; external AI processing only after explicit consent |
| AD-09 | Strict quality gates: DeepSeek builds, Codex independently tests, Claude reviews; evidence and owner approval required before merge |
| AD-10 | Both local and restricted hosted demonstrations; protected backups and tested recovery |

### Component and trust model

APPROVED. React browser → Express API → identity, cases/documents, employment notices, legal research and court discovery modules. The server controls authorization, durable writes, consent checks and encryption. SQLite holds structured metadata; private documents use a separately encrypted file store. A replaceable AI gateway mediates external requests. Legal retrieval uses a versioned official-source library and a claim-support gate.

The browser, uploads, OCR, retrieved text, court pages and model outputs are untrusted. Source content supplies evidence, never instructions that can alter permissions or tools. Provider keys and encryption keys stay off the browser and outside Git. Development models are separate from the product’s runtime AI provider.

## Privacy and specific AI consent

APPROVED safeguards. Exact UI wording, retention periods, provider, hosting and key-management implementation remain OPEN. The following operational details marked PROPOSED require owner review.

### Before an external request

- Identify the actual provider and purpose, the specific documents or excerpts, categories of data, and known retention/sharing implications. Do not use a generic blanket acceptance.
- Offer an explicit refusal path. Basic accounts, document access, organization and supported local extraction continue without cloud AI.
- Record the policy version, user choice, provider, purpose, scope and time. Enforce ownership and consent on the server immediately before each transmission.
- Minimize or redact data where feasible. Do not request SSNs for ordinary workflows. Consent does not override the fictional-data-only capstone boundary.

### Revocation and new scope

APPROVED. Revocation stops future sharing; it cannot retroactively erase provider-held data. Disclose that limit and any available provider deletion process. PROPOSED: a changed provider, purpose, document selection or material processing policy requires a new consent decision; queued jobs recheck consent before sending and cancel if no longer covered.

### Storage and deletion

APPROVED. Validate file content/type/size, parse under resource limits, encrypt private files, and exclude sensitive payloads from logs, source control, telemetry and screenshots. Deletion includes live metadata and storage. Explain backup expiry, separately protect backup keys, and test restore/deletion interactions.

PROPOSED: use a deletion ledger so a restored backup cannot silently resurrect deleted documents or revoked sharing. Restrict access while deletion is pending. Do not promise immediate permanent erasure until exact backup retention and provider behavior have been reviewed.

### Minimum audit trail

APPROVED: keep privacy-safe audit events and provenance. PROPOSED events include sign-in outcome, authorization denial, document lifecycle state, consent change, AI request decision, source verification outcome, export approval and restore check. Store identifiers and outcomes rather than document text, prompts, names, tokens or legal narratives.

### User facing consent copy prototype

PROPOSED: “Use external AI to draft a summary? Provider: [configured provider]. Purpose: summarize the excerpts you select. Review the exact information to be shared and the provider’s data terms before choosing. You can decline and keep organizing your documents. Revoking later stops future sharing but does not automatically remove information already received by the provider.”

## No False Hope safeguards and evaluation

APPROVED principle. The product provides legal information, not a substitute for a qualified attorney. It must never invent eligibility, court matches, deadlines, citations or outcomes. Automated checks are fallible; human legal and security review are prerequisites for real-user use.

| Risk | Required control and evaluation case |
| --- | --- |
| Unsupported legal claim | Check each material claim against cited passages, source version, jurisdiction and relevant legal period. Citation presence alone is insufficient. Test a plausible citation that does not actually support the claim; withhold the claim. |
| Deadline overstatement | Extract only dates/deadlines explicitly supported by the uploaded notice. Preserve page/span evidence. Missing, conflicting or OCR-corrupted dates produce uncertainty; never present an inferred statutory deadline as a fact. |
| False identity match | Court results remain candidates. A same-name hit is not identity proof. Explicit selection links a user-chosen candidate, not a legally verified identity. Test duplicates, mismatch and mistaken selection. |
| Stale or conflicting law | Show source review/effective dates where known. Disclose conflicts or missing applicable sources; abstain rather than combine incompatible rules into a confident answer. |
| Invented legal remedy | Do not announce eligibility for expungement, sealing or other relief. Future navigators remain informational and must preserve review/referral requirements. |
| Prompt injection | A malicious PDF or source passage cannot grant access, bypass consent, change citation policy, execute instructions or trigger transmission. Test hostile embedded instructions. |
| Misleading demonstration | Label fictional data throughout the flow; never blend fictional fixtures into live results. Service errors and absent records cannot be replaced with fabricated “live” results. |

### Proposed verification output contract

PROPOSED. Return separate collections of source facts, user corrections, AI interpretations, legal claims with passage references, uncertainty reasons, and suggested human-review questions. Unsupported legal claims are withheld. The renderer must never convert a missing or failed check into a “verified” badge. Retain rejected-output metadata without retaining sensitive payloads in logs.

### Evaluation targets from the approved baseline

100% of defined critical scenarios pass; zero known unresolved critical security findings; all substantive legal claims in the evaluation set are supported by applicable citations or withheld; zero unauthorized cross-user access and zero unconsented document transmissions in tests. These are test-set targets, not demonstrated results or guarantees of safety.

## Wireframes account and case workspace

PROPOSED low-fidelity layouts. Actual interface structure is illustrated below; these are design artifacts, not screenshots of implemented software. All names and records are fictional.

### W1 Sign in and private demonstration boundary

```text
FICTIONAL DATA ONLY   Restricted capstone demo
Project Second Chance
Email [________________________]
Password [_____________________]
[Sign in]    [Create account]
Your private files require sign-in.
Error: Unable to sign in. Try again.
```

W1 → W2 after authentication. Invalid credentials use a generic error. Session expiry returns to sign-in without exposing private content. Account creation does not imply AI consent.

### W2 Private case workspace

```text
FICTIONAL DEMO | Denise Carter       [Sign out]
My cases | Documents | Notices | Legal info | Court search
Case: Demo case A     Jurisdiction: Georgia
[Upload document]     [Add missing-document note]
Documents: Sample notice | Extraction needs review
Next step: Review extracted facts
AI sharing: Off             [Privacy and deletion]
```

W2 → W3 by Upload document; W2 → W5 by Legal information; W2 → W6 by Court discovery. Small screens stack the case list above documents. No supporter-sharing control is present in MVP.

## Wireframes document consent and notice review

PROPOSED. Preserve the original document and show evidence, corrections and AI interpretation as separate content. Every external AI request remains subject to server-side checks.

### W3 Document review and optional AI sharing

```text
FICTIONAL DOCUMENT | sample-notice.pdf
Source page 1 | Extracted text | Corrections
Extraction warning: Check unclear text against original.
Optional external AI: draft a summary
Provider: configured provider | Purpose: selected summary
[Review exact excerpts and provider data terms]
[Decline and continue locally]  [Allow selected use]
```

Decline → remain in W3 with local extraction. Allow selected use → recheck consent and scope on server, then show processing or failure. Unsupported extraction offers manual correction, never an invented transcript.

### W4 Employment notice explanation and response

```text
FICTIONAL NOTICE | Plain-language explanation
SOURCE FACT: notice type needs confirmation [Page 1]
DATES: no clear deadline found; review original
AI INTERPRETATION: draft only; check every statement
Response draft [editable text area________________]
[ ] I reviewed this version and approve copy/export
[Copy - disabled until approved] [Export]  No auto-send
```

W4 shows date evidence and uncertainty before the draft. Copy/export stays disabled until review approval; editing after approval requires renewed approval (PROPOSED). No Send or File action exists. No actual deadline or legal rule is asserted in this fictional example.

## Wireframes legal sources and court candidates

PROPOSED. The source viewer and candidate list are inspectable. No live integration or authoritative source inventory is implied by these illustrative layouts.

### W5 Legal information with claim evidence

```text
Legal information | Jurisdiction [Georgia v] | Period [____]
Question [____________________________________] [Search]
Claim: [illustrative supported explanation] [Citation 1]
Source panel: authority | official URL | version
Relevant passage | effective date | review date
Unknown: available evidence does not resolve this question.
[Prepare questions for qualified assistance]
```

W5 requires jurisdiction and relevant time context. Open citation reveals its passage, authority, URL, version and date metadata. If support is absent, the answer area gives uncertainty and a useful next step.

### W6 Court discovery with explicit selection

```text
FICTIONAL COURT SEARCH - NOT LIVE RECORDS
Jurisdiction [Georgia v] | Name [Demo person____] [Search]
Possible candidate A | Demo court | DEMO-001
Possible candidate B | Demo court | DEMO-002
A name match does not establish identity.
[Review candidate] [Select candidate and confirm]
No results / access unavailable? [Guided official lookup]
```

W6 defaults to fictional demo mode for the illustrated dataset. A live mode is offered only for a permitted, tested integration. Manual lookup opens a reviewed official resource. “Select candidate” requires confirmation and never means identity verified.

## Proposed data schema identity and documents

PROPOSED logical schema, not approved migrations. It follows AD-01/03/06/08 and FR-01–15. SQLite metadata remains separate from encrypted document blobs. Primary keys use opaque IDs; foreign keys are enforced. Exact types, indexes, migrations and cryptographic envelope format require implementation ADRs.

| Entity | Suggested fields and relationships |
| --- | --- |
| User / Session | User(id PK, email unique, password_hash, created_at, disabled_at). Session is library-managed with user_id FK, expires_at and revoked_at; no custom auth primitives. Do not store persona ages as required user data. |
| Case | Case(id PK, owner_user_id FK User, user_label, jurisdiction nullable, court nullable, created_at, updated_at). A manually created case need not have an official case number. |
| Document | Document(id PK, case_id FK Case, display_name, document_type, mime_type, byte_size, encrypted_blob_ref, key_ref, integrity_checksum, upload_status, created_at, deleted_at). Blob reference is not a public URL; key_ref is not a secret key. |
| Extraction / SourceSpan | Extraction(id PK, document_id FK, engine_version, status, warnings, created_at). SourceSpan(id PK, extraction_id FK, page_number, start_offset, end_offset, protected_text_ref). Page/span provenance survives later correction. |
| FactCorrection | FactCorrection(id PK, document_id FK, source_span_id FK nullable, field_name, protected_value_ref, actor_user_id FK, created_at, supersedes_id nullable). Keep source evidence and user correction distinguishable. |
| Notice / Draft | Notice(id PK, document_id FK, notice_type, type_status). NoticeDate(id PK, notice_id FK, source_span_id FK, date_value nullable, date_label, uncertainty). Draft(id PK, notice_id FK, protected_body_ref, version, ai_artifact_id FK nullable, approval_version nullable, approved_at nullable). |
| ProcessingJob | ProcessingJob(id PK, owner_user_id FK, document_id FK, kind, status, consent_id FK nullable, input_version, created_at, completed_at). Recheck ownership, consent and deletion state before any external step. |

### Sensitive content handling

APPROVED FR-03 requires sensitive stored data as well as documents to be protected. The logical fields above are not permission to store raw extracted text, notices, drafts or identifying metadata unprotected in SQLite. PROPOSED: put sensitive derived content in encrypted objects and store protected references; choose encryption for remaining sensitive metadata in an ADR. Secrets and decryption keys must remain outside DB backups and Git.

## Proposed data schema AI legal and court records

PROPOSED continuation. Constraints below express approved safety requirements; exact table design and retention remain subject to review.

| Entity | Suggested fields and relationships |
| --- | --- |
| Consent / AIRequest | Consent(id PK, user_id FK, provider_id, purpose, policy_version, scope_digest, decision, granted_at, revoked_at). ConsentScope(consent_id FK, document_id FK, input_version, permitted_categories). AIRequest(id PK, consent_id FK, provider_model, purpose, request_state, sent_at, completed_at). Keep metadata, not raw provider payloads in audit logs. |
| AIArtifact | AIArtifact(id PK, request_id FK, document_id FK nullable, artifact_type, protected_output_ref, status, verification_state, created_at). AiEvidence(artifact_id FK, source_span_id FK). Source facts and interpretations remain distinct. |
| LegalSource / Version | LegalSource(id PK, authority, official_url, jurisdiction). SourceVersion(id PK, source_id FK, version_label, retrieved_at, effective_from nullable, effective_to nullable, reviewed_at nullable, review_status, archived_content_ref, integrity_checksum). Unknown dates remain unknown. |
| LegalClaim / Citation | LegalClaim(id PK, artifact_id FK, protected_claim_ref, verification_state, uncertainty_reason). Citation(id PK, claim_id FK, source_version_id FK, passage_locator, support_state, jurisdiction_check, time_check). Citation rows alone do not establish support. |
| CourtSearch / Candidate | CourtSearch(id PK, owner_user_id FK, jurisdiction, mode, adapter_version, access_status, created_at). Candidate(id PK, search_id FK, source_ref, court, case_number nullable, protected_details_ref, ambiguity, is_fictional). Minimize stored query identifiers; never store a name-match “identity verified” flag. |
| CaseCandidateLink | CaseCandidateLink(id PK, case_id FK, candidate_id FK, selected_by_user_id FK, selected_at, selection_status). Selection records a user decision; retain source mode and fictional labeling on every downstream view. |
| AuditEvent / DeletionRequest | AuditEvent(id PK, actor_id nullable, event_type, resource_id nullable, outcome, occurred_at). DeletionRequest(id PK, user_id FK, resource_type, resource_id, status, requested_at, live_deleted_at, backup_expiry nullable). Retention schedule and restore deletion ledger remain OPEN. |

### Integrity and authorization rules

Every user-owned relation must resolve to the authenticated owner; check joins as well as direct IDs. Attach only a candidate from the same owner’s search. Do not cascade-delete shared curated legal-source versions when deleting a user. Preserve referenced source versions or invalidate dependent claims. Revoke sessions on account deletion, cancel pending jobs, and reconcile DB and blob deletion. Proposed export approval is invalidated when draft content changes.

## MVP and phase two and three roadmap

APPROVED phase 1 scope and presentation target. The source documents list future capabilities without approving a phase 2/3 allocation. The sequencing below is PROPOSED; no phase 2/3 dates or delivery commitments are approved.

| Phase | Scope and exit condition |
| --- | --- |
| Phase 1 Capstone MVP | All five approved features. Accounts/private storage; document organization/local extraction/optional summaries; employment explanations and reviewed drafts; cited legal information; permitted court discovery or functional fictional/manual fallback. Local and restricted hosted demos use fictional records. All critical feature and safety gates pass before completion claims. |
| Phase 2 Proposed expansion | Record-relief information navigator, civil-rights-restoration information, curated reentry resources and carefully expanded jurisdictions. Start with reviewed source coverage and informational pathways; do not add automated eligibility conclusions. Validate user value, permissions, legal content and safety evaluation before expanding. |
| Phase 3 Proposed collaboration | Explicitly authorized advocate/attorney collaboration, deeper case review, broader multi-jurisdiction discovery and pretrial support. Require delegated access, revocation, role boundaries, consent/audit design, and independent legal/security assessment. No shared-access feature is implied by the MVP account model. |

### Phase 1 delivery windows from the sources

| 2026 window | Planned milestone and evidence |
| --- | --- |
| Nov 18–22 | Architecture/threat model, court-source feasibility, legal-source selection, hosting/cost decisions. Evidence: permitted reproducible query or documented access blocker and fallback plan. |
| Nov 23–29 | Accounts, private cases, encrypted uploads, local extraction and base UI. Begin discovery feasibility/fallback work. Evidence: tested private vertical slice and authorization checks. |
| Nov 30–Dec 6 | Consent gateway, employment assistant, legal retrieval/claim checks, court adapter or fictional/manual route. Evidence: fictional workflows and safety tests. |
| Dec 7–11 | Independent security, adversarial, accessibility and browser checks; restricted hosting; restore rehearsal. Evidence: test results and remediated blockers. |
| Dec 12–14 | Regression, presentation rehearsal and private demo with clear limitations. Target presentation December 14. |

Schedule reconciliation: the earlier PRD places court work in Nov 23–29, while the Spine places adapter/fallback delivery in Nov 30–Dec 6. The table preserves early feasibility and sequences implementation across both windows; this is planning alignment, not evidence of work completed. Live access feasibility must be resolved early enough to deliver the approved fallback.

## Agent implementation context and open decisions

### Binding handoff

APPROVED. DeepSeek builds scoped stories; Codex independently tests; Claude reviews code, threat model and legal-safety assumptions; the owner examines evidence before merge. These names describe the established workflow, not work performed by those agents in preparing this document. No builder self-certification. Failed required tests, critical security defects, privacy breaches or legal-safety failures block main.

- Confirm the intended ProjectSecondChance repository and applicable instructions before editing. The historical DevSquadAI workspace is a different product. Do not change its Git settings or reuse its repository by assumption.
- Use the approved React/Vite/TypeScript and Express modular monolith. Keep identity, cases/documents, notices, legal research, court discovery and AI gateway boundaries explicit. SQLite stores metadata; encrypted blobs and keys have separate boundaries.
- Create a threat model, source/consent policies and implementation ADRs. Build a thin sign-in → private case → validated encrypted upload slice before layering AI and legal interpretation.
- Map existing FR-01–27 and NFR-01–22 to stories and tests. Preserve stable IDs. A suggested repository layout is PROPOSED: apps/web, apps/server, server domain modules, tests, docs/adr and fictional fixtures.
- Treat uploaded and retrieved text as untrusted evidence. No automatic legal conclusions, automatic messages, hidden provider fallback, silent record attachment or secrets in browser code.

### Open choices and responsible next action

| OPEN choice | Owner and evidence needed before reliance |
| --- | --- |
| Court provider / permission | Owner and builder: verify official terms, authorization, access, cost and coverage. Do not infer automation permission from public search access. |
| Runtime AI provider / terms | Owner: choose provider/model, processing terms, exact consent copy and minimal-data policy. Changing provider requires appropriate consent. |
| Authentication / hosting / keys | Builder proposes, reviewer checks, owner approves: maintained library, hosted access restriction, encryption/key recovery and deployment budget. |
| Files / OCR / retention | Builder proposes supported formats, upload/parser limits and OCR engine; owner approves retention/deletion policy including backups. |
| Legal corpus / review | Owner and qualified reviewer: inventory applicable authoritative sources, version/review policy, jurisdiction/date coverage and referral resources. |
| Performance / accessibility | PROPOSED target: evaluate against WCAG 2.2 AA, keyboard and screen-reader flows plus mobile reflow. Set measured file/job/performance budgets after hardware spike. No conformance claim yet. |

## Acceptance evidence and consistency check

### Required evidence package

APPROVED target gates remain unverified. Record exact commands, tool and dependency versions, exit codes, test counts, observed results and limits. Include unit, integration, browser end-to-end, authorization, prompt-injection, upload, privacy/consent and adversarial legal-citation scenarios. No screenshot, code comment or model assertion substitutes for a working test.

- F1: two-account direct-request access attacks fail; sign-out/session revocation works; sensitive storage and deletion behavior are checked.
- F2: readable and scanned fictional inputs, unsupported input, malicious/oversize upload, extraction failure, correction provenance and consent denial are exercised.
- F3: explicit, absent and contradictory dates remain distinguishable; unconfirmed facts do not enter a response as established truth; review/export gate works; no send path exists.
- F4: supported claim, unrelated citation, outdated/conflicting source, wrong jurisdiction and insufficient evidence are checked. Unsupported material claims are withheld.
- F5: document live-access investigation. Demonstrate permitted live path or working labeled fictional search plus manual official lookup; test ambiguous, no-result, unavailable and user-confirmed selection states.
- Recovery: restore a consistent encrypted DB/blob snapshot in a clean environment with separately recovered keys; verify login, file integrity, ownership, provenance and deletion behavior. Include failed-restore alerts and recovery instructions.

### Consistency check completed for this edition

| Check | Result |
| --- | --- |
| Architecture count and feature count | All ten AD IDs and all five approved MVP features are included. No phase 2 feature is made an MVP requirement. |
| Consent and runtime behavior | Refusal preserves local document workflows. External transmission remains server-gated. Runtime provider is not presumed to be DeepSeek, Codex or Claude. |
| Legal and court boundaries | No invented legal rules, actual deadlines, fees or source-coverage claims added. Candidate selection remains distinct from identity proof. Live court access remains optional for MVP completion. |
| Schema and UI alignment | Schemas include source provenance, consent scope, draft approval, source versions and court mode. Wireframes show refusal, uncertainty and fictional labeling. Proposed details remain labeled. |
| Claims of completion | This is a consolidated design. No source inspection or document check establishes software security, test success, legal validation or production readiness. |

### Approval needed for newly proposed detail

Owner review is needed for personas, story packaging, screen layouts, schema, consent wording/renewal behavior, phase 2/3 sequencing, deletion ledger and quantitative/accessibility targets. Until approved, these are suggested implementation context. Approved baseline decisions remain binding.

## Approved functional requirements one

APPROVED source requirements reproduced with stable IDs. This edition elaborates them without renumbering or claiming implementation.

FR-01: Create account, sign in and sign out.

FR-02: Enforce per-user data access and ownership.

FR-03: Encrypt sensitive stored data and documents.

FR-04: Provide deletion requests and disclose retention/backup limits.

FR-05: Prevent unauthorized access to other users' information.

FR-06: Upload supported PDFs and images within defined limits.

FR-07: Organize by case and document type.

FR-08: Extract readable text and generate plain-language summaries where processing is available and consented to.

FR-09: Let users review and correct extracted information and note missing documents.

FR-10: Distinguish document evidence from AI interpretation.

FR-11: Upload pre-adverse or adverse action notices.

FR-12: Explain notices in plain language.

FR-13: Extract explicit dates and deadlines; label ambiguous or inferred timelines as uncertain.

FR-14: Draft professional responses using user-confirmed facts.

FR-15: Require user review and approval before copy/export; no auto-send.

## Approved functional requirements two

APPROVED source requirements reproduced with stable IDs. This edition elaborates them without renumbering or claiming implementation.

FR-16: Retrieve information from curated authoritative sources.

FR-17: Provide inspectable citations for material legal claims.

FR-18: Track source jurisdiction, effective/publication date when known, and verification status.

FR-19: Disclose missing, outdated, contradictory or unverified information.

FR-20: Avoid invented eligibility or guarantees and abstain when evidence is insufficient.

FR-21: Search without a known case number.

FR-22: Investigate Georgia and Nebraska official court-record sources and implement a working authorized integration where feasible. If no permitted live method is available, implement a clearly labeled fictional-data search demonstration; never represent it as live court data.

FR-23: Display available distinguishing details such as jurisdiction, court, case number and parties; minimize sensitive details.

FR-24: Require explicit user confirmation before linking a case to an account.

FR-25: Differentiate possible matches, confirmed selections, and unavailable/no-result states.

FR-26: Provide guided manual lookup with links/instructions for official court-record resources when live access is blocked or unavailable. Test this fallback as part of MVP acceptance.

FR-27: Respect access restrictions and minimize collection, storage and reuse of identifiers and court data.

## Approved nonfunctional requirements

APPROVED source requirements reproduced with stable IDs. This edition elaborates them without renumbering or claiming implementation.

NFR-01: HTTPS/TLS in transit; appropriate encryption at rest with separate key management.

NFR-02: Authentication, authorization and isolation between accounts.

NFR-03: File type/size validation and malicious-file defenses; treat document contents as untrusted.

NFR-04: Keep credentials, secrets and sensitive content out of logs and source control.

NFR-05: User deletion and transparent backup/retention policy.

NFR-06: Provider-specific informed consent before external document AI processing.

NFR-07: Minimize identifying data, especially SSNs.

NFR-08: Cite authoritative sources for substantive legal claims.

NFR-09: Verify jurisdiction and relevant time period.

NFR-10: Distinguish evidence, possible options and unknowns.

NFR-11: Do not invent cases, statutes, deadlines, eligibility or outcomes.

NFR-12: Direct individualized legal questions to qualified assistance.

NFR-13: Actionable failure and recovery states.

NFR-14: Preserve saved work across ordinary failures.

NFR-15: Responsive, keyboard-accessible interfaces and clear form controls.

NFR-16: Plain-language explanations without distorting legal meaning.

NFR-17: Label AI-generated versus source-derived versus user-provided content.

NFR-18: Unit, integration and browser end-to-end tests for critical paths.

NFR-19: Authorization, prompt injection, malicious upload and data-leak tests.

NFR-20: Adversarial fictional legal scenarios, including conflicting and insufficient evidence.

NFR-21: Human legal-content review before real-user launch.

NFR-22: Fictional/anonymized test data until safeguards are verified.

## Source record and final review notes

### Source hierarchy

The user supplied <owner-home>\OneDrive\Desktop\Capstone as the source folder. All three Markdown files were read. The approved PRD governs product scope and the court-discovery fallback amendment. The Architecture Spine records approved AD-01–10 and their detailed boundaries. The Instructor Technical Architecture Guide explains the same design and its demonstration plan.

- S1 next_chapter_capstone_prd.md: version 1.1, updated November 18, 2026; approved product direction, implementation feasibility pending; FR-01–27 and NFR-01–22.
- S2 BMAD_Architecture_Spine.md: AD-01–10 approved November 18, 2026; design only. This resolves stack, storage, authentication principles and delivery controls left general in S1.
- S3 Instructor_Technical_Architecture_Guide.md: presentation edition November 18, 2026; explanatory source consistent with the five features and private demonstration.

### Editorial changes in version two

Project Second Chance is used as the consolidated title requested by the owner. New fictional personas, value-focused stories, actual screen wireframes, a logical schema and phase 2/3 allocation were added as PROPOSED material. Approved requirement IDs and architecture decisions are preserved. Source wording was consolidated where repeated; no new legal advice was added.

### External claims and verification limits

This document does not independently revalidate court sites, prices, provider terms or legal rules. Historical pricing claims from S1 are intentionally omitted. Before integration, the team must verify current official resources, permissions, costs, coverage and processing policies. No court endpoint, live integration, hosted deployment or source corpus is presumed operational.

### Instructor rubric coverage

| Requested item | Included location |
| --- | --- |
| Problem and user value | Opening problem statement and five-feature stories |
| Named personas with ages | Marcus Reed 34 and Denise Carter 52; optional future supporter |
| Actual wireframes | W1–W6 across three illustrated pages |
| MVP and future phases | Five-feature scope and phase 1/2/3 roadmap |
| Data schema and implementation context | Two proposed schema pages, all ten ADs and agent handoff |
| Privacy and No False Hope | Specific AI consent, legal verification and evaluation gates |
| Approval clarity | APPROVED, PROPOSED and OPEN labels; source hierarchy and consistency check |

Document preparation and consistency checking are complete for this submission edition. Product implementation, independent agent testing, code review, legal review and owner approval of proposals are separate future actions.
