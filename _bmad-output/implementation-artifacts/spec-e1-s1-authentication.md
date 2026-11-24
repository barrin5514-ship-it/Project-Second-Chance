---
title: 'E1-S1 fictional-demo authentication and sessions'
type: 'feature'
created: '2026-11-24'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9ae5465'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/process/BMAD_STABLE_TDD.md'
  - '{project-root}/docs/planning/RISK_REGISTER.md'
  - '{project-root}/docs/adr/0002-authentication-and-sessions.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The fictional-demo foundation has no real identity boundary, so later private-case work cannot rely on a tested account/session. The only session today is Mira's in-memory prototype map, which is not account authentication.

**Approach:** Add local fictional-demo account creation, sign-in, authenticated current-account state and sign-out using maintained libraries, Argon2id, SQLite persistence and server-enforced sessions/CSRF/rate limits. Preserve `/` (health/retry), `/mira` and all prior evidence.

## Boundaries & Constraints

**Always:** fictional identifiers only; loopback/local; maintained auth/session/crypto libraries; Argon2id; HTTP-only session cookie; exact-Origin + CSRF for mutations; generic failures; fail closed on store/secret/save errors; separate cookies from Mira; TDD RED→GREEN per behavior.

**Never:** private cases, uploads, encryption/document workflows, recovery/reset, email delivery, MFA/OAuth, hosted use, paid services, Nuance contact from account flows, credentials in URLs/localStorage/logs, merging/pushing, weakening existing Mira/health controls.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| REGISTER_OK | valid fictional email + password, CSRF, exact Origin | 201 created; Argon2id hash stored; no session established | no password/token echo |
| REGISTER_DUP/INVALID | duplicate/invalid identifier, weak/short password | generic 400; no account created; no existence oracle beyond required create failure | no hash/password detail |
| LOGIN_OK | valid credentials + CSRF/origin | 200 user + fresh CSRF; session ID regenerated; cookie HttpOnly/SameSite | no pre-login cookie replay |
| LOGIN_BAD | wrong password or unknown account | identical generic 401 | dummy hash work; no account-existence leak |
| CSRF/ORIGIN | missing/foreign origin, missing/mismatched CSRF, invalid method | 403/405 generic JSON, no-store | no stack/path/body echo |
| ME | valid session | 200 `{user:{id,email}}` only | 401 if anonymous/expired/revoked/disabled |
| LOGOUT | valid CSRF/session | server destroy, cookie cleared, 204; replay fails | destroy failure → generic 5xx, not false success |
| TWO_USERS | independent cookie jars A/B | each `/me` returns only its account; supplied IDs/roles ignored | no list/admin endpoint |
| RATE_LIMIT | repeated login/register | 429 generic retry, existing/nonexistent same; no permanent lock | bounded window; no forwarded-header trust |
| EXPIRY/REVOKE | expired/revoked/disabled session | 401; server enforcement even with cookie | no stale account render |
| PERSIST/RESTART | temp SQLite file, new app instance | account and valid session survive restart; expired/revoked do not | missing/locked store fails closed |
| PARSER | malformed/oversized JSON | generic 400/413 JSON | no stack/path |

</frozen-after-approval>

## Code Map

- `apps/server/src/app.ts` -- mounts health, Mira, JSON/error middleware; add optional auth router before final 404/error handler; keep health independent.
- `apps/server/src/main.ts` -- load auth settings/store; pass auth deps; loopback only.
- `apps/server/src/auth/` -- config, SQLite account store + schema, SQLite session store, password policy/hash, Passport service, routes.
- `apps/web/src/main.tsx` -- add `/account` route; keep `/` foundation and `/mira` lazy.
- `apps/web/src/foundation/FoundationLanding.tsx` -- update accounts-unavailable copy and add `/account` link; keep fictional/No False Hope/upload limitations.
- `apps/web/src/account/` -- client + accessible page/forms; injected client for tests.
- `tests/e2e/auth.spec.ts` -- two contexts, lifecycle, logout/replay, narrow; update foundation/avatar assertions only where copy/navigation requires.
- `docs/adr/0002-authentication-and-sessions.md`, `docs/evidence/E1-S1-builder.md`, threat model/README/risk register.
- Do not alter `avatar/` behavior, health contract, or `apps/server/src/avatar/sessionGuard.ts` Mira cookie semantics.

## Tasks & Acceptance

**Execution:**
- [x] `apps/server/src/auth/password.test.ts` -- policy/hash/verify/weak values; RED then implement `password.ts`.
- [x] `apps/server/src/auth/accountStore.test.ts` -- create/find/duplicate/disabled/persistence; RED then implement `accountStore.ts`.
- [x] `apps/server/src/auth/sessionStore.test.ts` -- set/get/touch/expiry/destroy/prune/failure; RED then implement `sessionStore.ts`.
- [x] `apps/server/src/auth/auth.routes.test.ts` -- register/login/me/logout, CSRF/origin, fixation, expiry/revocation/disabled, two users, limits, faults, restart; RED then implement `authService.ts`/`auth.ts` and mount.
- [x] `apps/web/src/account/accountClient.test.ts` + `AccountPage.test.tsx` -- lifecycle, pending/generic/throttled, stale responses, no storage; UI had a valid RED; client test was written after the small client implementation.
- [x] `apps/web/src/main.tsx`, `FoundationLanding.tsx` + tests -- `/account` route and honest copy; update assertions.
- [x] `tests/e2e/auth.spec.ts` -- two-account contexts, create/login/me/logout/replay/narrow; implemented before E2E, so no E2E RED claimed.
- [x] ADR, threat model, README, risk register, builder evidence; audit/secrets/relevant full checks.

