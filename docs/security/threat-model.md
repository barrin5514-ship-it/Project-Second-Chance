# Project Second Chance threat model

Status: **INITIAL, E0-S1 + E1-S1 + E1-S2 — NOT A SECURITY ASSESSMENT.** Updated 2026-11-24 for local fictional accounts and private cases/documents. No control below is a verified security guarantee. Independent Codex testing and actual Claude review of E1-S2 are pending. Authentication and local private storage exist, but backup/recovery, hosted access, extraction, consent and legal/court controls remain pending for their dedicated stories.

## Scope

In scope: the local React/Vite web app, the Express API on loopback, `/api/health`, the landing/status/retry flow, `/account` and `/api/auth/*`, `/cases` and `/api/cases/*`, SQLite account/session/private metadata, encrypted private blobs and local key material, and the already-approved optional `/mira` connection test. Out of scope: real user records, hosted deployment, OCR/extraction, legal answers, court integrations, external AI consent workflows, password recovery/email, MFA/OAuth and E1-S3 backup/restore/retention guarantees.

## Assets

- Fictional account identifiers, Argon2id password hashes, session IDs and the auth session secret.
- Private case labels/jurisdictions, document filenames/content, encrypted metadata, content hashes and encrypted blobs.
- The local private master key under `runtime/keys`, private data under `runtime/private`, and the SQLite database under `runtime/`.
- `NUANCE_API_KEY`, provider session tokens for the optional Mira test (`st_…`) and account sessions.
- Trust in product labels: fictional versus live data, AI versus human, uncertain versus established fact.
- Availability and integrity of the local demonstration.

## Trust boundaries

1. **Browser (untrusted) ↔ Express API.** The browser can send arbitrary requests; the server owns credential verification, session issuance, CSRF/origin checks, authorization, encryption/decryption and durable writes. `/account` and `/cases` use same-origin requests only; there is no CORS.
2. **Express API ↔ local SQLite / encrypted blob store / keys.** Private metadata is encrypted in SQLite; original bytes exist only as authenticated ciphertext in `runtime/private`; keys are separate under `runtime/keys` and are never sent to the browser, DB or blobs. Private DB+filesystem writes are not one transaction; scoped reconciliation handles known crash windows.
3. **Express API ↔ optional Nuance provider.** Activated only by the explicit Mira Start flow; account/private routes never import or evaluate the Nuance SDK. Automated suites run with the provider key disabled.
4. **Application ↔ future court/legal sources.** Not activated.
5. **Development machine ↔ version control.** `.env`, `runtime/`, databases, uploads, keys and session secrets must stay untracked.

## Controls present in E1-S1/E1-S2 (evidence in `docs/evidence/E1-S2-builder.md`)

