# ADR-0002 — Authentication and sessions for the fictional demo

- Status: **Proposed by the builder (DeepSeek)** for E1-S1. It records implementation choices, not new architecture approval. AD-01/02/03/06/09 remain binding. Owner approves; Codex independently tests; actual Claude reviews.
- Date: 2026-11-24. Branch: `feature/e1-s1-authentication`, based on local `main` `c2a1dca28fd295a1a71d20f5e1e2e230edbfdb13`.
- Story: `docs/stories/E1-S1-authentication.md`. Scope: fictional-demo account creation, sign-in, current account and sign-out; no private cases, uploads or AI consent.

## Context

E1-S1 must establish a real identity boundary before private-case work, while preserving the public foundation/health flow and the opt-in Mira prototype. AD-06 requires a maintained server-side authentication library, secure sessions, Argon2id, per-resource authorization and established cryptography. The demo is local, fictional and loopback-only; hosted/production use is out of scope.

## Decisions

### D1 — Maintained libraries, exact pins

| Concern | Choice | Version | Why |
| --- | --- | --- | --- |
| Session middleware | `express-session` | 1.19.0 | Maintained Express session library; explicit regeneration/destroy, cookie and store API |
| Credential authentication | `passport` + `passport-local` | 0.7.0 / 1.0.0 | Established Express authentication middleware and local username/password strategy; strategy is small, stable and auditable |
| Password hashing | `@node-rs/argon2` | 2.2.2 | Argon2id implementation with prebuilt Windows/Linux binaries and maintained N-API binding; no node-gyp build |
| SQLite | `better-sqlite3` | 13.2.0 | Maintained synchronous SQLite driver; Node 26 compatible; file-backed metadata store |
| CSRF | `csrf-sync` | 4.2.1 | Synchronizer-token pattern designed for server-side sessions; no hand-rolled token comparison |
| Abuse limits | `express-rate-limit` | 8.7.5 | Maintained fixed-window limiter with standard headers; per-app store, no forwarded-header trust |

`npm audit --omit=dev` is **0 vulnerabilities** with this set on 2026-11-24. No dependency is hosted or paid. `better-sqlite3` requires Node >=22; runtime verified on Node 26.13.0. The project's `engines` is updated to reflect the actual supported runtime rather than claiming Node 20 compatibility that the native driver does not support.

**Rejected:** `connect-sqlite3` (pulled sqlite3 5.1.7 with critical tar advisories) and `better-sqlite3-session-store` 0.1.0 (2022, GPL-3.0, stale). A small in-repo express-session store over `better-sqlite3` is used and tested; this is a storage adapter, not a password/session algorithm. `better-auth` was considered but adds a larger schema/client surface than this bounded slice needs.

### D2 — SQLite account and session persistence

- Runtime DB: `runtime/psc-auth.sqlite` (ignored). Tests use temporary files; no real credentials.
- Tables: `users(id TEXT PK, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, disabled_at INTEGER)` and `auth_sessions(sid TEXT PK, sess TEXT NOT NULL, expires_at INTEGER NOT NULL)`.
- `users.email` stores a lower-cased/trimmed fictional identifier; uniqueness is enforced by SQLite. IDs are opaque `usr_…` random values.
- `auth_sessions` is the express-session store: JSON payload, expiry timestamp, lazy delete of expired rows on read/write, `busy_timeout`, WAL mode. Store errors propagate; auth routes fail closed.
- Sessions persist across a clean app restart; expiry/revocation still apply. This is tested with a real temporary SQLite file.

### D3 — Argon2id and password policy

Argon2id with explicit measured parameters: **m=19456 KiB, t=2, p=1, outputLen=32, version 0x13** (`@node-rs/argon2`). Library-generated salts; library `verify` for comparison, never manual hash comparison.

Demo password policy: minimum 15 characters, maximum 128 characters (no truncation), passphrases supported, no composition rules, and a small local deny-list of common weak values. Password is never trimmed, logged, returned, stored in the browser or sent anywhere except the same-origin HTTPS/loopback endpoint. No external breach service. Hash parameters are checked/rehashed on successful login when they differ from policy.

### D4 — Session lifecycle and revocation

- Cookie `psc_auth_sid`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `secure:false` **only** on documented loopback HTTP; no wildcard domain; no `__Host-` prefix on loopback because it requires Secure.
- Idle expiry **30 minutes**, rolling renewal; absolute expiry **8 hours** recorded in the session. Server-side store expiry and the absolute check are authoritative even if the browser keeps the cookie.
- Login: regenerate the session ID, clear the pre-login session, re-authenticate with Passport, issue a fresh CSRF token, save before responding. A pre-login/fixated session cookie cannot authenticate after login.
- Logout: `req.logout`, destroy the server session, clear the cookie, respond only after the destroy callback. A failed destroy returns a generic 5xx and does not claim success.
- Private upload/publication and every late private error/408 re-read the stored session before replying; if it is gone, `rejectUnauthorized` destroys the stale request session and returns 401 without re-emitting a valid cookie/body. This closes the gap where only the successful publication path rechecked.
- `PSC_RUNTIME_DIR` may move the auth database and session secret together with the private key/blob runtime for disposable tests; default remains `<project>/runtime`.
- Disabled/missing account: deserialization and `/me` fail closed; no session for a disabled account can authenticate. Sessions may remain as opaque expired rows until cleanup, but they carry no usable identity.
- Separate from Mira's `psc_sid` prototype cookie and its in-memory attempt map. Account operations never import/evaluate the Nuance SDK.

