# Actual Claude supplemental cookie-race review — E1-S1 926d565

Date: 2026-11-24 (America/New_York). Reviewed HEAD `926d565fee8d900eb34e7085af2cdb9f2484a37f`.
Actual reviewer: authenticated first-party Claude Code, requested sonnet, reported `claude-sonnet-5-5`. Exit 0, success, no permission denials. Read-only Read/Glob/Grep; no shell/edit/MCP/providers or private settings. This review assesses source consistency and supplied Codex observations; Claude ran no probe or browser.

Codex disposition: the condition requested in this review has now been met. The independent delayed-real-response probe failed and its instrumentation observed `{initialResponses:2, tokenFromResponse:2, cookieFromResponse:1, status:403}`. Only response ordinals/status were printed, no raw cookie or token. Thus the source-consistent mechanism below is now independently reproduced, not merely inferred. Full browser suite had 48 passed/2 failed; unchanged isolated reruns had 2 passed and do not clear the gate. No application code was modified. Read `E1-S1-followup-triage-926d565.md` before applying the suggested fix; bootstrap cache scoping must also honor client/attempt changes and identity transitions.

Reviewer response preserved verbatim below.

---
# E1-S1 cookie/token bootstrap race: source review of 926d565

I read `main.tsx`, `AccountPage.tsx`, `accountClient.ts`, `auth.ts`, `playwright.config.ts` and Codex's probe spec. I ran nothing, including the probe, and its outcome is Codex's to report. This supplements my earlier conditional pass and is not a merge approval.

## Verdict
- **Source-consistent: yes.** The source gives a deterministic mechanism that matches every element of the sanitized trace.
- **Security regression: no.** The failure is a fail-closed 403 from CSRF protection. Nothing was weakened or bypassed.
- **Local-demo gate: I recommend it stay blocked.** One full-suite run had 2 of 50 failures, and the cause is a real defect in the dev-served account path. The passing isolated reruns don't clear it. The block lifts when the fix below is in, Codex's probe outcome is reported, and there is a clean full-suite run.

## Observed evidence (from your prompt, not independently verified)
- The full browser run had 48 passed and 2 failed (desktop account creation). Both cases passed unchanged in isolation.
- The trace shows two cookieless `GET /api/auth/csrf` requests, both 200, with different auth `Set-Cookie` values.
- Then `POST /api/auth/register` returned 403, followed by a csrf 200 and a me 401.
- The trace zip is incomplete and some response bodies are unrecoverable.

## Source facts
- `playwright.config.ts:59` runs `npm run dev:web`, a Vite dev server. StrictMode's double effect run is therefore active in the browser suite.
- `main.tsx:14-18` wraps `AccountPage` in `StrictMode`.
- `AccountPage.tsx:80-101` has an effect that calls `Promise.all([client.csrf(), client.me()])`.
  - Under StrictMode the sequence is mount, cleanup, mount, all synchronously.
  - That fires two bootstrap rounds before any response arrives.
  - The first has `active=false`, and the second has `active=true` and is the only one allowed to `setCsrfToken`.
- `auth.ts:153-158,248-250` handles the csrf route.
  - `generateToken(req)` writes the token into `req.session`, which marks the session modified.
  - With `saveUninitialized: false` (`auth.ts:138`), a modified session is still saved, and `Set-Cookie` is emitted.
  - So each cookieless csrf GET mints its own new session id and token.
- `/api/auth/me` with no session returns 401 without modifying the session (`auth.ts:193-197`), so it sets no cookie. That matches the lone me 401 in the trace.
- `auth.ts:252-257` applies the checks in this order: `requireLoopbackHost`, `requireExactOrigin`, `csrfSynchronisedProtection`.

