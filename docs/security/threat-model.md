# Project Second Chance threat model

Status: **INITIAL, E0-S1 ONLY — NOT A SECURITY ASSESSMENT.** Written 2026-11-23 for the local fictional-demo foundation. Codex independent testing and actual Claude review have occurred once; both found the same two P2 fault paths (stalled health check, parser stack disclosure), which are now fixed with maintained tests and unchanged independent probes. Retest is pending. No control below is a verified security guarantee. Authentication, encryption, consent and legal-verification controls are **not implemented** and remain pending for their dedicated stories.

## Scope

In scope: the local React/Vite web app, the Express API on loopback, the `/api/health` contract, the fictional-demo landing/status/retry flow, and the already-approved optional `/mira` connection test. Out of scope: real user records, production/hosted deployment, accounts, private cases, uploads, OCR, legal answers, court integrations and external AI consent workflows.

## Assets

- Future private case documents, extracted text, notices and drafts (not stored in this story).
- Credentials: `NUANCE_API_KEY`, future authentication secrets, future encryption keys.
- Provider session tokens for the optional Mira test (`st_…`) and the API key (`nk_…`).
- Trust in product labels: fictional versus live data, AI versus human, uncertain versus established fact.
- Availability and integrity of the local demonstration.

## Trust boundaries

1. **Browser (untrusted) ↔ Express API.** The browser can send arbitrary requests; the server owns validation, authorization and durable writes. In E0-S1 the only new read-only route is `/api/health`; the Mira routes keep their existing Origin, loopback-Host, session-cookie and CSRF checks.
2. **Express API ↔ local filesystem / future SQLite and encrypted blobs.** Not activated in E0-S1. Environment secrets are read server-side only.
3. **Express API ↔ optional Nuance provider.** Activated only by the explicit Mira Start flow; the foundation landing and health check never call it. Automated suites run with the key disabled.
4. **Application ↔ future court/legal sources.** Not activated.
5. **Development machine ↔ version control.** `.env`, databases, uploads, keys and runtime data must stay untracked.

## Controls present in E0-S1 (evidence in `docs/evidence/E0-S1-builder.md`)

| Threat | Current control | Honest limitation |
| --- | --- | --- |
| Health route leaks paths, versions, environment or user data | Fixed exact JSON body; reads no config, request path or provider; generic JSON 404 | Source-inspection/tests only; no independent penetration test |
| Foundation flow calls an AI provider or court source | `/` loads no SDK and requests only same-origin `/api/health`; browser test asserts every `/api/` request is `/api/health` and none matches `avatar`/`nuance` | A future change could add a call; regression tests are the guard |
| Local service exposed to the network | Vite and Express bind `127.0.0.1`; no hosting configured | A misconfigured host/port or proxy could still expose it; no hosted hardening |
| Secret committed or sent to browser | `.env` ignored; `.env.example` placeholders; server-only key loading; `verify-secrets` source scan | The guard is pattern-based and not a full secret scanner; no history rewrite proof |
| Health check stalls forever with no recovery | `fetchHealth` aborts after 8 s, with the timer armed through JSON body reading; the landing shows unavailable + keyboard Retry | Timeout value is an implementation choice; tested with synthetic stalled fetch/body, not every real network failure |
| Malformed or oversized JSON leaks a stack or local paths | Final JSON error boundary maps body-parser 400 → `{error:"bad-request"}`, 413 → `{error:"payload-too-large"}`, other errors → 500 `{error:"internal"}`; `no-store`, no body/path/stack echo, no logging | Covers this app's parser/framework errors; not a general Express hardening proof |
| Untrusted request body/path reflected into errors | Health ignores input; 1 kb JSON limit; generic 404; sanitized parser/size error boundary | Parsing stays enabled; other future routes need their own input limits |
| Cross-site request to state-changing Mira routes | Existing exact-Origin POST check, loopback Host check, HttpOnly SameSite=Strict cookie and double-submit CSRF | Applies to the opt-in Mira prototype only; not an account-security design |
| XSS through displayed data | React escaping; E0-S1 renders static copy and health status only | Future extracted/user content needs its own sanitisation and CSP review |
| Dependency/supply-chain drift | Lockfile, exact pins, recorded installed versions; Express 4.22.3 patched after audit | No independent vulnerability audit or SBOM claimed |

## Pending controls (OPEN, not activated here)

- **Accounts/sessions (R11):** maintained auth library, Argon2id, secure cookies, throttling, revocation and authorization tests.
- **Private documents (R12/R13):** authenticated encryption with separate keys, content/type/size validation, parser limits, ownership checks and deletion.
- **AI consent (R15):** server-checked provider/purpose/scope consent, refusal path, revocation and minimum-data filtering.
- **Prompt injection (R16):** uploaded/retrieved/model content treated as evidence, never authority; authorization and consent rechecked at each boundary.
- **Legal safety (R04/R17/R22):** curated versioned sources, claim-level support or abstention, explicit uncertainty, no invented deadlines or eligibility, fictional/live separation.
- **Court access (R01–R03):** permitted official access or approved fictional/manual fallback; no identity claims from name matches.
- **Backup/recovery (R19) and hosting (R21):** consistent encrypted snapshots, separately recovered keys, tested restore; restricted fictional-only hosted demo with TLS and authentication.
- **Real-use gates (R08/R21):** independent security and qualified legal review before real records or public access.

## Assumptions and limitations

- This is a local, single-operator, fictional-data demonstration. No adversarial multitenant or internet-facing posture is claimed.
- The `/mira` path is a separately approved, opt-in connection test with its own evidence; passing it does not establish account isolation or private-document protection.
- The VS Code Problems panel has not been independently observed; compiler success is not a claim that all editor diagnostics are clear.
- No production legal, privacy or retention conclusion should be drawn from this document.