### D5 — CSRF and request protection

- `csrf-sync` synchronizer token stored in the server session; client reads it from `GET /api/auth/csrf` and sends `x-csrf-token` on state-changing requests.
- Auth POST routes require an exact loopback `Origin` (missing/foreign rejected), loopback `Host`, valid JSON ≤1 KiB, and CSRF. The CSRF GET accepts normal same-origin navigation with no `Origin`, rejects a present foreign `Origin`, enforces loopback Host, and returns `no-store`.
- No CORS; `trust proxy` remains false, so `X-Forwarded-For` is ignored. Generic JSON errors only; the final error middleware handles CSRF/parser failures without stacks/paths/body echo.

### D6 — Abuse limits

`express-rate-limit` fixed windows, per app instance:
- login per normalized email + source IP: **5 per 15 minutes**;
- login per source IP: **20 per 15 minutes**;
- registration per source IP: **5 per hour**.

Keys do not reveal account existence; existing and nonexistent accounts receive the same 401/429 behavior for login. A valid-format registration returns the same **201 `{ok:true}`** whether the identifier is new or already exists; an existing password is never overwritten and no second row is created. Invalid syntax/policy still gets a generic 400, and genuine storage failure gets a generic 503. The remaining composed registration/login path can still disclose an existing identifier by whether a subsequent login succeeds, and there is no email ownership verification; this is an accepted residual limitation of the fictional demo, not a claim of complete non-enumeration. The in-memory store is window-bounded (expired entries reset), is local-only, and resets on restart; this is documented, not presented as distributed abuse protection. No permanent lockout.

### D7 — Secret and configuration handling

- Session secret: **48 random bytes** from `node:crypto`, generated once into `runtime/auth-session-secret` (ignored, chmod 600 where supported). No predictable fallback; unreadable/unwritable secret or DB fails startup closed.
- Tests inject deterministic secrets/stores; no real `.env` values are read. Existing Nuance settings remain programmatically loaded and unrelated to auth.
- Account UI copy says local fictional demo; no email delivery, ownership verification, recovery, MFA, OAuth or hosted security is claimed.

### D8 — Routes and UI

- `GET /api/auth/csrf`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- `/account` page: labeled create-account and sign-in forms, autocomplete attributes, pending/generic-error/throttled states, signed-in email and logout; no credentials in URLs/localStorage. `/` keeps the fictional foundation notices and links to `/account`; `/mira` remains opt-in.
- The browser client applies a **10-second** budget to headers plus body parsing, cleans up its timer/abort controller, and never automatically replays a timed-out mutation. On a 401/403 or ambiguous timeout/store failure, the page re-queries authoritative `/me` and CSRF state; it clears the identity only when `/me` confirms no session, preserves a still-valid identity after CSRF/transient failures, and reports uncertainty instead of claiming logout or account creation.
- Initial bootstrap is **single-flight per component client/attempt**: StrictMode's development effect replay shares one CSRF/`me` promise, so only one cookieless CSRF response can mint the session/cookie. Retry, client changes and identity transitions create fresh work; no global token cache is used. Multi-tab/concurrent independent page loads can still produce a fail-closed 403 and rely on the existing reconciliation; that limitation is explicit.
- Registration request creates a fictional account only when the identifier is new; a duplicate receives the same public `201 {ok:true}` without changing the existing password or creating another row. It never signs in the user; sign-in remains explicit. The user-facing copy is neutral because the public response does not distinguish a new account from an existing one.

## Consequences and open items

- This proves account/session boundaries only. Per-resource case/document authorization, encryption, deletion/recovery, consent, legal/court features and hosting remain future gates.
- Recovery is not implemented: a forgotten password has no reset path in this slice; the UI must say so honestly.
- Rate limits are per-process memory and reset on restart; multi-process/hosted use needs a shared store.
- No SMTP/email ownership verification; `@example.test` identifiers are the only accepted namespace. Composed registration-plus-login can still reveal whether a well-formed fictional identifier exists; this residual is documented rather than hidden.
- The account client uses an explicit **10-second** budget covering response headers and body parsing; a timed-out mutation is never automatically replayed, and the page reconciles `/me`/CSRF before changing identity.
- `passport-local@1.0.0` is a small, stable strategy but its last release predates the other pins; it delegates credential checking to this application's Argon2id service. Independent review should confirm that tradeoff remains acceptable.
- Session/account schema is initial; migrations/versioning will be needed before later private-data stories.
- Independent Codex testing and actual Claude review are required before merge; this ADR is not a security certification.
