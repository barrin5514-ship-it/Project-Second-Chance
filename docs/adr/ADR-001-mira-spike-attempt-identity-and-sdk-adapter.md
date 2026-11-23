# ADR-001 — Attempt identity, token lifetime and SDK adapter for the Mira connection spike

- Status: **Proposed by the builder** (DeepSeek). Records implementation choices for V0-S1 only. Not an approved architecture decision; AD-01…AD-10 in `docs/product/BMAD_Architecture_Spine.md` are unchanged and authoritative. The owner approves; Codex independently tests; Claude reviews.
- Date: 2026-11-23. Branch: `feature/v0-s1-mira-spike`. Scope: `docs/stories/V0-S1-mira-connection-spike.md`, approved spec `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`.
- Related risks (all still OPEN): R05 credit consumption, R07 token abuse, R08, R15. Prototype risks: SDK drift, key/token leak, overtrust.

## Context

The spike connects a browser page to one Nuance Mira persona for a 60-second conversation. Three constraints interact:

1. The provider token is single-use, and each issued token can spend credit. The browser must never mint more than once per explicit Start, and an SDK-internal retry must not reach the provider again.
2. The pinned SDK (`@nuancelabs/js-sdk@0.40.0`) asks for a fresh token "each time it starts a conversation", and cannot receive a persona or prompt from the page (the token fixes both).
3. The server must decide with the browser's own session cookie alone, and must not leak provider text, keys or tokens.

## Decisions

### D1 — The server issues the attempt identity; the browser never invents one

`POST /api/avatar/session-token` with no `attemptId` asks for a new identity: `AttemptRegistry.begin(sessionId)` answers `att_…` (16 random bytes, base64url). The response `{token, attemptId}` is the only body the page receives. Any later call names the identity it holds.

Consequence: a page cannot mint "as" another browser's attempt, and the server owns the single-use decision rather than trusting the client.

### D2 — Consumption is terminal; the identity is never revived

Once an attempt has minted, `consume` refuses it forever: after Stop, failure, timeout, expiry or session end. `close(attemptId, sessionId, reason)` releases resources only. A closed attempt is never re-armed, so a stale SDK callback cannot mint.

Consequence: Stop → Start always mints a *new* identity, and a doubled token callback inside one Start is answered from client cache (D4).

### D3 — The token-start deadline applies only before a conversation starts

`tokenTtlMs` (default 60 s) bounds the time an unused token may be presented. `canMint` refuses after the deadline while `conversationStarted` is false. Once `markStarted` runs, the deadline no longer applies to that attempt, so a running conversation is not cut off by its token age.

The browser reports `started` only after `conversation.connect()` resolves (`POST /api/avatar/attempt-lifecycle {action:'started'}`), never on token fetch.

### D4 — One mint per explicit Start, enforced on both sides of the boundary

- **Client:** `createHttpTokenAdapter` caches the issued token, de-duplicates in-flight requests, and presents the identity it holds on any repeat call. `createAvatarConnection` passes a cached, single-flight `token` callback as the SDK's own `token` option, so the SDK's capacity retry receives the same token and never reaches the server.
- **Server:** `consume` refuses a second presentation of the same identity (409, provider not contacted), and `begin` refuses a second concurrent attempt in the same session.

**Alternative rejected:** minting inside `App.tsx` per render (the pre-existing code). It minted before `createConversation`, again via a non-SDK `onTokenRequest` option the SDK ignores, and never reset the adapter, so a second Start was answered with the first Start's token. This was Codex finding 2 and is fixed with tests.

### D5 — An abandoned attempt must not hold a session forever

`begin` only refuses while the session's attempt **still holds the session**: a started conversation, or an unsatisfied token-start deadline. Otherwise the slot is released and the next explicit Start gets a fresh identity.

**Why this is a correctness fix, not a feature:** the session cookie lives 30 minutes while the token deadline is 60 seconds. If a tab dies after minting, the browser never calls `close`; without D5 the session would be refused every Start until the cookie expired. Found by my own failing test (`begin refused: awaiting-start`).