## Inference (not directly observed)
1. Two cookieless GETs produce sessions A and B with tokens tA and tB.
2. The browser cookie jar keeps the last `Set-Cookie` it processes, since the name and path are identical.
3. The component keeps the token from the active (second) effect, tB, chosen by effect identity.
4. The jar winner is chosen by the order responses arrive and `Set-Cookie` is processed.
5. If response A is processed after response B, the jar holds A and the page holds tB. The POST carries cookie A and token tB, so csrf-sync rejects it with 403.
6. `needsAuthoritativeCheck` then runs `csrf()` and `me()` with cookie A. That gives a consistent token, a me 401, and the "could not confirm" message, which matches the trace's recovery.

Step 1 is the part Playwright records. Steps 2 to 6 are inferred.

Your point that React stale-state guards can't suppress `Set-Cookie` from an ignored response is correct. `active` only gates `setState`, and the response header has already been applied by the browser.

The 403 comes from the CSRF layer, not from Origin or Host. Those checks are deterministic and would fail every run, not 2 of 50. That is still an inference, because the 403 body isn't recoverable.

## Evidence gaps for Codex
- **POST cookie check.** If the trace has a sanitized form of the POST's `Cookie` header, compare it with the two Set-Cookie values. A match with response A, the first-fired response, would confirm steps 2 to 5.
- **Whether response A was processed last.** The trace doesn't show it, and that is the inferred step.
- **Probe validity.**
  - The probe delays response 1 by 700 ms after `route.fetch()`, then fulfills it. That reproduces "older response's cookie lands last" under the current app.
  - It relies on Chromium applying `Set-Cookie` from `route.fulfill({response})`. A pass on the current app would be ambiguous. It could mean the race doesn't exist or that the probe doesn't model cookie delivery.
  - The probe lives in `.setup/`, outside `testDir: ./tests/e2e`, so it needs its own run invocation. That is Codex's area.

## Bounded correction (only if Codex's probe or the POST cookie check confirms)
This is a single-flight of the initial bootstrap, local to `AccountPage.tsx`. It doesn't remove StrictMode, add retries or sleeps, or touch the server.

- Add a `useRef<{ attempt: number; promise: Promise<[string, AccountUser | null]> } | null>`.
- In the effect, reuse `ref.current.promise` when `ref.current.attempt === attempt`. Otherwise create a new `Promise.all([client.csrf(), client.me()])` and store it.
- Refs persist across StrictMode's simulated remount, so both effect runs share one csrf GET. That means one session, one cookie and one token.
- The `active` guard and cleanup stay as they are.
- The Retry button increments `attempt` and gets a fresh request.
- Don't dedupe inside `accountClient.csrf()`. `readAuthoritativeAuth()` and the post-logout `csrf()` must stay fresh, because an in-flight shared result could pair a stale token with a changed session.

Left as is:
- **Multi-tab or concurrent cookieless loads.** They can still produce the same mismatch, but it fails closed with a 403 and the existing authoritative recovery.
- **CSRF, exact Origin and loopback Host checks.** Unchanged.

## Negative and regression tests
**Web (`AccountPage.test.tsx`, using the existing stub-client pattern):**
1. Under `<StrictMode>`, `csrf` and `me` are each called exactly once at mount. This fails today with two calls each.
2. Clicking Retry after a load error calls `csrf` again (count 2), so there is no stale cache.
3. After logout, the next `csrf()` is a new call and does not reuse the bootstrap promise.
4. A bootstrap that resolves after unmount makes no state update (existing guard behavior).

**E2E:** run Codex's delayed-response probe as a regression test. An added `csrfRequestCount === 1` assertion on initial load strengthens it and doesn't weaken anything.

**Server (confirm existing coverage first, add what's missing):**
- Register with the token from session A and the cookie from session B returns 403.
- Register with no cookie returns 403.
- A valid token with a wrong Origin returns 403.
- A non-loopback Host returns 403.
- A csrf GET with a disallowed Origin returns 403.
- An optional characterization test records that two cookieless csrf GETs yield distinct session ids. It documents current behavior and is not a fix assertion.

## Do not claim
- That the isolated rerun passes mean the suite is green.
- That the race is confirmed. It is source-consistent and trace-consistent, and confirmation belongs to Codex's probe and the POST cookie comparison.