**Acceptance Criteria:**
- [x] Given a fictional email/password, when registered, then an Argon2id hash is persisted and no cleartext/credential echo exists.
- [x] Given valid credentials, when signing in, then a regenerated server session authenticates only that account; wrong/unknown credentials are indistinguishable.
- [x] Given anonymous, forged, expired, revoked or disabled sessions, when requesting `/me`, then 401 and no account data.
- [x] Given account mutations, when Origin/CSRF/method/body is invalid, then generic no-store refusal and no provider/SDK contact.
- [x] Given repeated attempts, then bounded 429 behavior without permanent lockout or existence leak.
- [x] Given a clean restart with the same SQLite file, then accounts persist and valid sessions behave per chosen policy; failures never claim success.
- [x] Given `/account`, then keyboard-accessible create/sign-in/pending/error/signed-in/logout states work on narrow viewports without localStorage/URL credentials.
- [x] Given `/` and `/mira`, then foundation/health/Mira controls remain and misleading accounts copy is corrected.
- [x] Given full checks, then unit/API/browser/type/build/secrets/audit pass and evidence maps RED/GREEN to FR-01/02/05, NFR-02/04/07/13/15/18/19/22, AD-01/02/03/06/09, R05/R11/R23 plus boundaries R07/R09/R10/R20/R21/R24/R25.

## Implementation Notes

- Chose `passport` + `passport-local` rather than a larger auth framework; `express-session` uses a small tested SQLite `Store` because `connect-sqlite3` pulled critical tar advisories and `better-sqlite3-session-store` is stale/GPL. Full rationale and rejected alternatives are in ADR-0002.
- `better-sqlite3@13.2.0` requires Node >=22; `engines` was raised from >=20.12 to >=22.0.0 and the runtime remains Node 26.13.0.
- Registration now returns the same public `201 {ok:true}` for a valid new or duplicate identifier. A duplicate never overwrites the existing password or creates another row; invalid syntax/policy remains a generic 400; genuine storage failure remains 503. Invalid domains outside `@example.test` are rejected. Registration uses a separate 1-hour per-source window (login remains 15 minutes).
- Registration creates an account when the identifier is new but does not sign in; login rotates the session and CSRF token.
- The browser client applies a 10-second budget covering response headers **and** body parsing, with timer/abort cleanup. A timed-out mutation is not automatically replayed. On 401/403/ambiguous failures the page re-queries `/me` and CSRF; it clears identity only when `/me` confirms no session, preserves a still-valid identity, and reports uncertainty rather than claiming logout/account creation.
- Stale bootstrap and action responses are ignored via effect cleanup/request generations; regression tests cover stale sign-in and stale re-bootstrap.
- E2E starts the API with `PSC_E2E_NO_KEY=1` and `PSC_E2E_AUTH_RELAXED=1`; production throttling is covered by API tests, not the relaxed browser run.
- The health route remains before auth session middleware; JSON parsing remains before health to preserve its parser-error contract.
- No private-case/upload/consent/recovery/hosted code was added. `.vscode/` and all earlier evidence were preserved.

## Spec Change Log

- No scope change. The frozen intent's phrase "method" was implemented as explicit generic 405 responses for unsupported auth methods.
- **Review correction (2026-11-24):** uniform valid-registration response, explicit 10-second header/body budget, authoritative session reconciliation, fictional-domain enforcement, and corrected registration-window/secret-size documentation. These are the bounded corrections requested by `docs/evidence/E1-S1-review-triage-13d5886.md`; no private-data or hosting scope was added.

## Review Triage Log

- Independent Codex testing and actual Claude review at `13d5886` required three P2 correction groups; fresh retest/follow-up is pending. The independent probes were preserved unchanged in `.setup/` and now pass 8/8. Builder-only full-run regression: health parser-order test failed after initially mounting health before JSON parsing; route order corrected and the full suite re-ran green. Recorded in builder evidence.

## Verification

**Actual results (2026-11-24, correction pass):**
- `npm test` — **236 passed / 23 files, 0 failed**.
- `npx vitest run --config .setup/vitest.codex-auth.config.ts` — **8 passed, 0 failed** (was 4 failed / 4 passed before corrections).
- `npm run test:e2e` — **50 passed** (desktop + narrow).
- `npm run typecheck` — exit 0.
- `npm run build` — exit 0; existing SDK chunk-size warning only.
- `npm run verify:secrets` — exit 0; `npm run test:secrets` — **7 passed**.
- `npm audit --omit=dev` — **0 vulnerabilities**.
- Independent Codex retesting and actual Claude follow-up remain **PENDING**; no merge, push or deployment.