**Accepted limitation:** the browser's `started`/`stop` reports are unauthenticated *intent* beyond CSRF + session binding (they only affect that session's own attempt). A hostile same-session script is outside this local, single-user prototype's threat model. No rate limiting exists; this must be revisited before any hosted or multi-user use.

### D6 — Lifecycle updates are a separate, CSRF-protected route

`POST /api/avatar/attempt-lifecycle {attemptId, action:'started'|'stop'}` returns 204; `GET ?attemptId=…` returns `{active:boolean}`. Both are guarded by the same `authorizePost`/loopback-Host checks as the token route, never contact the provider, and carry generic bodies. An unknown or foreign attempt is refused with a generic 409 (no existence oracle).

### D7 — The page's SDK access goes through an adapter, registered at entry

`createSdkAdapter()` (in `avatar/sdk.ts`) wraps `createNuanceConversation` and maps the pinned SDK's **real** contract — `Conversation.onChange((event) => …)` with discriminated `event.type` (`'avatar-presented'`, `'session-ended'`, …) — onto the wrapper's `on(name, handler)`.

**Defect this fixes:** the wrapper previously called `conversation.on('avatar-presented', …)`, which `0.40.0` does not expose; every subscription would have failed at runtime. It also passed `token` as a *string* and an unknown `onTokenRequest` option (silently ignored). `disconnect()` is now correctly treated as `Promise<void>`.

`main.tsx` registers the pinned factory (`registerNuanceSdk(createNuanceConversation)`); `App.tsx` resolves it lazily on the first Start. Importing `App` (or the test suite) never loads the SDK.

**Alternative rejected:** importing the SDK inside `App.tsx`. It would make every component test load the SDK and hide the registration step that the page entry must perform.

### D8 — A token callback from a closed Start is refused, and an in-flight mint is not cached

Closing a Start (Stop, failed connect, session end, unmount, or a newer Start) advances the connection's generation. The captured `token` callback checks that generation before it mints or returns anything, so a delayed SDK capacity retry cannot mint again after Stop/failure or receive a newer Start's token.

The HTTP adapter has the matching epoch rule: `reset()` advances an epoch, and a mint that resolves under an old epoch is never cached. It is rejected as superseded, and the consumed server identity is released with a best-effort `stop` lifecycle note so its session slot does not linger. Found by a failing test in this session (token callback resolved a token after Stop; a closed Start could also hand a stale cached token to the next Start).

### D9 — Dev server adds no permissive CORS header; the phone control stays in view

`vite.config.ts` sets `server.cors: false`. Vite's dev server otherwise answers `Access-Control-Allow-Origin: *`, contradicting the API's no-CORS stance (found by the real browser suite). The app itself still adds no CORS headers.

At phone widths the primary Start/Stop control is a fixed bottom action bar so it remains visible before the long disclosure is scrolled; the disclosure stays in normal flow and is readable without starting a call.

### D10 — Remote Mira audio/video is attached through the adapter, never faked

The pinned SDK exposes `conversation.avatar.videoTrack` / `audioTrack` with `attach(element)` / `detach()`, and reports `tracks-changed` and `avatar-ready`. `ConversationLike` now carries an optional `avatar`, `sdk.ts` forwards the real participant, and `connection.ts` attaches the current tracks whenever they change or the page registers its elements. Track replacement detaches the old track first; Stop, SDK end, failure and unmount detach everything. `App.tsx` renders labelled `<video>` and `<audio>` elements only while connected, so no media element or capture exists before the explicit Start.

The app still shows no simulated avatar: the elements exist only in the `ready` state produced by the SDK's `avatar-presented` event. This proves wiring, not provider playback; a live audiovisual smoke test remains owner-gated (see Verification status).

**Alternative rejected:** attaching tracks inside `App.tsx` directly from the SDK. That would duplicate SDK-specific knowledge outside the replaceable adapter and make the media path untestable without the real SDK.

### D11 — A new Start sequences after the previous Stop's server release

