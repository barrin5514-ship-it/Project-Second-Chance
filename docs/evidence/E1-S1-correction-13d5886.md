# E1-S1 correction evidence — review triage 13d5886

Date: 2026-11-24 (America/New_York). Target reviewed commit: `13d58861acf52b4381c6cec92948ec4341764bed`. Correction commit: **`5786317`** on `feature/e1-s1-authentication`. This report was committed after the correction commit; the code/doc correction itself is `5786317`.

Inputs: [triage](E1-S1-review-triage-13d5886.md), [Codex independent testing](E1-S1-codex-independent-testing-13d5886.md), [actual Claude review](E1-S1-claude-review-13d5886.md). The three review files and the independent probes were preserved. No merge, push, deployment, paid action, real records or live provider session occurred; the real `.env` was not read.

## Disposition

All three P2 groups were corrected within the existing fictional-auth scope. The register-oracle exception was **not** accepted as documentation-only: the server now gives a uniform public outcome for valid new/duplicate registration. No new email service, recovery flow, private-data feature or hosting capability was added.

## Corrections and observed TDD evidence

### 1. Uniform valid-registration outcome

- `201 {ok:true}` for both a valid new identifier and a valid duplicate `@example.test` identifier.
- A duplicate never overwrites the existing hash, creates a second row or signs the user in. Existing credentials still work; a different password supplied with the duplicate does not.
- Invalid syntax/policy remains a generic 400; genuine storage failure remains 503.
- Only the reserved `@example.test` namespace is accepted, matching UI copy; a well-formed real domain is rejected.
- Registration has a separate **1-hour** per-source window; login remains **15 minutes**.
- Residual documented: composed registration-plus-login can still reveal an existing identifier by whether sign-in succeeds; no email ownership verification exists.

**RED:** `npx vitest run apps/server/src/auth/auth.routes.test.ts` → **3 failed / 20 passed (23 total)** — duplicate returned 400, duplicate-overwrite assertion failed, real domain returned 201.
**GREEN:** same command → **23 passed**.

### 2. Bounded account requests and honest recovery

- `AccountClient` now has an explicit **10-second** budget covering headers **and** body parsing.
- Timer and `AbortController` are cleared in `finally`; JSON/body stalls become `AccountRequestError(0,'timeout')`.
- A timed-out mutation is never automatically replayed.
- Bootstrap reaches the existing error + Retry state after a header or body stall.
- Sign-in/create/logout timeouts return to actionable messages and clear `busy`; uncertain outcomes re-query authoritative state rather than claiming success.
- A timed-out sign-in that actually established a session is reconciled to the authoritative `/me` identity; a timed-out registration reports uncertainty rather than claiming creation.

**RED:** `npx vitest run apps/web/src/account/accountClient.test.ts` → **3 failed / 5 passed (8 total)** (plus one unhandled rejection in the initial RED because the expectation was attached after timer advancement). `AccountPage.test.tsx` → **4 failed / 9 passed (13 total)** for bootstrap stall, sign-in stall, expired logout and 403 token/identity refresh.
**GREEN:** client **8 passed**; account page **16 passed** after adding stale-re-bootstrap, uncertain-sign-in and pending-logout regression coverage.

### 3. Expired/revoked/ambiguous session reconciliation

- On 401/403 and ambiguous timeout/network/store failures, the page re-queries `/me` and CSRF.
- `/me` 401 clears the stale identity, refreshes the token and offers sign-in.
- `/me` 200 preserves the still-valid identity and refreshes CSRF (e.g. invalid CSRF or transient logout failure).
- A failed reconciliation preserves the prior identity and reports uncertainty; it does not claim logout or clear identity.
- Successful logout still destroys the server session and clears the cookie; a genuine destroy failure remains a generic server 503. The page reconciles rather than blindly claiming success.
- Stale bootstrap/action responses are ignored through effect cleanup and request generations; a stale re-bootstrap test covers this.
- Sign-in and sign-out remain mutually unavailable while an action is pending.

**RED/GREEN:** included in the page counts above. The unchanged independent expired-session probe changed from failing to passing.

### 4. Documentation/accuracy corrections

- ADR: registration window is 1 hour; session secret is **48 random bytes** (was incorrectly 32); uniform valid-registration residual and 10-second reconciliation behavior documented.
- Threat model: registration enumeration row now states uniform valid response plus the composed registration/login residual; added fictional-domain and stalled-request/recovery rows.
- Spec: correction notes and actual verification counts.
- Risk register/delivery plan: corrected status and counts.
- Builder evidence: correction RED/GREEN record and exact final commands.
- UI copy: neutral “Account request accepted… If this fictional account is new…” instead of claiming creation; all account copy continues to say no email/recovery.

## Independent probes (unchanged)

Command: `npx vitest run --config .setup/vitest.codex-auth.config.ts`

- Before correction: **4 failed / 4 passed (8 total)**.
- After correction: **8 passed / 0 failed**.

Probe files were not edited. SHA-256:
- `.setup/codex-auth-independent.test.tsx`: `E27A1A3619683E78D441020D59D86DDF5D942E3D9F3380ED997D271C77970B44`
- `.setup/vitest.codex-auth.config.ts`: `700FC50C94B42261BF3ECBC4019BB7ECF248EFFBD4860B188B7ECAA8ACDFCCAE`

The rate-limit probe still emits express-rate-limit's expected trust-proxy validation warning to test stderr when forged `X-Forwarded-For` values are injected; no response disclosed credentials/stack text and the 21st request was 429.

## Final checks

| Command | Result |
| --- | --- |
| `npm test` | **236 passed / 23 files, 0 failed** |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | **8 passed / 0 failed** |
| `npm run test:e2e` | **50 passed** (desktop + narrow Chromium) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; existing SDK chunk-size warning only |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed / 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |

E2E still uses `PSC_E2E_NO_KEY=1` and `PSC_E2E_AUTH_RELAXED=1`; production rate limits are covered by API tests, not the relaxed browser run.

## Remaining limitations / handoff

- Fresh **Codex retesting** and actual **Claude follow-up** are pending; this file is builder evidence, not independent verification, security certification or merge approval.
- Composed registration-plus-login can still disclose whether a fictional identifier exists; no email verification exists. The direct valid-registration status/body oracle is removed.
- Loopback HTTP, no TLS/Secure cookie, no hosted rate-limit store, no password recovery/MFA/OAuth, no per-resource authorization/encryption and no private cases/uploads remain out of scope and OPEN.
- The 10-second budget and 1-hour registration window are explicit implementation choices, not owner-approved product constants.
- Preserve the three review reports, these probes and owner-local `.vscode/` for fresh independent gates.

No merge, push or deployment was performed.
