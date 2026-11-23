# Actual Claude follow-up — E0-S1 6bde94e

Date: 2026-11-23 (America/New_York).
Reviewed commit: `6bde94ee57ebb4a39a758cef4d1a11f40fce0ebc` on `feature/e0-s1-foundation`.
Reviewer: installed authenticated first-party Claude Code, requested `sonnet`, reported model `claude-sonnet-5-5`.
Execution: exit 0, result `success`, `is_error: false`, no permission denials. Read-only Read/Glob/Grep tools, no shell/edit tools or MCP servers, hooks disabled and secret-file reads denied. No tests or live conversations run by Claude.

Codex disposition: Both P2 corrections also passed all unchanged independent probes. The pending build, browser and safety checks mentioned by Claude have now passed; see [Codex retest](E0-S1-codex-retest-6bde94e.md). The remaining P3 observations are nonblocking limitations, not claims that future security controls are complete. Source inspection confirms error responses explicitly set no-store; maintained tests do not assert that header. Other parser-error status classification and 500-branch/browser-stall coverage remain possible follow-up work. No application change was made by Codex. Owner merge approval remains separate and pending.

The reviewer response below is preserved verbatim, including its source-review-only limitations.

---
# E0-S1 follow-up review at `6bde94e` (source review only)

I read the source and tests. I ran no commands or tests, and I did not read `.env`. The 167/167 maintained tests and the 11 unchanged probes passing are Codex's observations and builder claims. I have not verified them.

## Verdicts

**P2 #1, stalled health fetch or body leaving the page on "Checking": resolved in source.**
- **Timeout covers headers and body.** `apps/web/src/api/health.ts:27-32` arms one 8 s `AbortController`. The signal goes to `fetch` (line 40). The timer stays armed through `await response.json()` (line 49) and is cleared only in `finally` (line 66). A real fetch abort also rejects a body read still in progress.
- **Timeouts are reported as such.** The `timedOut` flag maps both the header stall and the body stall to a generic `health request timed out` (lines 51-53, 63). No underlying exception text escapes.
- **Honest retry.** `FoundationLanding.tsx:32-39` moves to `unavailable` on any rejection, and Retry renders for that state (line 60).
- **No false "ready".** Only a resolved call reaches `ready`, and `isHealthResponse` still enforces the exact contract.
- **No stale overwrite.** The `active` guard (lines 30-42) stops an old request from overwriting a newer one. Retry exists only after the previous request has settled, so retries cannot overlap.
- **Tests exercise the production client.**
  - `health.test.ts:52-96` covers a pending fetch and a stalled body.
  - `FoundationLanding.test.tsx:114-139` runs the real `fetchHealth` through the component, with no injected loader and a fake-timer pending fetch, and asserts the unavailable state and an enabled Retry.

**P2 #2, malformed or oversized JSON returning an HTML stack trace: resolved in source.**
- **Ordering and signature.** `apps/server/src/app.ts:214` is a four-argument error handler registered last, after the 404 handler (lines 205-208). Body-parser errors skip the ordinary middleware and reach it.
- **Statuses and bodies.** 413 returns `{error:'payload-too-large'}`, 400 returns `{error:'bad-request'}`, and anything else returns 500 `{error:'internal'}` (lines 224-232).
- **No disclosure.** Responses are JSON with `no-store`. They carry no message, stack, path or request body, and the handler logs nothing.
- **No config or provider access.** The handler touches only the error object. It delegates with `next(error)` if headers were already sent (line 215).
- **Tests.** `health.routes.test.ts:66-106` covers a malformed GET to `/api/health` and an oversized POST, using the real app. It asserts status and exact JSON, and that the response text holds no `SyntaxError`, `node_modules`, cwd or canary text. It also asserts that `readApiKey` is never called and the provider call count is 0.

## New actionable regressions

None. I found no P0, P1 or P2 problems, and nothing introduced by these corrections.

The Mira routes are unchanged apart from the shared error boundary. Mira clients send well-formed JSON, so only parser-failure responses changed, from HTML to generic JSON. I did not read the Mira suites in full.

## Nonblocking limitations

- **P3, status mapping:** other body-parser failures, such as 415 for an unsupported charset or content encoding, fall through to 500 `internal` (`app.ts:232`). They are still safe and generic, but the status is less accurate. The 500 branch has no test.
- **P3, missing assertions:** the server tests do not assert `Cache-Control: no-store` on the error responses, though the source sets it (`app.ts:219`).
- **P3, no browser-level stall test:** there is no Playwright case for a request that never fulfils. Fake-timer unit tests cover it, but real-browser abort behaviour is not exercised.
- **P3, deferred by agreement:** focus is lost after Retry because the button unmounts (`FoundationLanding.tsx:60`). The health request is not aborted on unmount, though the `active` guard prevents harm. The e2e test focuses Retry programmatically (`foundation.spec.ts:73`).
- **P3, evidence docs:** README, ADR and threat-model wording should be checked against the new state. I did not review them in this pass.
- **Not covered by this review:** screen-reader or visual checks, a full security review, and live provider behaviour.

## Readiness

**There are no blocking findings.** Both P2 defects are resolved in source, and the tests are of the right kind: real client, real app, fake timers, no loosened assertions.

On source review alone, the bounded fictional-data local foundation is ready for owner merge consideration. That holds only if Codex's reported results hold up under your own review of their evidence, and the pending build, browser and safety checks pass. This is not merge approval. No merge, push, deployment or live session was performed or authorized.
