# Codex check of the Mira prototype planning checkpoint

Checked November 22, 2026, in the user's America/New_York date context. Scope: read-only inspection of DeepSeek's saved planning work and source comparison. This is not application testing, a Claude review, owner approval or a production security assessment. The real .env was not read.

## Observed project status

- Correct workspace: ProjectSecondChance under the current Next Chapter Project workspace.
- Saved spec: `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`.
- Spec status is draft, with three unresolved choices and baseline_commit NO_VCS.
- Git independently reports that this folder is not a repository.
- No root package.json, apps directory, application tests, lockfile or V0-S1 builder evidence report exists in the inspected project.
- DeepSeek completed planning and stopped at the human checkpoint. It is not currently implementing the prototype.
- The saved spec broadly preserves the bounded Mira goal, fixed server-side persona/purpose, secret handling, camera-off configuration, local-only scope, failure states and independent testing/review boundaries.
- The write preflight and external investigation are reported by DeepSeek; their historical execution was not independently reproduced in this planning check. A folder outside the named OneDrive path does not prove immunity to locks, disk errors or all synchronization effects; R25 remains open for runtime writes.
- The Claude CLI executable is available locally, but authentication and a functioning review invocation have not been checked. No Claude review is claimed.

## Recommended answers to the checkpoint questions

These are Codex recommendations, not owner approvals.

1. Playwright A: use real Chromium browser tests alongside focused unit/integration tests. The story already calls for browser, keyboard, narrow-layout and lifecycle evidence; jsdom alone does not satisfy those checks. A synthetic browser test still does not prove a live Nuance conversation or actual user microphone behavior. Record the separate live smoke-test result or its unrun status.
2. SDK pin A: pin exactly 0.40.0, after confirming that precise package remains available, and commit the lockfile. Upgrade deliberately. A caret below 1.0 at 0.40.0 admits later patches in the same minor line, not a future minor version; either syntax can be reproducible with a preserved lockfile, but exact pinning best matches this spike's version-control requirement.
3. Microphone handling A: use the SDK's structured MediaAccessError rather than a second getUserMedia prompt. Distinguish device=microphone AND reason=permission-denied from device-not-found and device-in-use. Unit-test the classification and use appropriate browser/actual-user checks for permission and cleanup. SDK-derived errors are testable through the connection boundary without a second permission probe.
4. Git: recommend authorizing initialization in this exact folder and a feature/v0-s1-mira-spike branch. Before any commit, verify .env, .setup, runtime data and keys are ignored, inspect staged filenames, and preserve unrelated work. Use explicit scoped staging rather than indiscriminate staging. No remote, push, merge, global trust change or owner approval is implied by this recommendation.

## Required spec refinements before approving implementation

### 1 Make bootstrap request protection work in a real browser

The matrix says a missing Origin is rejected and that a bootstrap GET checks the origin, but it does not distinguish those routes. Ordinary same-origin GET/HEAD requests generally omit Origin; rejecting every missing-Origin request would break bootstrap and prevent the call from starting.

Define route-specific rules. The bootstrap must accept the intended normal same-origin browser GET while enforcing the local Host/target and applicable request protections, rejecting foreign origins when supplied and avoiding permissive CORS. The state-changing token POST must keep strict expected-Origin and CSRF/session checks. Include an actual browser bootstrap-to-token test, plus foreign and missing-Origin POST rejection tests. Test malformed/unequal-length CSRF values return a controlled rejection rather than throwing from timingSafeEqual. Do not remove CSRF or strict POST checks to make the GET succeed.

Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin

### 2 Bound SDK retries as well as visible Start clicks

The story and spec prohibit automatic retries and repeated credit-spending conversations. Nuance's SDK documentation explicitly says it retries busy/short-capacity starts itself, can request fresh tokens, and those tries count toward conversation limits. Merely omitting an application retry loop does not enforce the stated policy.

Document and test how one explicit Start is bounded at the provider boundary. Prefer a verified SDK setting if supported; otherwise enforce a fail-closed one-successful-mint-per-explicit-attempt contract in the wrapper/server and prove that repeated SDK token callbacks cannot mint additional tokens automatically. Define attempt/session guard expiry and release on token expiry, failed connect, Stop, timeout and ended session. Concurrent POST protection alone does not establish the lifetime of a live/starting SDK session. Do not claim a control is supported without checking the pinned SDK.

Set the documented maxSessionSeconds to 60 in addition to the visible one-minute Stop timer, keep stayConnectedOnEnd false, and verify Stop/end/unmount cleanup. Record what is server-enforced versus client-controlled and any remaining spending limitation. Never claim the browser timer alone is a guaranteed budget cap.

Source: https://docs.nuancelabs.ai/js-sdk

### 3 Preserve all story acceptance and test-first evidence

The source story has eight acceptance criteria; the spec currently lists seven and omits the final criterion about RED/GREEN/refactor, synthetic credentials, dependency evidence and a separate actual browser smoke test. Its execution checklist also lists application modules before tests. Global TDD instructions are present, but the implementation plan should make the required order unambiguous.

Restore the evidence acceptance criterion. For each behavior, record the intended assertion failing before behavior implementation, minimal GREEN, and refactor/regression results. Add explicit browser commands to final verification alongside npm test, typecheck and build. Include the no-Start/no-media state, permission-denied versus other microphone errors, camera-off configuration, provider failure, repeated/queued start handling, Stop/end/unmount, navigation during an in-flight connect, late events after cancellation, timer expiry, and keyboard/narrow-layout checks. A simulated browser test is not a recorded successful live conversation.

### 4 Define secret loading and provider disclosures precisely

Make server configuration load the ignored project-root .env programmatically regardless of whether npm starts from the root or apps/server. Test path/config injection with synthetic fixtures; neither model should inspect the real .env contents. The public client must receive no secret or raw provider error response. Use no-store response handling for short-lived tokens and bootstrap/session material where appropriate.

The source story requires provider processing/recording disclosures. Confirm and link the actual privacy/recording terms, in addition to developer terms/AUP, rather than claiming that audio is unrecorded because this app does not save transcripts. App persistence and provider retention are different facts. Retain explicit Start/microphone permission and visible AI/no-legal-advice labeling.

### 5 Correct minor planning metadata

The spec records November 23 even though the user's current local date for this checkpoint is November 22. Check and correct the creation/research date context rather than silently using a different host timezone. Keep status draft until the choices and substantive refinements are resolved and the owner actually approves.

## Suggested next handoff

DeepSeek should read this shared report, incorporate the refinements, resolve the selected checkpoint choices with the owner, and present the revised approval checkpoint. Codex has not changed DeepSeek's spec, initialized Git, approved implementation or written application code as part of this check. Once the builder produces files and its evidence report, Codex can read those directly and independently test them without a manual report transfer.
