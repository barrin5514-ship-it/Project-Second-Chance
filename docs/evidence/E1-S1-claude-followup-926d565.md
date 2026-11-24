# Actual Claude follow-up — E1-S1 926d565

Date: 2026-11-24 (America/New_York). Reviewed HEAD `926d565fee8d900eb34e7085af2cdb9f2484a37f`, code correction `5786317`.
Reviewer: authenticated first-party Claude Code, requested `sonnet`, actual model `claude-sonnet-5-5`. Exit 0, success, no permission denials. Read-only Read/Glob/Grep, no shell/edit/MCP/providers; private-setting reads denied. Claude did not run tests or observe browser behavior.

Codex disposition: the original three groups pass all unchanged independent probes and the 236-test suite. HOWEVER the independent full browser run failed 2/50 tests, so this conditional review does not clear the merge gate. Both failed cases passed isolated reruns without changes, but a new delayed-real-response probe reproduces a CSRF-cookie bootstrap race. See Codex retest report and the supplemental actual Claude review. This report does not authorize merge or waive required browser failures.

Reviewer response preserved verbatim below.

---
# Claude follow-up review of E1-S1 corrections at HEAD 926d565 (code 5786317)

This is a **source review only**. I ran no tests, shell, or providers, and I read no `.env` or runtime DB. Every test count below is the builder's claim. I am not Codex and I am not the owner. I did not read `package.json` or the dependency sources. I also did not read the story and spec documents beyond targeted greps, so I can't confirm the spec "correction notes" the builder reports.

## Verdicts

| Group | Verdict |
| --- | --- |
| 1. Uniform registration | **Corrected** |
| 2. 10-second budget and recovery | **Corrected**, with one narrow edge noted below |
| 3. Reconciliation of expired, revoked and ambiguous outcomes | **Corrected** |
| Documentation accuracy | **Mostly accurate**, two small imprecisions |

I found **no P1 and no P2 that should gate merge**.

### 1. Uniform registration (`authService.ts:54-66`, `auth.ts:252-278`, `accountStore.ts:84-99`)
- **Same public outcome:** a valid new identifier and a valid duplicate both get `201 {ok:true}`. A duplicate is detected only through the `SQLITE_CONSTRAINT_UNIQUE` catch. It returns `'already-exists'`, which the route maps to the same 201.
- **No overwrite or extra account:** `accounts.create` is insert-only, so the existing hash is untouched and no second row is created. The route never calls `req.login`, so no session is created.
- **Validation order:** syntax and password policy are checked before the hash and insert, and they don't depend on whether the account exists. The Argon2 hash runs before the insert on both paths, so the work is comparable. I did not measure timing, and the story rightly forbids wall-clock assertions.
- **Failures:** a genuine insert error is rethrown and the route returns 503 before any 201. `AuthValidationError` returns 400.
- **Fictional-only domain:** `isValidEmail` (`authService.ts:30-38`) requires `endsWith('@example.test')` on the trimmed, lowercased value. The pattern forbids a second `@`, so `x@evil.example.test` fails. Login also gates on this, so the behavior matches the UI copy.
- **Registration window:** the default `registerWindowMs` is 1 hour (`auth.ts:107`). The test at `auth.routes.test.ts:580-615` asserts `Retry-After: 3600` under the default registration window. That matches ADR D6 and the threat model.
- **Tests:** they cover case-normalized duplicates, an unchanged hash and id, the original login still working, the different password being rejected, and a real domain returning 400. I did not see a test that forces a storage failure on a duplicate. The builder's 503 test at `:690` covers the generic store failure.
- **Boundary:** the direct status and body oracle is removed, and the ADR does not claim more than that. ADR D6 and the threat-model row say that registration followed by a login attempt can still reveal an existing identifier. They also say there is no email verification, and they explicitly disclaim complete non-enumeration. That wording keeps the triage position intact. It doesn't treat documentation as owner acceptance, and it doesn't invent a verification service.
- **Residual not named:** a probe also squats a free identifier. An attacker who registers `X` with their own password gets a working account if `X` was free, and a 401 on login if it wasn't. This is bounded by the 5-per-hour source limit and fits the disclosed residual. Adding one sentence would help.

