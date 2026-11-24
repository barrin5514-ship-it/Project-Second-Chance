# Actual Claude startup-race follow-up — E1-S1 62c2b82

Date: 2026-11-24 (America/New_York). Reviewed HEAD `62c2b8222deefe7e9581b6273a6e09ddf3f0ba4e`; correction `a3feb85`.
Actual reviewer: authenticated first-party Claude Code, requested sonnet, reported `claude-sonnet-5-5`. Exit 0, success, no permission denials. Read-only Read/Glob/Grep; shell/edit/MCP/providers disabled and private-file reads denied. No tests/browser or live session run by Claude.

Codex disposition: no new blocking findings. The source-review conditions below have now passed independently: unchanged delayed-cookie probe 1/1 with matched cookie/token and 201, full browser 50/50 with no retries, original auth/foundation/SDK/Mira probes 8+6+3+2, maintained suite 241, type/build/secret checks and production audit. See `E1-S1-codex-retest-62c2b82.md`. The deferred P3 and local-only limits remain recorded, not waived or certified. Owner merge approval is pending; no merge, push, deployment or paid/live provider action occurred.

Reviewer response preserved verbatim below.

---
# E1-S1 bootstrap-race follow-up at HEAD 62c2b82

This is a source inspection only. I ran no tests, probes or browser, and I can't confirm any pass counts. I read the AGENTS.md rules, both triage and review documents, `AccountPage.tsx`, `AccountPage.test.tsx`, `main.tsx`, `accountClient.ts` and the route and guard lines in `apps/server/src/auth/auth.ts`. I did not read the `.setup` probe files, so I haven't checked their hashes.

## 1. Is the bootstrap race resolved in source?

**Yes.** The fix is in `AccountPage.tsx:67-119`.

- **Cause:** `main.tsx:14-18` wraps `AccountPage` in `StrictMode`. The old effect therefore fired two cookieless `csrf()` calls. The server mints a session and `Set-Cookie` for each, because `saveUninitialized: false` still saves a session that `generateToken` has modified (`auth.ts:140`).
- **Fix:** `bootstrapRef` holds `{client, attempt, promise}`. The StrictMode replay finds an entry with the same client and attempt, reuses its promise, and issues no second request. One session, one cookie and one token are bound together.
- **Stale guards:** each effect run attaches its own `.then` handlers, and each is gated by its own `active` flag. Cleanup sets `active = false` and bumps `requestId`.
- **No unhandled rejection:** both runs attach a rejection handler to the shared promise.
- **Server unchanged:** the guard chain is still `requireLoopbackHost`, `requireExactOrigin`, `csrfSynchronisedProtection` (`auth.ts:254-256`). I found nothing weakened.
- **Not added:** no sleeps, no replay and no timeout change. `StrictMode` is still in place.

## 2. Are client/attempt scoping and identity transitions still correct?

**Yes.**

- **Cache key:** the entry is reused only when `entry.client === client && entry.attempt === attempt`.
  - Retry increments `attempt`, so it creates fresh work.
  - A changed client creates fresh work.
  - A rejected promise is not reused after Retry.
- **Client change:** the old client's late result is dropped by its `active` flag. This is the existing regression at test line 410.
- **Identity transitions:** the effect depends only on `[client, attempt]`, so login, logout and reconciliation never re-enter it.
  - Login takes its token from `result.csrfToken`.
  - Logout calls `client.csrf()` directly (`AccountPage.tsx:244`).
  - `readAuthoritativeAuth` calls `csrf()` and `me()` directly (`AccountPage.tsx:78`).
  - Nothing outside the effect reads `bootstrapRef`, so it is not a global token cache.
- **Original three behaviors:** the 10-second budgets in `accountClient.ts` and the reconciliation paths are untouched.

## 3. New P1/P2 regressions

**None found.**

## 4. Nonblocking residual limitations

These are separate from the documented ones you listed, which I agree stay out of scope.

1. **Dev-only Fast Refresh/HMR.** Refs and state persist, and effects re-run with the same client and attempt. The effect would then re-apply the old bootstrap's token and user, overwriting a later login state. This is development-only and doesn't touch production or the e2e suite. I wouldn't expand this correction for it.
2. **Unmount test is weak.** The "does not update an unmounted page" test (`AccountPage.test.tsx:143-163`) asserts `toBeEmptyDOMElement()`, which holds after any unmount. The behavior is protected by the `active` guard in the source, not by that assertion. The weakness is cosmetic, not a regression.
3. **No-StrictMode test coverage.** The post-logout fresh-token test (`AccountPage.test.tsx:69-89`) renders without `StrictMode`. That doesn't matter, because the logic doesn't depend on it.
4. **Same-component scope.** I confirmed the documented multi-tab and independent-load limitation. It fails closed with a 403 followed by reconciliation.
5. **Evidence wording.** The correction report says the 21-test GREEN covers the client-change guard. That test is pre-existing, not new. This is only a wording matter.

## 5. Readiness for owner merge consideration

**Conditionally ready.** From source inspection I have no blocking finding, and the accepted fix is bounded and correct. This is not an approval, and I'm not claiming any execution results. Merge consideration depends on Codex's fresh results being clean for:

- the delayed real-cookie probe, which should show 1 initial response, matching token and cookie, and status 201;
- the full browser suite, with no flakes;
- the original 8 auth probes and the 11 foundation/Mira probes;
- the maintained tests, typecheck, build, secrets and audit checks.

If any of those fail, the gate re-blocks. The owner's separate merge approval is still required, and I've authorized nothing.
