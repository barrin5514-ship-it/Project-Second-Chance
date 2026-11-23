# Claude review — Mira spike — November 23, 2026

Actual reviewer: Claude Code, first-party authenticated account, model claude-sonnet-5-5. Read-only tools, no command execution or application edits, no live session. Process exited 0. Reviewed commit: 01347509a4040451f235c013246aec7156701266.

**Review findings require Codex technical triage; this is not merge approval. A separate follow-up report records which claims were reproduced.**

---

# Independent review: V0-S1 Mira spike at `0134750`

**Verdict:** One release-blocking defect (P1) in the SDK adapter. It is a real-SDK contract failure that the mocks cannot catch. The code is **not yet ready for an owner-authorized live smoke test**. It should be ready once finding 1 is fixed with a contract test. Finding 2 is a small fix worth taking in the same change.

## Findings

**1. P1 (release-blocking): the adapter reads `conversation.avatar` at creation time, and the real SDK throws.**
- **Location:** `apps/web/src/avatar/sdk.ts:107`, which feeds `connection.ts:177` (`syncMedia`).
- **SDK behavior:** In `@nuancelabs/js-sdk@0.40.0`, `Conversation.avatar` throws `"Not connected — call connect() first"` whenever there is no live session (`index.js:3251-3256`). The typings say the same (`index.d.ts:215-219`). It throws before `connect()`, and again after any disconnect or `session-ended`.
- **Trigger:** `wrapConversation` evaluates `conversation.avatar !== undefined` while building the wrapper, so it runs during `createConversation`. On the first real Start this throws before `connect()`, and the microphone is never requested. The spread would also freeze a participant captured at creation time, rather than reading the getter lazily.
- **Why tests pass:** Every fake gives `avatar` as a plain always-available property (`mediaOutput.integration.test.tsx:23-46`, `sdkAdapter.test.ts`). The "remote output attachment" fix therefore proves wiring against a shape the real SDK does not have.
- **Impact:** Every live Start would fail. This is the same class of defect as the earlier `conversation.on(...)` finding.
- **Fix:**
  - In `wrapConversation`, define `get avatar() { try { return conversation.avatar; } catch { return undefined; } }`.
  - In `syncMedia`, read the avatar inside `try/catch` and treat a throw as "no tracks".
- **Regression test:**
  - Add a fake whose `avatar` getter throws until `connect()` resolves and again after `session-ended`. Assert that `createConversation` does not throw, that tracks attach after `avatar-ready` or `tracks-changed`, and that cleanup after end does not throw.
  - Best is a contract test that calls the real `createNuanceConversation({ token })` without connecting (the constructor makes no network call). It should wrap that conversation and assert the wrapper does not throw, so a getter-semantics mismatch fails in CI.

**2. P2: the token is minted before the microphone prompt, and a failing `createConversation` is unhandled.**
- **Pre-mint ordering** (`connection.ts:304-306`):
  - AC3 says the server mints after user-approved microphone permission. The SDK itself calls `ensureMicrophone` (`index.js:3092`) before `createConversation` and `token()` (`index.js:47`).
  - Pre-minting therefore mints even when the microphone is denied.
  - It also starts the 60-second token-start clock before the permission prompt. A slow prompt would make the provider return a 401 (the `ApiError` doc describes this "expired or used" case) and consume the attempt.
  - **Fix:** remove the eager `await tokenFn()` and let the SDK's first `token()` call do the single-flight mint. The `attemptId` capture already happens inside `tokenFn`. A mint failure then surfaces through `connect()` rejection, which already maps to `unavailable`.
  - **Test:** with a microphone-denied fake, assert `fetchToken` is called zero times.
- **Unhandled throw** (`connection.ts:316-326`): `options.createConversation(...)` sits outside any `try`. If it throws, `start()` rejects while state stays `connecting` and the minted attempt is never closed. The UI shows an error beside "Connecting…" with a Stop button, and the server slot is held until the 60-second deadline. Fix: wrap it, call `closeLifecycle()`, and set `unavailable`. Test: a throwing factory must end in `unavailable` with the release sent.

**3. P3: smaller points, none blocking.**
- `app.ts:230` builds `end_user_id` from the first 12 characters of the HttpOnly session cookie value, which discloses part of a secret to the provider. Use a separate random or hashed id.
- A timer-initiated Stop (`App.tsx:183`) shows "You stopped the test". It would be more honest to show "The one-minute test ended".
- The SDK does not make Mira speak first. Its `startOn` docs say to send `response.create` on `avatar-presented`, or wait for the user to speak. The app does neither, so the owner should speak first in the smoke test. This is not a defect, but the smoke script should say so.
- Acknowledged local-prototype limitations:
  - The sessions `Map` is never evicted.
  - After an API restart, the page keeps its stale CSRF value until reload.
  - D5 trusts the browser's `started` and `stop` reports (accepted by the ADR).
  - There is no rate limiting.

## Verified as correct

- **Stop→Start race:** `releasePending` sequencing (`connection.ts:279-286`) is sound. The generation checks and the tokenAdapter epoch rule correctly refuse stale callbacks.
- **Server and request controls:**
  - Consumption is terminal, and `begin` cannot revive an identity.
  - Origin, CSRF and loopback checks all run before any provider call.
  - Provider errors are sanitized, the key goes only into the Authorization header, and the Vite `cors: false` setting is right.
  - The e2e config forces the key absent.
- **SDK contract match:**
  - `onChange` event types are correct.
  - `cameraEnabled: false`, `maxSessionSeconds`, `stayConnectedOnEnd` and `startOn` are all valid options.
  - The token body matches `SessionTokenRequest`.
  - `session-ended` triggers an SDK-side disconnect, so media is released.
  - `MediaAccessError` classification on `device` and `reason` matches.

## Scope and limits

- **Read:**
  - All five governing docs.
  - Server `app.ts`, `main.ts`, `attemptRegistry.ts`, `sessionGuard.ts` and `nuanceGateway.ts`.
  - Web `connection.ts`, `sdk.ts`, `tokenAdapter.ts`, `App.tsx` and `main.tsx`.
  - `vite.config.ts`, `playwright.config.ts`, and the SDK `index.d.ts` plus the relevant `index.js` sections.
- **Not read in full:** `config.ts`, the e2e specs, the CSS, and most test bodies (I only grepped the media and SDK fakes).
- **Not run or verified:** I ran nothing and read no `.env`. I did not re-verify Codex's results, and no live audiovisual behavior has been verified. Owner merge approval has not occurred.
