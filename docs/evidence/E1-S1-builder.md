# E1-S1 builder evidence — fictional-demo authentication and sessions

Builder: DeepSeek. Status: **BOUNDED REVIEW CORRECTIONS APPLIED — STOPPED FOR FRESH CODEX RETESTING AND ACTUAL CLAUDE FOLLOW-UP.** This is builder evidence, not TDD theatre, not independent verification, not a security certification and not merge approval. No real records, uploads, private cases, hosted deployment, paid service, external message or live provider session was used. The real `.env` was not read or disclosed.

Correction record: `docs/evidence/E1-S1-correction-13d5886.md` (correction commit `5786317`).

## Identity and base

- Story: `docs/stories/E1-S1-authentication.md`; branch `feature/e1-s1-authentication`; base local `main` `c2a1dca28fd295a1a71d20f5e1e2e230edbfdb13` (merge of approved E0-S2 research). Build date 2026-11-24 (America/New_York).
- Installed BMAD Method stable **6.12.4**; renderer run exactly once for this invocation:
  `uv run --no-cache _bmad/scripts/render_skill.py --project-root ... --skill .../.agents/skills/bmad-build` → rendered `workflow.md` followed.
- Spec: `_bmad-output/implementation-artifacts/spec-e1-s1-authentication.md`. ADR: `docs/adr/0002-authentication-and-sessions.md` (written before behavior implementation). Story boundaries and approved PRD/Spine were rechecked.
- Runtime verified: Node **v26.13.0**, npm **11.20.0**, Windows. `package.json` now requires Node **>=22.0.0** because `better-sqlite3@13.2.0` requires Node >=22; this is an implementation compatibility change, not a product requirement change.

## Scope delivered

- Fictional-demo **account creation**, **sign-in**, **current-account state** and **sign-out** at `/account` and `/api/auth/*`.
- Passport local credential verification, `@node-rs/argon2` Argon2id hashes, SQLite accounts/sessions via `better-sqlite3`, `express-session` opaque cookies, `csrf-sync` synchronizer tokens, exact loopback Origin/Host checks, generic failures, per-identifier/source fixed-window limits, login session regeneration, absolute/idle expiry, logout destruction and disabled-account rejection.
- Landing link and honest copy; account activity never imports or contacts Nuance; `/api/health` and `/mira` preserved.

Not delivered: private cases, uploads/encryption, AI consent gateway, legal/court features, password recovery/email, MFA/OAuth, hosting/TLS, admin/advocate roles or any real records.

## Library decisions (details in ADR-0002)

| Concern | Selected exact version |
| --- | --- |
| Sessions | `express-session` 1.19.0 |
| Credential authentication | `passport` 0.7.0 + `passport-local` 1.0.0 |
| Password hashing | `@node-rs/argon2` 2.2.2 (Argon2id, m=19456, t=2, p=1, 32-byte tag) |
| SQLite | `better-sqlite3` 13.2.0 |
| CSRF | `csrf-sync` 4.2.1 |
| Abuse limits | `express-rate-limit` 8.7.5 |
| Types | `@types/express-session` 1.18.2, `@types/passport` 1.0.17, `@types/passport-local` 1.0.38, `@types/better-sqlite3` 7.6.13 |

`npm audit --omit=dev` → **0 vulnerabilities**. Rejected: `connect-sqlite3` (pulled sqlite3 5.1.7 with critical tar advisories) and `better-sqlite3-session-store` 0.1.0 (stale, GPL-3.0). The in-repo SQLite session store is a small `express-session.Store` adapter over `better-sqlite3`, not a custom session/password algorithm; its behavior is directly tested. No unpinned installs.

## TDD evidence (actual order and results)

| Behavior | RED observation | GREEN observation |
| --- | --- | --- |
| Password policy/hash/verify | `npx vitest run apps/server/src/auth/password.test.ts` → **7 failed** (`not implemented`) | same command → **7 passed** |
| SQLite account store | `accountStore.test.ts` → **6 failed** (`not implemented`) | same command → **6 passed**; later added a rehash mutation test (implementation already existed) → file **7 passed** |
| SQLite session store | `sessionStore.test.ts` → **6 failed** (`not implemented`) | same command → **6 passed** |
| Auth routes/lifecycle/CSRF/session boundary | `auth.routes.test.ts` initial → **7 failed** (routes absent/404) | after minimum implementation → **7 passed** |
| Expanded route/negative paths | expanded file → **18 tests, 2 failed** (builder initially expected no cookie on a failed save, and a failed final destroy to leave `/me` at 200) | corrected assertions to the actual fail-closed behavior (503; no authenticatable session); **18 passed**, then **21 passed** after method/config/re-login/disabled additions |
| Browser account page | `AccountPage.test.tsx` against a stub page → **1 failed** (no create/sign-in forms) | after implementation → **9 passed** including pending, short password, throttling and stale-response tests |
| Auth config | `authConfig.test.ts` written after config implementation; no valid RED claimed | **2 passed** |
| Account client | `accountClient.test.ts` written after the client implementation; no valid RED claimed | **5 passed** |
| Real browser flow | auth E2E written after the server/UI implementation; no valid RED claimed | **50 Playwright tests passed** across desktop/narrow projects |

