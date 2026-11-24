# E1-S1 independent Codex testing — 13d5886

Date: 2026-11-24 (America/New_York). Reviewed commit: `13d58861acf52b4381c6cec92948ec4341764bed`, branch `feature/e1-s1-authentication`. Verdict: **CHANGES REQUIRED** before merge. Codex changed no application code or maintained tests.

The maintained suite and browser suite pass, but additional independent probes reproduce three bounded defects (four failing assertions). This is not evidence of cross-account access or an authentication bypass; logout replay, expiry enforcement, spoofed-forwarded-header throttling and delayed-read/logout concurrency pass the independent server checks. Actual Claude review is preserved separately and must be read with the triage disposition.

## F1 — P2: registration response exposes whether an identifier exists

Locations: `apps/server/src/auth/auth.ts:261–267`, `authService.ts:48–56`; story A1.

Using the real app, real SQLite account store and actual Argon2id library, submit a valid fictional identifier/password twice with valid CSRF and Origin. The first response is 201 `{ok:true}` and the duplicate is 400 `{error:'invalid-request'}`. An attacker who supplies valid-format input can distinguish account existence from the public status/body. Comparing duplicate with malformed input does not test that disclosure channel.

Independent probe `valid duplicate registration has the same public outcome as valid new registration` fails on precisely that difference. The implementation spec's phrase “no existence oracle beyond required create failure” narrows A1; it is not evidence the owner accepted the exception. [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) discusses registration discrepancy factors and status-code disclosure as well as generic messages.

Prefer uniform outward outcomes for valid new/duplicate submissions with neutral UX, without overwriting an existing account or claiming an email was sent. Invalid syntax/policy and genuine storage failures still need honest handling. Document the remaining composed registration/login discovery limits of a no-verification fictional demo; do not claim complete non-enumeration. Keeping the distinct public response as an accepted exception requires an explicit owner decision, not only a builder-authored ADR or review suggestion. Do not add email services, paid access or new authentication scope to solve this.

## F2 — P2: stalled account requests have no recovery deadline

Locations: `apps/web/src/account/accountClient.ts` fetch/body helpers; `AccountPage.tsx:58–79` bootstrap and action handlers.

The real account client has no abort budget around fetch or body parsing. With synthetic fetches that honor AbortSignal, a bootstrap that never returns remains “Loading account…” after 60 simulated seconds with no retry button; a pending sign-in leaves all actions disabled indefinitely. These are two separate failed independent page probes exercising the real client, not a replacement injected loader. Sixty seconds is an observation ceiling, not a prescribed production timeout.

Add a bounded request budget that covers headers **and body** with cleanup and generic errors. Preserve stale-response/unmount guards. A timeout during a mutation does not prove the server rejected or rolled it back: do not automatically replay account creation/login/logout or falsely claim success/sign-out; reconcile uncertain session state where needed. Add maintained RED-to-GREEN tests for fetch stall, body stall and actionable page recovery.

## F3 — P2: expired-session logout leaves the old identity displayed

Locations: `apps/web/src/account/AccountPage.tsx:146–177`; story A7.

A real-server probe expires an authenticated SQLite session row, then verifies old-token logout returns 403 and `/me` returns 401. This is the correct server-side refusal. A separate UI probe with the real account client and matching synthetic responses shows that a 403 logout only sets an error; it never refreshes current account/CSRF and continues displaying “You are signed in” with the previous email. No cross-account content was retrieved, but the asserted session state is stale and recovery is broken.

On relevant auth failures, reconcile authoritative account state and prepare a fresh token. A 403 can also mean CSRF/request failure while identity is still valid: do not blindly treat every 403 or network failure as proof of logout. Clear a stale identity when `/me` establishes no authenticated user, and offer a usable sign-in/retry state. Preserve honest failure on a genuine logout-store failure. Add an expired-session UI regression and protect against stale responses during re-bootstrap.

## Commands actually executed

| Check | Observed result |
| --- | --- |
| `npm test` | Exit 0; 224 passed, 23 files |
| `npm run test:e2e` | Exit 0; 50 passed, desktop + narrow Chromium |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; existing 664.09 kB SDK chunk warning only |
| `npm run verify:secrets` | Exit 0 |
| `npm run test:secrets` | Exit 0; 7 passed |
| `npm audit --omit=dev --json` | Exit 0; 0 reported production vulnerabilities |
| unchanged foundation probe config | Exit 0; 6 passed |
| unchanged real-SDK contract probe config | Exit 0; 3 passed |
| unchanged Mira media/restart probe config | Exit 0; 2 passed |
| `npx vitest run --config .setup/vitest.codex-auth.config.ts` | Exit 1; final 8 independent tests: 4 failed, 4 passed (F1 one; F2 two; F3 one). Initial six-test run also failed the same four assertions; two additional security-boundary probes were then added and passed |
| `git diff --check` | Exit 0 |

The four passing new server probes check captured-cookie replay/forged identity selector, expired-session logout/current-account refusal, production per-source throttling across 21 changing nonexistent identifiers with spoofed X-Forwarded-For values, and a real delayed rolling read interleaved with logout. The read completes with the identity it legitimately checked before logout, but its delayed touch does not resurrect the deleted session: cookie replay is 401 afterward. These supplement, rather than replace, maintained two-user isolation, CSRF, fixation, expiry and fault tests. The rate-limit library emits its expected trust-proxy validation warning to test stderr when spoofed headers are injected; no HTTP response disclosed credentials or stack text. E2E uses absent provider credentials and relaxed auth limits, not production-throttle evidence. No `npm ci` or dry-run install was rerun; no dependency changes by Codex.

New probes live in ignored `.setup/codex-auth-independent.test.tsx` with `.setup/vitest.codex-auth.config.ts`. They use in-memory SQLite, generated synthetic account details and controlled fetches, never actual private settings. One passing test title was clarified after execution to accurately describe its forged-selector assertion; no expectation/behavior changed. Preserve these probes for correction re-verification.

## Limits and handoff

Read the actual Claude report and triage before applying feedback; do not weaken A1 merely because a reviewer suggests documenting the direct oracle. The local HTTP cookie exception, old Passport-local release, in-repo SQLite adapter and lack of future resource encryption are review limitations, not automatically newly discovered vulnerabilities. The store's touch path is UPDATE-only; no reachable stale-write resurrection was established in the current endpoints. Future session-mutating routes need concurrency protection/tests.

Historical builder RED observations were not independently witnessed or recreated. Disclosed after-implementation client/E2E checks remain honest regression evidence, not TDD history. The VS Code Problems panel, real-user security, qualified legal review and hosted behavior were not assessed. Before E1-S2 builds on this, resolve the tested defects and preserve the future authorization/crypto gates.

Only owner-local `.vscode/` was untracked before this review; HEAD remained unchanged. No merge, push, deployment, paid action, real records or live Nuance session was performed. Builder should make scoped corrections with observed behavior tests, supply evidence and stop for fresh Codex verification and actual Claude follow-up. Owner merge approval remains pending.
