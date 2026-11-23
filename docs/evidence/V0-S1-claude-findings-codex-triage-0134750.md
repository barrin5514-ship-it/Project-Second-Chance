# Claude findings, reproduced by Codex — November 23, 2026

**Final disposition for commit `01347509a4040451f235c013246aec7156701266`: CHANGES REQUIRED. Do not start the live smoke test or approve merge.**

The original two synthetic acceptance probes and all maintained checks passed during the Codex retest. Actual Claude review then identified additional real-SDK/consent/error-path gaps. Codex verified them using three new independent probes; all three fail. The earlier green reruns remain valid within their tested scope, but are not overall acceptance. No application changes or provider calls were made by Codex or Claude.

## Actual Claude review

Claude Code 2.1.312, authenticated first-party `claude.ai` account, actual model `claude-sonnet-5-5`. Launched with read-only Read/Glob/Grep tools, restricted mode, no command-execution tools, no MCP servers and credential-file exclusions. Exit 0, successful review result, no permission denials. Review text is saved in `docs/evidence/V0-S1-claude-review-0134750.md`. This was actual Claude review, not Codex adopting a reviewer persona. The raw review's scope and limitations remain part of the record.

## Reproduced findings

### P1 — Eager avatar access prevents the real SDK from connecting

- Source: `apps/web/src/avatar/sdk.ts:107` evaluates `conversation.avatar` while wrapping a newly created, unconnected SDK conversation.
- The exported pinned SDK returns an outer conversation facade whose avatar getter throws before it has a delegate (`node_modules/@nuancelabs/js-sdk/index.js`, around 3251). An inner LiveKit implementation has a stable avatar object, but it is not the exported pre-connect facade; inspecting only the inner getter would give the wrong conclusion.
- **Actual runtime reproduction, without calling connect:** import the installed `createNuanceConversation`, create an idle conversation with a token function that fails if called, register it, and wrap it through the actual app adapter. The adapter throws `Not connected — call connect() first`. The token function is not called; no network, microphone or provider access is needed to reproduce.
- The maintained media mocks expose an always-readable avatar and therefore miss this mismatch. The original independent synthetic media probe has the same limitation; it remains unchanged, with its passing result explicitly bounded.
- Fix with a real contract regression: never evaluate the participant getter during construction; expose it lazily and safely handle unavailable participants before connect and after disconnect. Keep the SDK behind the replaceable adapter. Do not merely alter the actual-SDK probe or broaden its fake.

### P2 — Synchronous construction failure leaves a stuck connecting state

- Source: `apps/web/src/avatar/connection.ts:316` calls `options.createConversation` outside the guarded connect failure path.
- The independent throwing-factory probe verifies that `start()` rejects but `getState()` remains `connecting`, rather than becoming recoverable `unavailable`.
- The real-SDK defect above triggers this route, but the recovery bug needs its own regression so a future construction/configuration error cannot strand the UI or attempt slot.
- Handle construction/subscription failures with cleanup and honest state transition. Preserve cancelled-generation checks and existing release sequencing.

### P2 — Eager mint precedes microphone consent and starts expiry too early

- Source: `connection.ts:306` calls `tokenFn()` before the SDK asks for microphone permission. Story AC3 describes minting with user-approved microphone permission. The real pinned SDK already calls `ensureMicrophone` before its token callback (`index.js`, around 3092).
- Independent denial-before-token-use fixture: the SDK refuses microphone permission before calling its supplied token callback. The app nevertheless calls `fetchToken` once. Expected zero; actual one. This spends a token-mint/start quota slot and starts the unused token's lifetime before consent, though it does not by itself prove a billable conversation occurred.
- Let the SDK request the first single-flight token when appropriate after permission instead of eagerly pre-minting. Preserve one-mint-per-explicit-Start, cached/recalled-token behavior, generation/identity isolation, no app-level retries, failed-release rejection and server enforcement.
- Update mocks that assume an eagerly fetched token to model the documented SDK callback order. Do not relax safety behavior or use real credentials to obtain green.

## Exact independent reproduction command

`npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts`

Observed exit 1: **3 tests failed**, 4.80 seconds. Files are local ignored `.setup/codex-mira-sdk-contract.test.ts` and `.setup/vitest.codex-sdk-contract.config.ts`. The first uses the installed SDK constructor without ever calling connect; the other two use synthetic SDK failures and synthetic token responses. No API key was read and no live session started. Incorporate meaningful regressions into maintained tests with observed RED/GREEN evidence; rerun these probes unchanged.

## Nonblocking review notes

Claude's P3 items (separate pseudonymous provider end-user id, clearer timer-ended wording, explicit speak-first smoke instructions) are recorded for consideration, not a production redesign. The smoke test is deliberately user-greeting-first, so the absence of an unsolicited persona greeting is not itself a blocker. Local-only memory/session limits remain disclosed. Do not expand into forms or broader capstone work.

## Focused builder handoff

Read this triage and the saved actual Claude review. Fix the three verified behaviors using TDD within the already-approved Mira scope. Preserve the previous two fixes and all consent, camera-off, server, identity and retry safeguards. Record actual results in the builder evidence and stop for Codex retesting and follow-up Claude verification. No fresh planning approval is required for these defect fixes. No merge, push, deployment or live session is authorized by this report.