The two corrected route tests were test-expectation corrections, not weakened safety assertions: a failed session save still returns 503 and cannot authenticate; a failed final destroy still returns 503 rather than false success. Both behaviors are asserted.

## Full checks (actual)

| Command | Result |
| --- | --- |
| `npm test` | **236 tests / 23 files passed, 0 failed** (includes 45 new auth server tests, 16 account-page tests, 8 account-client tests) |
| `npm run test:e2e` | **50 passed** (25 per desktop/narrow project): account lifecycle, reload persistence, two-account isolation, logout replay, no-CSRF rejection, narrow keyboard operation, no Nuance/external origin, foundation/Mira regressions |
| `npm run typecheck` | exit 0, no diagnostics |
| `npm run build` | exit 0; Vite built web assets (existing SDK chunk-size warning only) |
| `npm ci --dry-run` | exit 0; lockfile accepted (npm warned that native install scripts are not covered by its allow-list) |
| `git diff --check` | exit 0 |
| `npm run verify:secrets` | exit 0 — no credential leak patterns in tracked source |
| `npm run test:secrets` | **7/7 passed** |
| `npm audit --omit=dev` | **0 vulnerabilities** |

E2E runs with `PSC_E2E_NO_KEY=1` (no provider credit/call) and `PSC_E2E_AUTH_RELAXED=1` (relaxed throttles so both viewport projects are not order-dependent). Production throttles are exercised by the API tests; the relaxed E2E path is not evidence that E2E verifies the production rate limits.

Regression found during the full run: moving health mounting after JSON parsing broke an existing malformed-JSON health assertion. The route order was corrected and the full suite re-ran green; the parser remains before health and auth session middleware remains after health. This is recorded rather than hidden.

## Acceptance-criteria and requirement mapping

| Story AC / requirement | Evidence |
| --- | --- |
| Create/sign in/out with two fictional accounts | API lifecycle + two-agent tests; Playwright lifecycle/two-context tests |
| Real server-side verification, maintained libraries, Argon2id, SQLite | ADR-0002; password/account/session tests; audit |
| Current-account state only for authenticated user | `/api/auth/me` 200/401 tests; forged query/header ignored; two-account tests |
| CSRF, exact Origin, no CORS, generic failures | route tests: missing/foreign Origin, missing CSRF, malformed/oversized JSON, 405; browser no-CSRF test |
| Session fixation/expiry/revocation/logout | regeneration + old-cookie replay, server expiry, revoked row, absolute lifetime, disabled account, logout destroy failure, immediate re-login tests |
| Abuse limits/generic enumeration resistance | per-email/per-IP login limits, registration limit, existing vs unknown 401→429 tests |
| Accessible account UI, narrow viewport, no URL/localStorage credentials | AccountPage tests; Playwright keyboard/narrow/no-URL tests |
| Preserve foundation/health/Mira | full legacy suites and 50 E2E tests; E2E asserts account flows make no Nuance/external request |
| FR-01/02/05, NFR-02/04/07/13/15/18/19/22, AD-01/02/03/06/09 | implemented/tested local scope; per-resource authorization, encryption and real-use controls remain future |
| R05/R11/R23 (supporting R07/R09/R10/R20/R24/R25) | see risk-register E1-S1 section |

## Security and privacy notes

- Passwords are stored only as Argon2id strings; no password, hash, session id or CSRF token is logged by this code. Error responses are generic and do not echo bodies/paths/stacks.
- The auth session cookie is `HttpOnly`, `SameSite=Lax`, path `/`, signed with a generated 48-byte secret. `Secure` is deliberately **false** on documented loopback HTTP; no TLS/hosted claim is made. Account and Mira cookies are separate (`psc_auth_sid` vs `psc_sid`).
- Login uses Passport's session regeneration; the pre-login cookie is tested as unauthenticatable. Logout destroys the server session and clears the cookie only after a successful destroy.
- Sessions are persisted in `runtime/psc-auth.sqlite`; the session secret is generated into `runtime/auth-session-secret`. Both are git-ignored. A missing/too-short secret fails startup closed.
- No real `.env` value was read; no secret or database was committed. `.vscode/` remains owner-local and was not staged.

