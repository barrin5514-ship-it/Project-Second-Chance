# Actual Claude review — E1-S1 13d5886

Date: 2026-11-24 (America/New_York). Reviewed commit: `13d58861acf52b4381c6cec92948ec4341764bed`.
Actual reviewer: authenticated first-party Claude Code, requested `sonnet`, reported `claude-sonnet-5-5`. Exit 0, success, no permission denials. Read/Glob/Grep only; no shell/edit/MCP and private-setting reads blocked. Claude did not browse or execute tests. Codex's suspected issues were supplied in the review prompt; Claude assessed the source separately, not the test execution.

Codex disposition: three P2 groups are independently reproduced. Merge remains blocked until corrected, despite the review's conditional readiness phrasing. Read `E1-S1-review-triage-13d5886.md`; specifically, Claude's suggestion to merely document the registration oracle is not owner authorization to relax A1. The actual test observations are in `E1-S1-codex-independent-testing-13d5886.md`.

Reviewer response preserved verbatim below.

---
# E1-S1 independent review at 13d5886

I found no P1 (merge-blocking) defect. I found three P2 items and several P3 items. This is a source review only. I ran nothing, so test counts below are the builder's claims. The Codex run is separate. Where I describe `express-session` or `passport` behavior, I reasoned from my understanding of those libraries. I did not read their `node_modules` source.

## P2 findings

**P2-1: The web client has no request deadline, so the UI can hang indefinitely**
- Code: `apps/web/src/account/accountClient.ts:44-50`, `60-65`, `84-99`. Every `fetch` and `response.json()` call has no `AbortSignal`.
- Trigger: the API accepts the connection but stalls, for example a hung SQLite lock (`busy_timeout` is 5 s, then it errors) or a stalled Vite proxy.
- Impact at mount (`AccountPage.tsx:58-79`, `195-199`): `loading` stays true. The page shows "Loading account…" with no forms and no retry button, because the retry button only appears after a rejection. A reload is the only way out.
- Impact in actions (`:100-105`, `:127-132`, `:151-155`): `busy` never clears, so every action button stays disabled.
- No failure is ever reported, which falls short of the A7 pending and failure behavior. A8 notes the root health check already has a bounded timeout, so there is a precedent in the repo.
- Correction: add a timeout to the shared client helper with `AbortSignal.timeout(~8–10 s)`. Map an abort to an `AccountRequestError(0, 'timeout')`. Make sure the `readJson` body read is covered too. Add one client test and one page test using a never-resolving promise.

**P2-2: Expired or revoked sessions leave a stale "signed in" view, and sign-out becomes unusable**
- Code: `AccountPage.tsx:58-79` and `:146-179`. `me()` runs only on mount. The 401 and 403 responses from `logout` and `login` never trigger a re-bootstrap.
- Trigger: the idle (30 min) or absolute (8 h) limit passes, or the account is disabled, while the tab stays open.
- Impact: the page keeps showing "Signed in as {email}" because nothing re-queries the server. Clicking Sign out sends a POST. The server session is gone, so the CSRF state is missing and `csrf-sync` returns 403. The UI then shows "could not verify the request. Refresh…" (`errorMessage`, `:29`) and stays in the signed-in view.
- This conflicts with A7's "handle … expired sessions without showing a previous account." The server enforces expiry correctly, so this is a display and recovery problem only.
- The existing test at `AccountPage.test.tsx:177` covers only a 503 on logout. Nothing covers 401/403.
- Correction: in the three handlers, treat 401 or 403 as session loss. Re-run `csrf()` plus `me()`, clear `user` if `me()` returns null, and show "Your session ended. Sign in again." Optionally re-check on `visibilitychange`. Add a page test for an expired session on logout.

**P2-3: Registration reveals which identifiers exist, and the docs overstate that**
- Code: `auth.ts:261-272` and `authService.ts:48-59`. A valid new account returns 201 `{ok:true}`. A duplicate returns 400 `{error:'invalid-request'}`. Invalid input returns the same 400, but a well-formed email with a valid password can only get 400 if the account exists.
- Because the answers differ, anyone can learn whether a well-formed email is registered, up to 5 attempts per 15 minutes per IP (see the rate-limit item under P3). Each probe also creates an account when the identifier is free.
- Story A1 says "without disclosing another account's existence." Threat-model row `docs/security/threat-model.md:31` lists "generic registration failure" as an enumeration control. The limitation column calls the duplicate failure "necessary" but never says existence is distinguishable.
- Without email delivery this is largely unavoidable. Silently returning 201 for duplicates would leave users unable to tell why they can't sign in.
- Correction (bounded): keep the behavior. Reword the threat model, ADR D6 and the evidence to say "registration discloses whether a well-formed identifier is taken, throttled per source; accepted residual for fictional identifiers; no email channel exists." Say that explicitly rather than claiming non-enumeration. The 400 UI text (`AccountPage.tsx:27`) also tells a user with a valid-format email to use a fictional @example.test address, which is misleading for a duplicate. Consider a neutral "could not create this account."

## P3 findings (non-blocking)

1. **Real-looking emails are accepted.**
   - Code: `authService.ts:27-32`. Validation accepts any `x@y.z`. The UI and story say fictional `@example.test`, but the server never enforces it, so a real email can be persisted.
   - Correction: allow only the reserved fictional domains `example.test` and `example.com`, or document the gap.