### 2. 10-second budget and recovery (`accountClient.ts:38-88`)
- **Budget scope:** `request()` wraps both `fetch` and `readBody` inside `withBudget`. The timer fires `controller.abort()` and rejects the race with `AccountRequestError(0,'timeout')`. A fetch that ignores the abort signal is still bounded by the race.
- **Cleanup:** the timer is cleared in `finally`, and the controller is aborted. No unhandled rejection arises, because `Promise.race` attaches handlers to both promises.
- **No replay:** the client makes a single `fetch` call per operation. The test at `accountClient.test.ts:142` asserts one call.
- **Bootstrap recovery:** `Promise.all` rejects after the budget and the page reaches `loadError` with the Retry button. Both header-stall and body-stall are tested. The page-level bootstrap test uses the real client.
- **Action recovery:** `busy` is cleared in `finally`, guarded by the generation check. Sign-in timeout recovery is tested with the real client. Sign-in and sign-out stay mutually disabled through `busy !== null`.
- **Total wait:** a timed-out mutation can take up to about 20 seconds before the button recovers, because the reconciliation `/csrf` and `/me` calls get their own 10-second budget. The budget is per request, and the docs say so.

### 3. Reconciliation (`AccountPage.tsx:42-47, 68-78, 136-155, 182-202, 236-263`)
- **Reconcile triggers:** register and sign-in reconcile on status 0, 403 and 5xx. Logout reconciles on any error.
- **401 handling:** `/me` returning 401 clears the user, stores the refreshed token, and shows "Your session ended. Sign in again." A 401 from login is invalid credentials, so not reconciling it is correct. The server's logout route has no 401 path.
- **Valid identity preserved:** `/me` 200 keeps the identity and refreshes CSRF. If the reconciliation itself fails, the prior identity is kept, with an honest uncertainty message. A blanket "403 means signed out" is avoided. Both tests (`AccountPage.test.tsx:392`, `:422`) match the triage's two cases.
- **Generation guards:** `requestId` is checked after every await, including after reconciliation, and it is bumped in effect cleanup. The test at `:300` covers a stale bootstrap after a client change.
- **Logout honesty:** success clears the identity, and a failed follow-up `csrf()` says "Signed out, but…". Timeout or destroy failure never claims success, and a confirmed 401 reports session ended.

## P3 / non-gating items

1. **A truncated 200 login body skips reconciliation** (`accountClient.ts:59-70`, `AccountPage.tsx:42-47`).
   - **Trigger:** `readBody` swallows any non-abort body error and returns `{}`. A 200 login whose body is cut off or unparseable then becomes `AccountRequestError(200,'invalid-login-response')`, which is not in `needsAuthoritativeCheck`.
   - **Impact:** the page shows signed-out with "could not be completed" while the cookie may hold a live, rotated session. The next attempt self-heals through 403 and reconcile, and a reload also works. There is no security impact.
   - **Fix:** treat a body-read failure, or 2xx invalid-response codes, as reconcile-worthy.
2. **No page test for register uncertainty.** The correction evidence says a timed-out registration reports uncertainty rather than creation. The code does (`:136-155`), but no page test exercises register timeout, 403 or 503. The "Account request accepted" neutral copy at `:132` is also only indirectly covered.
3. **Parallel `csrf()` and `me()` in `readAuthoritativeAuth`.** In the absolute-expiry case with a live row, `/me` destroys and clears the cookie while `/csrf` returns the old session's token. If the responses land in the wrong order, the first sign-in can get 403, and a second try then succeeds. Running them sequentially, `me` then `csrf`, would remove the wart.
4. **Doc imprecision.** ADR D8 (line 76) and threat-model row 33 say "401/403/ambiguous" reconcile. The code reconciles 0, 403 and 5xx on register and sign-in, and everything on logout. Story A1 still says "duplicate… generic failures", while duplicates are now success-shaped. I did not confirm whether the spec was updated.
5. **Pre-existing non-example.test accounts** in an existing local DB can no longer sign in, because `authenticate` also gates on the domain. That is a local-prototype effect only.
6. **Untested stale-guard path.** The generation guard after `readAuthoritativeAuth` inside an action isn't directly tested, only the client-change re-bootstrap.
7. The earlier P3s (expiry guard not exported, corrupt-row recovery, Argon2 error masking, process-level health independence) are unchanged and remain notes. They are not new gates.

## What I could not assess
- Anything that needs execution. The probe SHA256s, the 236/8/50 counts and the RED/GREEN claims stay builder-reported until Codex reruns them.
- Real-browser cookie ordering and proxy behavior.
- Timing equivalence of the new and duplicate paths.

## Readiness
**Conditionally ready for owner merge consideration, provided Codex's reruns confirm the claimed results.** Specifically:
- The unchanged 8-probe config passes.
- The full suite and the browser suite pass.
- The typecheck, build, and secrets checks pass.

Items 1 to 3 above are cheap hardening, and I'd take them before E1-S2, but I wouldn't hold the merge on them. Merge approval is the owner's. I did not approve a merge, deployment or live provider session, and none occurred.

I wrote nothing to disk, including the plan file. Plan mode was active and ExitPlanMode wasn't available to me, but this deliverable was a read-only review.
