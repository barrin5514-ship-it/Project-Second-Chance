# E1-S1 follow-up disposition — 926d565

Date: 2026-11-24 (America/New_York). Current HEAD `926d565fee8d900eb34e7085af2cdb9f2484a37f`, branch `feature/e1-s1-authentication`.

**The original three fixes pass. One additional reproduced bootstrap race blocks merge.** Do not redo registration privacy, request budgets or session reconciliation, and do not widen this pass into cases/uploads.

Evidence: [Codex retest](E1-S1-codex-retest-926d565.md), [actual Claude follow-up](E1-S1-claude-followup-926d565.md), [actual supplemental Claude review](E1-S1-claude-cookie-race-review-926d565.md). The initial Claude verdict was conditional on a clean browser suite; that condition was not met. The supplemental review explicitly supports keeping the local-demo gate blocked. Codex subsequently confirmed its inferred mechanism with token/cookie response-origin comparison.

## Bounded DeepSeek correction

The startup effect in AccountPage creates overlapping cookieless CSRF requests under the existing StrictMode dev path. The older response can replace the browser cookie after the active effect chose another token. The server correctly rejects the mismatch. React state-generation guards alone cannot suppress response cookie effects.

Make initial account bootstrap single-flight or otherwise serialize initialization so the selected token is bound to the browser's actual session. Preserve StrictMode, expiry and logout behavior, the 10-second budgets, stale-response protection, and exact Origin/Host/CSRF guards. Do not remove StrictMode, add automatic mutation replay, add sleeps, retry-until-green, lengthen assertions to hide this race, or weaken the server's checks.

A component-scoped initial-bootstrap promise keyed to the relevant client/attempt is one proposed correction. Both StrictMode effect runs may share it while active guards still suppress stale state. Ensure changing clients or pressing Retry creates the appropriate fresh work; an old bootstrap result must not be reused after login/logout or session reconciliation. The supplemental review's exact useRef sketch is a suggestion, not approved code: account for the existing client-change regression too. Avoid a global token cache that survives identity transitions. Keep multi-tab/cookieless concurrent-load limitations explicit if the selected correction only covers the same component instance.

## Required tests and re-verification

1. Reproduce the failure before changing behavior: `npx playwright test --config .setup/playwright.codex-auth-race.config.ts`. It currently reports token from response 2, cookie from response 1 and register 403 instead of 201. Preserve this independent probe/config. All values are synthetic; no token/cookie is printed.
2. Add maintained behavior tests for StrictMode initialization, rejected-bootstrap Retry, fresh token after logout/identity transition, client-change/unmount stale guards and late-cookie delivery. Observe genuine RED then GREEN. Do not assume simply ignoring stale state stops browser cookie writes.
3. Keep server negative paths for token from the wrong session, missing token/cookie, foreign/missing mutation Origin and foreign Host. Fixing initialization must not turn those into accepted requests.
4. Run the original unchanged 8 auth probes and preserved 11 foundation/Mira probes, full maintained suite, **full browser suite**, type/build/secrets/audit. The two isolated reruns passed without changes, but they do not supersede the 48/50 full run or this reproducible fault.
5. Record exact command/count/exit results, update correction evidence/ADR as needed, preserve all review files and stop for fresh Codex verification and actual Claude follow-up. No merge, push, deployment, paid access, private records or live provider session.

Other Claude P3 notes remain nonblocking: malformed successful-response reconciliation, register-uncertainty page coverage, parallel me/CSRF absolute-expiry recovery and previously deferred private-resource/hosted controls. Do not reopen those as new broad hard gates in this correction. Preserve honestly documented composed registration/login disclosure and future authorization requirements.
