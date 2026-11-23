# Actual Claude follow-up review — November 23, 2026

Reviewed commit: 68a3c1f4c24d75d39d6c0a4147c9691c64fd947f. Actual model: claude-sonnet-5-5. First-party authenticated Claude Code; read-only restricted tools; process exit 0; no permission denials, application edits, command execution or live Nuance access.

Codex independently ran the checks in V0-S1-codex-retest-68a3c1f.md. This review does not claim a live conversation or owner merge approval.

---

# Claude follow-up verification of Mira commit 68a3c1f, correcting reviewed commit 0134750

**Reviewer:** Claude (`claude-sonnet-5-5`). I used read, search and list tools only. I ran no commands or tests, made no live media or provider calls, read no `.env` or credential files, and edited nothing.

**Verdict:** The three prior actionable defects are fixed in source, and I found no concrete remaining issues or regressions in this correction. Subject to Codex's reruns of the maintained suite and the unchanged `.setup` probes, this is **ready for the separate owner-authorized live smoke test**. I am not claiming that a smoke test or owner merge approval has occurred.

## Prior defects

**1. Eager avatar access (was P1): addressed.**
- `sdk.ts:110-116` replaces the creation-time read with a lazy `get avatar()` that catches the SDK's throw and returns `undefined`.
- `connection.ts:176-196` reads the participant and each track inside `try/catch`, so "unavailable" means "no tracks yet". `teardown` nulls `conversation` before cleanup, so `syncMedia` after end sees no avatar.
- This matches the pinned SDK. The exported facade getter at `index.js:3251-3256` throws when `delegate` is unset. The inner getter at `index.js:2467` is stable and is not the exported pre-connect object.
- `sdkContract.integration.test.ts:20-36` uses the real `createNuanceConversation` without connecting. It asserts the raw getter throws, the wrapper does not, `wrapped.avatar` is `undefined`, and the token callback is never called. `mediaOutput.integration.test.tsx:170-213` adds a getter that throws before connect and after `session-ended`, and cleanup does not throw.

**2. Factory or subscription throw (was P2): addressed.**
- `connection.ts:331-380` wraps `createConversation` and all four `on(...)` subscriptions in one `try`. On a throw it calls `closeLifecycle()`, sets `unavailable`, and rethrows.
- The `generation === myGeneration` guard keeps a Stop that arrives mid-start from being overwritten.
- `sdkContract.integration.test.ts:38-55` covers the factory case. It matches the Codex probe at `.setup/codex-mira-sdk-contract.test.ts:20-30`.

**3. Eager mint (was P2): addressed.**
- The eager `await tokenFn()` is gone. `tokenFn` (`connection.ts:305-319`) is only handed to the SDK, so the first mint happens inside `connect()`, after the SDK's `ensureMicrophone` call (`index.js:3092`).
- I checked the old risk points:
  - `attemptId` is captured in the mint callback.
  - A mint failure surfaces through `connect()` rejection and maps to `unavailable`.
  - A microphone denial leaves `attemptId` null, so no `closeAttempt` is sent for an identity that was never minted.
  - Single-flight and generation checks are intact.
- `sdkContract.integration.test.ts:57-84` asserts `mic-denied` and zero `fetchToken` calls. `startFlow.integration.test.ts` still shows one mint per Start, cache reuse, the Stop-release sequencing, and no guard bypass when the release fails.

## Earlier fixes still intact

- Media attach, replace and detach are unchanged. `setMediaElements` and `syncMedia` run on `tracks-changed` and `avatar-ready`, and `detachMedia` runs in teardown on Stop, session end and unmount. `mediaOutput.integration.test.tsx:94-168` covers all three.
- Stop-release sequencing is unchanged. `releasePending` is awaited before the next mint (`connection.ts:296-303`), and a failed release still falls through to the server guard.
- Stale-generation refusal and the `tokenAdapter.ts` epoch rule are unchanged.

## `playwright.config.ts` test-only change

- **Scope:** `permissions: ['microphone']` and the two fake-media Chromium flags (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`) sit only in Playwright's `use.launchOptions`. No runtime file or Vite config references them (`main.tsx`, `App.tsx` and `sdk.ts` are clean), so they do not weaken production consent or turn on a physical camera or microphone. The app still sends `cameraEnabled: false`.
- **Provider contact:** The API for the e2e run is started with `PSC_E2E_NO_KEY=1`, so no provider call can occur there.
- **Caveat, not a defect:** Permission is pre-granted in e2e, so the browser denial path is only covered by the synthetic unit and contract tests. The real prompt has to be exercised in the owner's smoke test.

## Notes, none blocking

- **P4 (cosmetic):** In `connection.ts:344-371` the four `created.on(...)` calls sit inside one `unsubscribers.push(...)`. If the third throws, the first two unsubscribe handles are never stored. `teardown` still disconnects the conversation and the `generation` guard drops late events, so this has no practical effect.
- **Deferred P3 items:** The provider `end_user_id` derivation, the timer-stop wording, and speak-first guidance are unchanged. I am not treating them as blockers. For the smoke script, the owner should speak first, because the app does not trigger a Mira greeting.

## Not inspected or verified

- I did not execute the vitest suite, the `.setup` probes, or Playwright, so I have no execution evidence. The Codex results are Codex's to report.
- I read only the first part of `connection.test.ts` (test names via grep) and the assertions that matter in the SDK contract, media and `startFlow` tests. I did not read the full bodies of `connection.test.ts` or the e2e specs.
- I did not re-read the server files, the ADR, or the builder evidence. They are supporting claims only, and the server was reviewed previously and is unchanged in this correction as far as I can tell from the file set you named.
- Live audio and video behavior against the real provider remains unverified.