2. **Absolute expiry lives in a route-local, non-exported middleware.**
   - Code: `requireAuth` at `auth.ts:191-207` is not part of `AuthDependencies` (`:40-46`). It is enforced only on `/api/auth/me`.
   - Impact: E1-S2 routes that use `req.isAuthenticated()` would bypass the 8 h cap. Rolling touch keeps the row alive past it.
   - Correction: enforce the cap in a global middleware right after `passport.session()`, or export `requireAuth`.
3. **The session store `set` is an upsert**, at `sessionStore.ts:48-49` and `:109-121`.
   - Reading the library semantics, `express-session` only calls `set` when the session hash changed. `touch` is `UPDATE`-only, so a stale rolling request cannot recreate a deleted row.
   - Current authenticated routes don't mutate an authenticated session, so I see no reachable resurrection today.
   - The risk is latent: any future route that writes `req.session` after a concurrent logout would recreate a revoked session. Concurrent double-logout also briefly re-saves then destroys.
   - Correction: add a concurrency test, such as a slow request and logout interleaved via a deferred store callback, and keep the upsert behind that test.
4. **A corrupt session row is never removed.**
   - Code: `sessionStore.ts:99-106`. `JSON.parse` failure calls `callback(error)` without deleting. `express-session` forwards that error, so every request carrying that cookie gets a 500 until the row expires.
   - Correction: destroy the row and return `null`.
5. **Argon2 failures are reported as wrong credentials.**
   - Code: `password.ts:47-53` swallows every verify error and returns false.
   - Impact: a broken native binding or a corrupt stored hash yields a 401 "invalid credentials" instead of 503. It fails closed but misleads.
   - Related: `authService.ts:45` starts `dummyHash` eagerly. A hash rejection at startup would be an unhandled rejection.
6. **Smaller items:**
   - `/api/auth/csrf` (`auth.ts:244`) has no limiter. Each cookie-less call writes an anonymous session row, which is pruned only after 30 minutes.
   - The login throttle counts successful logins too, so 6 sign-ins in 15 minutes locks the user out.
   - The email limiter key includes the IP (`:222`), so it is per email-and-IP rather than per account. That is fine on loopback but weaker than "account-targeted" in A5.
   - `Retry-After` is always the full window (`:210`), which is conservative.
   - The handlers have no `busy !== null` guard, so a programmatic double submit can leave the cookie jar on a different session than the UI shows.
   - `main.ts:21-35`: a thrown auth config error stops the whole process, including health and Mira. That is fail-closed, but it is not "health independent of account configuration" at the process level.
   - `app.ts:74`: the session middleware is global after health, so a store error also affects `/api/avatar/*` requests that carry an auth cookie.
7. **Documentation mismatch.** ADR D6 says registration is limited to 5 per hour. `auth.ts:105-108` applies the 15-minute window to every limiter.

## Things I checked and found sound (by source reading)

- **Fixation:** `req.login` regenerates the session, the CSRF token is rotated (`:312`), and the session is saved before the 200. A save failure destroys the session and returns 503.
- **Replay and tampering:** logout deletes the row, signed cookies are verified by `express-session`, and the store rejects expired rows. A disabled account fails at `deserializeUser`.
- **Idle expiry:** it is enforced by the row's `expires_at`, independent of the browser cookie.
- **Failure handling:** a failed insert returns 503, with no 201 before the insert completes. A failed destroy during logout returns 503 and does not clear the cookie.
- **Request protection:** Origin and Host checks, a CSRF header, a 1 KiB body limit, no CORS and no `trust proxy` are all in place. The bootstrap GET allows a missing Origin and the POST routes require an exact one. Error responses are generic JSON with `no-store`.
- **Custom session store:** against its own behavior it holds up. Reading it, I have no objection to it being in-repo.

## Test evidence versus inspection

- **Covered by the builder's tests (not run by me):**
  - fixation and replay
  - logout and re-login
  - absolute expiry
  - restart persistence
  - failed save and destroy
  - CSRF and Origin
  - throttling
  - 405 responses
  - stale sign-in response
- **Gaps against the story:**
  - There is no real concurrency test. The test named "immediately after awaited logout" (`auth.routes.test.ts:685`) is sequential, but A2 asks for a pending-logout versus immediate-login race.
  - There is no spoofed `X-Forwarded-For` test (grep found none), though A5 lists it. The default Express `trust proxy` setting makes it safe by source.
  - The "revoked" test deletes rows directly, which is weak evidence.
  - There is no timeout, expired-session or 401/403 UI test, and the E2E spec has no expiry case.
- The builder's disclosed TDD gaps for the client and E2E are honest and I don't count them against the slice. Only the missing behaviors above are gaps.

## Readiness

I found no P1 and no critical vulnerability. The server-side session and credential boundary is acceptable for the stated local, fictional scope. I'd call it **conditionally ready for owner merge consideration**, with these conditions:
1. Fix P2-1 and P2-2, which are small and client-only, or have the owner explicitly accept them.
2. Correct the P2-3 wording in the docs.
3. Preferably add the concurrency and `X-Forwarded-For` tests, and handle P3 items 2 and 4 before E1-S2 builds on this.

This is not a security or legal certification. I authorized no merge, push or deploy and made none.