| Threat | Current control | Honest limitation |
| --- | --- | --- |
| Password cracking after a database leak | Argon2id via `@node-rs/argon2` with explicit m=19456, t=2, p=1, 32-byte output; library-generated salts; library verify | Parameters are an implementation baseline, not an independent benchmark; a weak user password can still be guessed |
| Credential stuffing / brute force | Per-normalized-email and per-source-IP fixed-window limits on login (15 minutes); per-source registration limit (1 hour); generic 401/429; no permanent lockout | In-memory, per-process, reset on restart; no distributed store or CAPTCHA; a determined attacker can spread across sources |
| Account enumeration | Same generic 401 for wrong password and unknown account; dummy Argon2 verification for missing/disabled accounts; a valid-format registration returns the same 201/body for new and duplicate identifiers without overwriting or creating a second row; no account list | Composed registration-plus-login can still reveal an existing identifier by whether sign-in then succeeds; duplicate registration leaves the existing password unchanged; no email ownership verification exists. This is a documented residual of the fictional no-email demo, not complete non-enumeration |
| Real-looking identifiers | Server accepts only the reserved `@example.test` namespace for registration; UI copy matches; no email delivery | Login attempts with other domains do not create accounts; no real person is verified or contacted |
| Stalled account request / stale identity | Account client has an explicit 10-second budget covering headers and body parsing; bootstrap reaches an actionable Retry; timed-out mutations are not replayed; 401/403/ambiguous action failures re-query `/me` and CSRF before changing identity | Budget is a client-side implementation choice; a timed-out mutation may have succeeded server-side, so the UI reports uncertainty and reconciles rather than claiming success. Synthetic tests cover header/body stalls; real network/proxy faults are not exhaustively simulated |
| Session fixation | Passport regenerates the session id on login; CSRF token is rotated; the pre-login cookie cannot authenticate | Depends on Passport/express-session behavior; covered by regression tests, not a formal proof |
| Session theft / replay | Signed opaque session id; `HttpOnly`, `SameSite=Lax`, path-scoped cookie; server-side rejection after logout/expiry; absolute 8-hour and rolling 30-minute limits | `Secure` is false on documented loopback HTTP; any local process that can read the cookie/DB may impersonate the demo account. Hosted use requires TLS/Secure and separate review |
| CSRF | `csrf-sync` synchronizer token in the session plus exact loopback `Origin` and loopback `Host` checks; no CORS; state-changing routes are POST-only | SameSite and Origin checks are browser-dependent; no protection against a compromised browser/extension |
| Bootstrap cookie/token pairing | Initial bootstrap is single-flight per component client/attempt; StrictMode's development replay shares one CSRF/`me` promise; Retry/client change/identity transitions create fresh work; stale state is ignored | No global token cache; separate tabs are outside the single-flight scope. A mismatched token/cookie is fail-closed with 403 and the existing reconciliation, never accepted |
| Cross-account access | `/api/auth/me` derives identity only from the server session; every case/document route derives owner from `req.user.id` and checks both parent case and document ownership; caller-supplied owner/role/blob/key fields are not used; unknown/foreign IDs return consistent 404; two-account tests | Proves the tested account/case/document API boundary, not every future resource; no sharing/admin paths exist |
| Private metadata/blob confidentiality | AES-256-GCM via `node:crypto` with fresh nonces and AAD binding owner/case/document/version; encrypted metadata for labels, jurisdictions, filenames, MIME, size and hash; only opaque IDs/owner/status/random blob name/technical counters are plaintext; keys derived with HKDF and stored separately | No independent cryptographic audit or formal proof; local key file is not an HSM; metadata timing/size and ciphertext length remain observable; no backup encryption claim |
| Key loss/wrong key | Key-check record verifies the key at startup; missing/corrupt/wrong key with existing data fails closed; no silent regeneration; tests cover key file/config behavior | Lost keys mean unrecoverable data; no recovery/rehearsal in E1-S2 (E1-S3) |
| Tampered/swapped private data | Envelope magic/version/keyId/nonce/tag parsing; AAD owner/case/document/version binding; decrypt authenticates before returning bytes; content SHA-256 verified after decrypt; downloads are no-store/nosniff/attachment | A compromised host with both key and ciphertext can decrypt; no streaming plaintext; local OS-level attacks are out of scope |
| Malicious upload | 5 MiB cap, one file/part/field bounds, `file-type` content detection, PDF page/encryption/corruption checks via `pdf-lib`, PNG/JPEG dimension/pixel checks via `image-size`, filename rejection, multer memory staging | Structural parsers are not an antivirus guarantee; no sandboxed malware scanner; parser/resource limits are bounded but not formally proven |
| Incomplete private write / crash | Ciphertext-only staging, fsync, pending row, atomic rename, ready update; failure cleanup; startup reconciliation removes staging/pending/orphans and marks missing blobs error | DB+filesystem are not transactional; a crash can leave scoped orphans; no distributed transaction or multi-process quota lock |
| Private deletion | Owner+CSRF+explicit confirmation; document/case marked deleting, ciphertext unlink, row cleanup, success only after live removal; failure status/error and download denial | No secure-erasure, backup deletion or recovery guarantee; E1-S3 owns retention/restore |
| Private request/session failure | Reuses expiry-aware auth guard and exact loopback Origin/Host/CSRF checks; 401/403/ambiguous UI actions reconcile `/me`; no browser path/key URLs; 10s JSON/30s file client budgets | Per-process limiter, loopback HTTP, no hosted TLS; future resource endpoints must keep using the shared guard |
| Credential/session data in logs, URLs or browser storage | Passwords only in POST bodies over the same-origin endpoint, hashed before storage; no password/token logging; client keeps credentials in React state only, never URL/localStorage | Error/log review is source- and test-based; no full log-redaction proof |
| Store/secret failure creates false success | Missing/short secret fails startup; session save/destroy failures return generic 503 rather than success; store errors fail closed | Failure injection uses test doubles; disk-full/OS-level faults are not exhaustively simulated |
| Untrusted JSON/parser path disclosure | 1 KiB JSON limit; final error boundary maps 400/403/413 to generic JSON without stacks/paths/body echo | Framework-level parser errors only; future routes need their own limits |
| XSS through account data | React escapes the displayed fictional email; no HTML rendering of account input | No CSP or future document-content sanitisation is claimed |
| Dependency/supply-chain drift | Exact pins; lockfile; `npm audit --omit=dev` reported 0 vulnerabilities on 2026-11-24; Argon2 native binding verified on Windows/Node 26 | Audit is point-in-time, not an SBOM or independent vulnerability assessment |

## Pending controls (OPEN, not activated here)

- **Password recovery/email (future):** no reset bypass exists in this slice. Any recovery delivery needs its own design, anti-enumeration and token-expiry review.
- **AI consent (R15):** server-checked provider/purpose/scope consent, refusal path, revocation and minimum-data filtering.
- **Prompt injection (R16):** uploaded/retrieved/model content treated as evidence, never authority; authorization and consent rechecked at each boundary.
- **Legal safety (R04/R17/R22):** curated versioned sources, claim-level support or abstention, explicit uncertainty, no invented deadlines or eligibility, fictional/live separation.
- **Court access (R01–R03):** permitted official access or approved fictional/manual fallback; no identity claims from name matches.
- **Extraction/OCR (E2):** local extraction, parser sandbox/resource limits, provenance and correction workflows are not implemented.
- **Backup/recovery (R19) and hosting (R21):** consistent encrypted snapshots, separately recovered keys, tested restore; restricted fictional-only hosted demo with TLS, Secure cookies and authentication. E1-S2 live deletion is not backup deletion or secure erasure.
- **Real-use gates (R08/R21):** independent security and qualified legal review before real records or public access.

## Assumptions and limitations

- This is a local, single-operator, fictional-data demonstration. No adversarial multitenant or internet-facing posture is claimed.
- The `/mira` path is a separately approved, opt-in connection test with its own evidence; passing it does not establish account isolation or private-document protection.
- The VS Code Problems panel has not been independently observed; compiler success is not a claim that all editor diagnostics are clear.
- No production legal, privacy or retention conclusion should be drawn from this document.
