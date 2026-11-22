# Codex check of the revised Mira spec

Checked November 22, 2026. Scope: revised planning and repository verification only. No application tests, live avatar test, Claude review or owner implementation approval was performed by this check. The real .env contents were not read.

## Result

The revised spec addresses the earlier findings sufficiently to proceed with the bounded prototype once the attempt-identity and expiry clarification below is incorporated. This is an implementation-contract clarification within the existing one-mint-per-Start requirement; it does not require a new product feature or deferring the browser tests. Codex recommends keeping the Playwright suite in this story despite the document length.

## Verified corrections

- Bootstrap GET and token POST now have distinct rules. A normal same-origin GET without Origin is permitted with local Host protection; token POST retains strict Origin/CSRF rules. Unequal CSRF lengths have a controlled rejection.
- The spec recognizes the SDK's capacity retries and requires a single-use mint guard rather than relying on the absence of an application retry loop.
- All eight acceptance criteria are present. RED/GREEN/refactor is explicit, and Playwright is included in final verification. A separate real browser/provider smoke test cannot be reported passing without an observation.
- Project-root .env loading is explicitly independent of startup CWD. Real secrets remain excluded from model context and browser code; synthetic credentials are required for tests.
- Token/bootstrap responses have no-store requirements. Provider privacy/recording disclosure is separated from the application's choice not to persist recordings or transcripts.
- SDK-based microphone handling uses both device and reason. The exact SDK pin and Playwright choices are recorded.
- The creation date now matches the user's November 22 date context. The spec is still draft, awaiting the owner's actual checkpoint decision.

## Repository checks actually run

- git status --short produced no changes at the start of this check.
- Current branch is feature/v0-s1-mira-spike.
- git log shows the reported three baseline/toolchain/spec commits.
- git remote -v produced no remotes.
- The spec's full baseline revision resolves to an actual commit.
- git ls-files for .env, .env.example, .setup and _bmad/render listed only .env.example.
- git check-ignore confirms .env, .setup/check_nuance.py and _bmad/render/probe are excluded by the root ignore rules.
- A programmatic check of all 282 blob objects reachable from the current Git history found no literal candidates for the tested long nk_ or sk- credential patterns. No matching content, credential or local .env contents was displayed. This limited pattern check is not a guarantee that every possible secret format is absent.
- No package.json, application directory, lockfile or application test evidence exists in the inspected root. There is still no implemented prototype to test.

This new report is a Codex-created untracked document unless the owner/builder later stages it. The clean status above describes the repository before this report was added.

## Required implementation-contract clarification

The revised attempt-lifetime paragraph says the attempt is released on Stop, failed connect, timeout, token expiry or session end. It does not yet state how a delayed SDK callback for that old attempt is distinguished from a fresh user click after release. If release simply deletes the single-use flag, a retry can obtain another token. This would defeat the intended one-mint-per-explicit-Start policy.

Add these requirements before implementing the guard:

1. Each explicit user Start creates a new attempt identity, bound to its local browser session. The SDK token callback captures and reuses that same identity for every callback in that connection attempt; it must not generate a new identity inside the callback or on an automatic retry.
2. Once a successful token mint consumes an attempt, all later callbacks for that identity remain rejected before provider contact, including after Stop, connection failure, timeout, token expiry or session end. Releasing active-session resources does not make the old identity usable again. Expired/closed sessions must not resurrect old identities.
3. A fresh explicit Start uses a new identity and can proceed after the previous active lifecycle is safely closed. A stale Stop/end/error callback from the old identity must not clear a newer attempt's lock or alter its UI state.
4. Nuance's expires_at limits starting an unused session token; once a conversation has started, that timestamp does not end the connected conversation. Apply token-start expiry to a still-pending/unstarted attempt only, not as proof that an active conversation has finished. Keep the separate 60-second conversation setting and Stop/cleanup behavior.
5. Add deterministic fake-clock/provider tests: a delayed SDK token callback after expiry/Stop/failure receives no new mint; an old lifecycle callback cannot unlock a newer attempt; an active conversation is not considered ended merely because its original token-start deadline passes; a new explicit Start can mint once after safe closure. All ordinary repeated/concurrent-start tests remain required.

This clarification preserves the simple local prototype. It does not require implementing user accounts, production quotas, a public service or a broader avatar workflow.

## Document length

The guideline is not a release gate. Keep the safety and browser acceptance checks in this story. If needed, keep the short intent section and reference the detailed test matrix from the implementation plan, or use a fresh builder context; do not defer essential end-to-end evidence simply to reduce token count.

## Recommended owner response

Approve the bounded V0-S1 prototype with the clarification above included in its contract and tests, then let DeepSeek implement with mandatory TDD. DeepSeek remains the builder. Codex will independently test actual code, Claude must actually review it, and merging still requires a separate owner decision. No such implementation, review or merge is approved merely by this report.

## Sources checked

- Revised local spec: _bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md
- Source story: docs/stories/V0-S1-mira-connection-spike.md
- Nuance SDK lifecycle/retry documentation: https://docs.nuancelabs.ai/js-sdk
- Nuance session token expiry definition: https://docs.nuancelabs.ai/reference/api/server/create-a-session-token
