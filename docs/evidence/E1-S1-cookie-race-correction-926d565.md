# E1-S1 cookie/token bootstrap correction — 926d565

Date: 2026-11-24 (America/New_York). Target reviewed HEAD: `926d565fee8d900eb34e7085af2cdb9f2484a37f`. Bootstrap-race correction commit: **`a3feb85`** on `feature/e1-s1-authentication`. This report is committed after the correction commit.

Inputs: [follow-up triage](E1-S1-followup-triage-926d565.md), [Codex retest](E1-S1-codex-retest-926d565.md), [actual Claude follow-up](E1-S1-claude-followup-926d565.md), [supplemental cookie-race review](E1-S1-claude-cookie-race-review-926d565.md). All four are preserved and committed. No merge, push, deployment, paid action, real records or live provider session occurred; the real `.env` was not read.

## Reproduced fault

The AccountPage bootstrap effect ran twice under StrictMode, creating two cookieless CSRF requests. Each response minted a distinct session/cookie. The active effect chose the newer token while the browser could process the older response's `Set-Cookie` last, producing a token/cookie mismatch and a correctly rejected registration (403).

Independent race probe before correction:

```text
{"initialResponses":2,"tokenFromResponse":2,"cookieFromResponse":1,"status":403}
```

Command: `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` → **1 failed**.

## Correction

- Added a component-scoped bootstrap ref keyed by `{ client, attempt, promise }`.
- StrictMode's two effect runs reuse the same promise for the same client/attempt, so only one cookieless CSRF request mints the session.
- `active` state guards remain; stale responses still cannot update state.
- Retry increments `attempt` and creates fresh work; changing clients creates fresh work.
- Identity transitions (login/logout/reconciliation) call fresh CSRF directly; the bootstrap result is never reused as a global token cache.
- No StrictMode removal, sleep, automatic replay, server-check weakening or timeout change.

The race probe after correction:

```text
{"initialResponses":1,"tokenFromResponse":1,"cookieFromResponse":1,"status":201}
```

Command: same probe → **1 passed**.

## Observed RED → GREEN

| Test | RED | GREEN |
| --- | --- | --- |
| StrictMode shares one bootstrap | `AccountPage.test.tsx` focused test → **1 failed** (`csrf` called **2** times) | full account page → **21 passed** after adding delayed StrictMode, Retry, post-logout fresh token, client-change and unmount coverage |
| Independent race probe | **1 failed**; 2 initial responses, token 2/cookie 1, status 403 | **1 passed**; 1 initial response, token/cookie 1, status 201 |

The new maintained tests cover:
- StrictMode initialization and a delayed initial CSRF response;
- Retry after a rejected bootstrap (fresh request, not a cached rejection);
- fresh token after logout/identity transition;
- client-change stale-bootstrap guard;
- unmount with a late bootstrap response;
- existing stale sign-in, reconciliation and timeout regressions.

## Verification (actual)

| Check | Result |
| --- | --- |
| `npm test` | **241 passed / 23 files, 0 failed** |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | **8 passed / 0 failed** |
| foundation independent probes | **6 passed** |
| real-SDK contract independent probes | **3 passed** |
| Mira media/restart independent probes | **2 passed** |
| `npx playwright test --config .setup/playwright.codex-auth-race.config.ts` | **1 passed** |
| `npm run test:e2e` | **50 passed** (desktop + narrow Chromium) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; existing SDK chunk-size warning only |
| `npm run verify:secrets` | exit 0 |
| `npm run test:secrets` | 7 passed / 0 failed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | exit 0 |

E2E still uses `PSC_E2E_NO_KEY=1` and `PSC_E2E_AUTH_RELAXED=1`; production rate limits are covered by API tests.

## Preserved probes

The race probe/config and original independent probes were not edited.

SHA-256:
- `.setup/codex-auth-cookie-race.spec.ts`: `AF429978150EBDABAFC87AC02AF03564BE552D0EE7C386DA12993BD81E49921B`
- `.setup/playwright.codex-auth-race.config.ts`: `C2DCE4E230242DD6885286E22464699BA8FF6223C5D5694D2A9AD8705A572EAE`
- `.setup/codex-auth-independent.test.tsx`: `E27A1A3619683E78D441020D59D86DDF5D942E3D9F3380ED997D271C77970B44`
- `.setup/vitest.codex-auth.config.ts`: `700FC50C94B42261BF3ECBC4019BB7ECF248EFFBD4860B188B7ECAA8ACDFCCAE`

## Remaining limitations / handoff

- **Fresh Codex verification and actual Claude follow-up remain pending.** This is builder evidence, not independent approval, security certification or merge authorization.
- The single-flight is component-scoped. Separate tabs/concurrent independent page loads can still produce a fail-closed 403 with the existing authoritative reconciliation; multi-tab coordination is not implemented.
- The older P3 notes (malformed 2xx reconciliation, register-uncertainty page coverage, parallel `me`/CSRF expiry ordering, future resource/hosted controls) are not expanded in this bounded pass.
- Loopback HTTP/no Secure cookie, per-process limiter, composed registration/login disclosure, older Passport-local pin, no private-resource authorization/encryption, no recovery/email/MFA and no hosted security remain documented limitations/future gates.
- Owner-local `.vscode/` remains untracked and preserved.

No merge, push or deployment was performed.
