# E1-S1 independent Codex final retest — 62c2b82

Date: 2026-11-24 (America/New_York). Reviewed HEAD `62c2b8222deefe7e9581b6273a6e09ddf3f0ba4e`; startup correction `a3feb85`; branch `feature/e1-s1-authentication`.

## Verdict

**No blocking findings remain in the tested local fictional-demo scope.** The previously reproduced startup cookie/token race is resolved by the component-scoped single-flight initialization. The original three authentication corrections remain green. Actual Claude follow-up also found the fix correct in source with no new P1/P2; its fresh-execution conditions are satisfied by the results below. Owner merge approval is still separate and pending.

## Reproduced fault now passes unchanged

`npx playwright test --config .setup/playwright.codex-auth-race.config.ts` exited 0, 1 passed. Its metadata was `{initialResponses:1, tokenFromResponse:1, cookieFromResponse:1, status:201}`, replacing the prior independently observed two-response/token2-cookie1/403 failure. The probe delays a real server response rather than inventing tokens/sessions. No raw cookie/token value was printed.

Source diff inspection confirms the application change is confined to AccountPage initial-bootstrap caching keyed by client and attempt. StrictMode, state-generation cleanup, 10-second budgets, identity-transition token refresh and server-side request protections are preserved. Retry and client-change behavior are covered by the maintained regressions. Post-login/logout and authoritative reconciliation do not read the initial-bootstrap ref.

## Fresh checks actually executed

| Check | Observed result |
| --- | --- |
| unchanged delayed-cookie browser probe | Exit 0; 1 passed, matched token/cookie, registration 201 |
| `npm run test:e2e` | Exit 0; all 50 passed in one full run, no retries or assertion changes; includes previously failing desktop lifecycle/replay cases and both viewports |
| `npm test` | Exit 0; 241 passed, 23 files; includes 21 account-page tests |
| original auth probe config | Exit 0; 8 passed |
| foundation probe config | Exit 0; 6 passed |
| real SDK-contract probe config | Exit 0; 3 passed |
| Mira media/restart probe config | Exit 0; 2 passed |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; 159.23 kB main, existing 664.09 kB SDK warning only |
| `npm run verify:secrets` | Exit 0 |
| `npm run test:secrets` | Exit 0; 7 passed |
| `npm audit --omit=dev --json` | Exit 0; 0 reported production vulnerabilities |
| `git diff --check` | Exit 0 |

The 19 original independent unit/integration probes plus the browser race probe are separate from the maintained 241 and standard 50-browser-test suites. Browser tests deliberately use absent provider credentials and relaxed auth limits; production-limit evidence comes from the real-app API probes. The expected trust-proxy warning for injected forwarded headers remains test stderr, not a failed security assertion. No new live Mira test occurred.

## Probe integrity

SHA-256 independently recomputed and matched the correction record:

- `.setup/codex-auth-cookie-race.spec.ts`: `AF429978150EBDABAFC87AC02AF03564BE552D0EE7C386DA12993BD81E49921B`
- `.setup/playwright.codex-auth-race.config.ts`: `C2DCE4E230242DD6885286E22464699BA8FF6223C5D5694D2A9AD8705A572EAE`
- `.setup/codex-auth-independent.test.tsx`: `E27A1A3619683E78D441020D59D86DDF5D942E3D9F3380ED997D271C77970B44`
- `.setup/vitest.codex-auth.config.ts`: `700FC50C94B42261BF3ECBC4019BB7ECF248EFFBD4860B188B7ECAA8ACDFCCAE`

Codex changed no application source, maintained test, original probe or configuration. Only this independent report and the actual review record were added. Initial tracked working tree was clean; only owner-local `.vscode/` was untracked. No new dependency install or TDD-history reconstruction was performed.

## Limitations and final gates

[Actual Claude follow-up](E1-S1-claude-followup-62c2b82.md) records nonblocking notes separately, including development Fast Refresh potentially reapplying a cached bootstrap, limits of the unmount assertion, and component-only coordination. Separate tabs/independent page loads can still fail closed and reconcile; no cross-tab guarantee is claimed. Previously documented parallel me/CSRF expiry ordering, malformed-successful-response recovery and other P3 observations remain deferred. These are not evidence of hosted/private-data security.

Local HTTP/Secure-cookie exception, per-process throttling, composed registration/login disclosure, older Passport-local pin, private-resource authorization/encryption, recovery/email verification/MFA and hosted controls remain explicit future gates. Authentication approval does not activate private cases/uploads or real records. No security/legal certification is claimed.

No merge, push, deployment, paid access, real-case query or live provider session occurred. Private settings and runtime DB values were not read into assistant context. The bounded E1-S1 slice is ready for owner merge consideration, with residual nonblocking notes available for that decision.