## Correction pass — review triage 13d5886

The independent review found three P2 groups. Corrections were applied on top of `13d5886` with new maintained RED→GREEN tests; the independent probes in `.setup/` were not edited.

| Correction | Maintained RED | Maintained GREEN |
| --- | --- | --- |
| Uniform valid registration outcome | new/duplicate/domain tests: **3 failed** (duplicate 400 vs 201; duplicate overwrite assertion; real-domain 201 vs 400) | auth routes **23 passed** |
| Request budget covering headers/body, no replay | client timeout tests: **3 failed** (plus one unhandled rejection in the initial RED) | client **8 passed** |
| Reconcile expired/ambiguous session state | account-page recovery tests: **4 failed** (bootstrap stall, sign-in stall, expired logout, 403 identity/token refresh) | account page **16 passed** |

The initial client RED exposed an unhandled rejection because the test expectation was attached after timer advancement; the expectations were attached before advancement so the failure was behavioral, not an unhandled test artefact. After corrections, the unchanged independent probe config passed **8/8** (previously 4 failed / 4 passed). No independent probe was modified.

Registration now returns the same `201 {ok:true}` for a valid new or duplicate `@example.test` identifier, never overwrites the existing hash or creates a second row, and retains generic 400 for invalid/policy failures and 503 for real storage failure. The remaining composed registration-plus-login disclosure limit is documented rather than claimed away. Registration uses a separate **1-hour** per-source window; login remains 15 minutes. The generated session secret is **48 random bytes** (ADR corrected from the stale 32-byte wording).

The account client now has a **10-second** header+body budget with timer/abort cleanup, no mutation replay, and an actionable bootstrap retry. Expired/ambiguous logout or sign-in failures re-query `/me` and CSRF: `/me` 401 clears the stale identity; `/me` 200 preserves it; a failed reconcile preserves the identity and reports uncertainty. Genuine logout-store failures remain 503 on the server and are reconciled rather than blindly declared successful.

Final correction evidence:
- `npx vitest run --config .setup/vitest.codex-auth.config.ts` — **8 passed, 0 failed** (was 4 failed / 4 passed before correction).
- `npm test` — **236 passed / 23 files, 0 failed**; `npm run typecheck` — exit 0.
- `npm run test:e2e` — **50 passed**; `npm run build` — exit 0 (existing SDK chunk warning only).
- `npm run verify:secrets` — exit 0; `npm run test:secrets` — 7/7; `npm audit --omit=dev` — 0 vulnerabilities; `git diff --check` — exit 0.
- Independent probe files were not edited; SHA-256: `codex-auth-independent.test.tsx` `E27A1A3619683E78D441020D59D86DDF5D942E3D9F3380ED997D271C77970B44`, config `700FC50C94B42261BF3ECBC4019BB7ECF248EFFBD4860B188B7ECAA8ACDFCCAE`.
- No merge, push, deployment, paid action, real records or live provider session. Fresh Codex retesting and actual Claude follow-up remain pending.



## Limitations and blockers for independent review

1. **Independent gates not passed.** Codex and actual Claude reviewed `13d5886` and required the bounded corrections above; fresh Codex retesting and actual Claude follow-up are pending. Builder tests do not replace them. No merge/push/deploy.
2. **Loopback HTTP only.** No TLS, Secure cookie, hosted deployment or production abuse protection. The in-memory rate limiter resets on restart and is per-process.
3. **No password recovery/email verification/MFA/OAuth.** UI says so; no reset bypass exists. Valid registration is uniform in its public response, but composed registration-plus-login can still disclose an existing fictional identifier; this residual is documented, not claimed away.
4. **No per-resource authorization/encryption.** Two-account auth isolation is proven; future cases/documents/uploads remain unprotected until E1-S2/E1-S3 and their gates.
5. **Argon2 parameters are an OWASP-baseline implementation choice**, not a measured hardware benchmark or independent cryptographic review.
6. **SQLite is a local single-operator store**; schema migrations, backup/recovery and multi-process consistency remain future work (R19/R25).
7. **Relaxed E2E throttles** (documented above) mean E2E does not exercise production rate limits; API tests do.
8. **No repository-wide CSP or log-redaction proof**; the threat model states the local scope honestly.

## Handoff

- Review the spec, ADR, threat model, auth code/tests and builder evidence for source accuracy, security claims, scope discipline and TDD honesty.
- Independent Codex testing should attempt session fixation/replay, expiry/revocation, CSRF/Origin bypass, enumeration/timing, throttling, two-account isolation, store/secret failure and browser keyboard/narrow flows.
- Actual Claude review remains separate. Owner decides this story's merge only after both gates. No merge, push or deployment was performed.