`closeAttempt` now returns the lifecycle POST promise. The connection stores it as `releasePending`, and the next explicit `start()` awaits it before requesting a mint. This removes the race where the new mint reached the server before the Stop release, so the same-session guard correctly refused the old attempt and the user saw a failed Start immediately after a successful Stop.

The client still resets its token cache immediately on Stop. If the release request fails, the promise settles and the Start falls through to the **unchanged** server guard: no new session is bootstrapped, the one-mint-per-Start rule is untouched, and the failure is reported rather than masked. Found by Codex's independent probe (held release, immediate restart).

### D12 — No token is minted before the SDK-mediated microphone consent

The earlier implementation called the token function eagerly in `start()`, before `createConversation`/`connect()`. The pinned SDK itself calls `ensureMicrophone` before its `token` callback, so the eager call spent a token/start-quota slot and started the token-start lifetime before the user granted permission (found by actual Claude review and reproduced by Codex).

The eager call is removed. The SDK's `token` option is the only mint path: if permission is denied, the SDK rejects `connect()` before asking for a token, so zero provider mints and zero server attempts occur. One-mint-per-Start, cached/single-flight callbacks, generation isolation and the server guard are unchanged.

### D13 — Real-SDK participant access is lazy, and construction failures are recoverable

The exported `@nuancelabs/js-sdk@0.40.0` conversation facade throws `Not connected — call connect() first` when its `avatar` participant is read before `connect()`. The adapter previously read it while wrapping, which would have broken the real page despite passing fake-SDK tests.

`sdk.ts` now exposes a guarded lazy `avatar` getter that is evaluated only when the connection needs the participant and returns no tracks when unavailable (before connect, after disconnect, or a lifecycle-only double). `connection.syncMedia` also guards participant and track reads. Separately, `createConversation` and its event subscriptions are wrapped in try/catch: a synchronous construction/subscription failure cleans up and moves the state to `unavailable` instead of stranding `connecting`, preserving cancelled-generation checks and the release sequencing in D11.

## Verification status

- Unit/integration: `npm test` → **13 files, 150 tests, exit 0**. `npm run typecheck` → exit 0. `npm run build` → exit 0 (819 kB bundle; informational warning only). `npm run verify:secrets` → exit 0; `npm run test:secrets` → 7 passed.
- Codex's five independent acceptance probes, unchanged, now pass: `npx vitest run --config .setup/vitest.codex-review.config.ts` → 2 passed; `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` → 3 passed.
- End-to-end through the **real** adapter, **real** connection wrapper and **real** Express app (only the provider HTTP call faked, synthetic credentials): 8 tests, including one-mint-per-Start, identity reuse, token-deadline behaviour, Stop→Start, delayed-release restart, failed-release rejection and stale-callback refusal.
- SDK contract/consent: 3 real-App tests cover wrapping the actual pinned pre-connect conversation, construction-failure recovery, and zero mint on microphone denial.
- Remote output: 4 real-App media tests cover attach/replacement/Stop, SDK end, unmount, and a participant getter that throws before connect and after end; no local camera and no media before Start.
- Real-browser: `npm run test:e2e` → **26 passed, exit 0** on the pinned Chromium 131.0.6778.33 / build 1148, with provider access disabled (`PSC_E2E_NO_KEY=1`). The harness pre-grants a **fake** microphone so the SDK reaches the honest 503; no physical device or provider call is used. Installing that browser required recovering the official completed artifacts after Playwright's installer stalled; this is recorded in `docs/evidence/V0-S1-builder.md`. The test timeout is 60 s to tolerate cold Vite compilation; assertions and retries are unchanged.
- **Not verified:** a live Nuance conversation and actual provider playback/microphone permission. No live browser call was attempted with real credentials; that remains an owner-observed step. No claim is made that a live Nuance call works.


## Open items

- Revisit D5's intent-report trust and the absence of rate limiting before any shared, hosted or multi-user use.
- Re-check `@nuancelabs/js-sdk@0.40.0`'s participant readiness and track/event contract before any SDK upgrade; `sdk.ts` is the single place that depends on them.
