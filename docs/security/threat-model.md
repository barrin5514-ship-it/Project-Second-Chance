# Project Second Chance threat model

Status: **INITIAL, E0-S1 + E1-S1 — NOT A SECURITY ASSESSMENT.** Updated 2026-11-24 for the local fictional-demo account/session slice. No control below is a verified security guarantee. Independent Codex testing and actual Claude review of E1-S1 are pending. Authentication now exists locally, but per-case/document authorization, encryption, recovery, consent and hosting remain pending for their dedicated stories.

## Scope

In scope: the local React/Vite web app, the Express API on loopback, the `/api/health` contract, the fictional-demo landing/status/retry flow, the `/account` page and `/api/auth/*` routes, SQLite account/session metadata, and the already-approved optional `/mira` connection test. Out of scope: real user records, production/hosted deployment, private cases, uploads, OCR, legal answers, court integrations, external AI consent workflows, password recovery/email delivery and MFA/OAuth.

## Assets

- Fictional demo account identifiers, Argon2id password hashes and opaque account/session IDs.
- The generated session secret under `runtime/`, the local auth SQLite file, and future encryption keys.
- `NUANCE_API_KEY`, provider session tokens for the optional Mira test (`st_…`) and account sessions.
- Trust in product labels: fictional versus live data, AI versus human, uncertain versus established fact.
- Availability and integrity of the local demonstration.

## Trust boundaries

1. **Browser (untrusted) ↔ Express API.** The browser can send arbitrary requests; the server owns credential verification, session issuance, CSRF/origin checks and durable writes. `/account` uses same-origin requests only; there is no CORS.
2. **Express API ↔ local SQLite / runtime secret.** Account rows and serialized sessions are local metadata. The auth secret is generated into git-ignored `runtime/`; no database, secret or key is sent to the browser. Private document encryption is not implemented.
3. **Express API ↔ optional Nuance provider.** Activated only by the explicit Mira Start flow; account routes never import or evaluate the Nuance SDK. Automated suites run with the provider key disabled.
4. **Application ↔ future court/legal sources.** Not activated.
5. **Development machine ↔ version control.** `.env`, `runtime/`, databases, uploads, keys and session secrets must stay untracked.

## Controls present in E1-S1 (evidence in `docs/evidence/E1-S1-builder.md`)

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
| Cross-account access | No account list/admin route; `/api/auth/me` derives identity only from the server session; caller-supplied ids/query/header ignored; two-account tests | This proves the account boundary only. Future cases/documents need per-resource authorization and ownership checks |
| Credential/session data in logs, URLs or browser storage | Passwords only in POST bodies over the same-origin endpoint, hashed before storage; no password/token logging; client keeps credentials in React state only, never URL/localStorage | Error/log review is source- and test-based; no full log-redaction proof |
| Store/secret failure creates false success | Missing/short secret fails startup; session save/destroy failures return generic 503 rather than success; store errors fail closed | Failure injection uses test doubles; disk-full/OS-level faults are not exhaustively simulated |
| Untrusted JSON/parser path disclosure | 1 KiB JSON limit; final error boundary maps 400/403/413 to generic JSON without stacks/paths/body echo | Framework-level parser errors only; future routes need their own limits |
| XSS through account data | React escapes the displayed fictional email; no HTML rendering of account input | No CSP or future document-content sanitisation is claimed |
| Dependency/supply-chain drift | Exact pins; lockfile; `npm audit --omit=dev` reported 0 vulnerabilities on 2026-11-24; Argon2 native binding verified on Windows/Node 26 | Audit is point-in-time, not an SBOM or independent vulnerability assessment |

## Pending controls (OPEN, not activated here)

- **Private documents (R12/R13):** authenticated encryption with separate keys, content/type/size validation, parser limits, ownership checks and deletion.
- **Per-resource authorization (R05):** every future case/document query must resolve to the authenticated owner; two-account tests must extend to those resources.
- **Password recovery/email (future):** no reset bypass exists in this slice. Any recovery delivery needs its own design, anti-enumeration and token-expiry review.
- **AI consent (R15):** server-checked provider/purpose/scope consent, refusal path, revocation and minimum-data filtering.
- **Prompt injection (R16):** uploaded/retrieved/model content treated as evidence, never authority; authorization and consent rechecked at each boundary.
- **Legal safety (R04/R17/R22):** curated versioned sources, claim-level support or abstention, explicit uncertainty, no invented deadlines or eligibility, fictional/live separation.
- **Court access (R01–R03):** permitted official access or approved fictional/manual fallback; no identity claims from name matches.
- **Backup/recovery (R19) and hosting (R21):** consistent encrypted snapshots, separately recovered keys, tested restore; restricted fictional-only hosted demo with TLS, Secure cookies and authentication.
- **Real-use gates (R08/R21):** independent security and qualified legal review before real records or public access.

## Assumptions and limitations

- This is a local, single-operator, fictional-data demonstration. No adversarial multitenant or internet-facing posture is claimed.
- The `/mira` path is a separately approved, opt-in connection test with its own evidence; passing it does not establish account isolation or private-document protection.
- The VS Code Problems panel has not been independently observed; compiler success is not a claim that all editor diagnostics are clear.
- No production legal, privacy or retention conclusion should be drawn from this document.
