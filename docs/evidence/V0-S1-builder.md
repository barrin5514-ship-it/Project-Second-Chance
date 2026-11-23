# V0-S1 builder evidence — Mira local connection prototype

Builder: DeepSeek. Status: **CLAUDE-TRIAGE FIXES COMPLETE — STOPPED FOR CODEX RETESTING AND FOLLOW-UP CLAUDE VERIFICATION.** This file records observed results only. Codex's synthetic retest passed, then actual Claude review found three further real-SDK/consent/error-path gaps, which Codex reproduced on `0134750` and returned **CHANGES REQUIRED**. Those three are fixed and evidenced below. Nothing here claims Codex acceptance, Claude re-review or owner merge approval. No live session was started, and the real `.env` was not read, quoted, copied or logged at any point.

## Identity and scope

- Story: `docs/stories/V0-S1-mira-connection-spike.md` (AC1–AC8). Approved spec: `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`.
- Date of this checkpoint: 2026-11-23 (America/New_York). Absolute workspace: `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance`.
- Branch: `feature/v0-s1-mira-spike`. VCS location/ownership verified with `git rev-parse HEAD` before edits.
- Spec `baseline_commit` (recorded at planning): `96eb8998d3e60f81c668f656c7e1ae589712bb91`; HEAD at this session's start: `6ef92c3`.
- BMAD: stable 6.12.4 through the project-local BGLAD launcher. `uv run --no-cache _bmad/scripts/render_skill.py --project-root <abs> --skill <abs>/.agents/skills/bmad-build` succeeded earlier in the build; spec `route: dispatch`, `status: ready-for-dev`.
- Runtime: Node v26.13.0, npm 11.20.0. Pinned app deps in `package.json`: `@nuancelabs/js-sdk` exact `0.40.0`, express `4.21.2`, react `18.3.1`, vite `6.0.3`, vitest `2.1.8`, `@playwright/test` `1.49.1`, typescript `5.7.2`.
- Risk IDs rechecked at start and completion: R05, R07, R08, R09, R10, R15, R16, R20, R21, R23, R24, plus prototype risks (recording disclosure, avatar overtrust, key/token leak, local token abuse, credit consumption, SDK drift, media cleanup). All remain **OPEN** for independent review; nothing in this spike closes them.
- Explicit exclusions preserved: no forms, case data, legal advice/eligibility, private records, uploads, filing/sending, deployment, push, merge or paid-plan change. No live/paid avatar conversation was started.

## Pre-existing work preserved

Saved server work (tracked at `6ef92c3`): `config.ts(.test)`, `avatar/attemptRegistry.ts(.test)`, `avatar/nuanceGateway.ts(.test)`, `avatar/sessionGuard.ts(.test)`, `app.ts`, `routes.test.ts`. Untracked from earlier builder runs: `apps/web/**`, `apps/server/src/main.ts`, `tests/e2e/avatar.spec.ts`, `playwright.config.ts`, `vite.config.ts`, `package.json`, etc. Codex reports (`V0-S1-planning-check-codex.md`, `V0-S1-revised-planning-check-codex.md`, `V0-S1-codex-interim-test-check.md`, `V0-S1-codex-build-check-2026-11-23.md`) were preserved unmodified.

## Observed baseline at this session's start (before any edit)

```
npx vitest run --reporter=basic
exit 1
Test Files  1 failed | 9 passed (10)
Tests       1 failed | 134 passed (135)

FAIL apps/server/src/avatar/nuanceGateway.test.ts > ...
  ReferenceError: MAX_SESSION_SECONDS is not defined

npm run typecheck
exit 2
apps/server/src/avatar/nuanceGateway.test.ts(62,12): error TS2304: Cannot find name 'MAX_SESSION_SECONDS'.
```

So the tree was **not** the state Codex reported (114 passed, typecheck clean). The failure was a half-finished edit, recorded below as a test correction — not used as fabricated RED evidence.

## Test-first evidence

Each row is a behaviour driven by a test that was observed failing before the minimal implementation. Rows B8–B11 are from this session; B1–B7 were recorded by the preceding builder session and are preserved here. "Full suite" means `npm test` unless stated.

| Behaviour / AC | FR/NFR + risks | RED (command, expected assertion, actual failure, exit) | Minimal behaviour | GREEN (command, count, exit) | Refactor / regression |
| --- | --- | --- | --- | --- | --- |
| B1 Start mints exactly once per explicit Start; one server-issued `attemptId` reused (AC4, AC6) | FR-1/FR-2; R05, R07, R08, R24 | `npx vitest run apps/web/src/avatar/startFlow.integration.test.ts` → 1 failed: `Could not start the conversation.` (second Start 409; adapter `reset()` never called), exit 1 | `createAvatarConnection({createConversation, tokens})` with cached single-flight `token`; `closeLifecycle()` calls `tokens.reset()`; one module-level adapter in `App.tsx` | 6 passed; `connection.test.ts` 17 passed at that checkpoint | Full-suite regression after every change |
| B2 Server-side attempt lifetime across the token route (started conversation outlives token-start deadline; abandoned attempt expires; cross-session refusal) (AC4, AC7) | FR-2; R07, R08, R15 | `npx vitest run apps/server/src/routes.test.ts` → 4 failed, all `expected 409/403/204, received 404` (no lifecycle route), exit 1 | `POST/GET /api/avatar/attempt-lifecycle` behind shared `authorizePost`; `AttemptRegistry.owns()`; `markStarted`/`close` wired | `routes.test.ts` → 20 passed, exit 0 | `authorizePost` extracted so token and lifecycle routes share one guard |
| B3 An abandoned (never-started) attempt must not block its session forever (AC4, AC7) | FR-2; R07, R24 | `npx vitest run apps/server/src/avatar/attemptRegistry.test.ts` → 1 failed: `begin refused: awaiting-start` from `mustBegin`, exit 1 | `begin()` refuses only while `stillHoldsSession(record)` | 37 passed across registry + routes, exit 0 | Added direct started-conversation-past-deadline test (18 registry tests) |
| B4 Browser reports the conversation really started, releases identity on Stop (AC4, AC6) | FR-2; R05, R07 | `npx vitest run apps/web/src/avatar/startFlow.integration.test.ts` → 2 failed: `expected false to be true` for `{active:true}`; Start-after-Stop failed, exit 1 | `TokenProvider.markStarted?/closeAttempt?`; connection calls `markStarted` after `connect()` resolves, `closeAttempt` only when a mint happened | 6 passed, exit 0 | Lifecycle POSTs fire-and-forget with swallowed rejection; identity stays single-use |
| B5 Real SDK contract and page entry path (Codex finding 1) | AC1, AC2, AC6; prototype SDK drift | `npx vitest run apps/web/src/avatar/sdkAdapter.test.ts`: `./sdk` module did not exist; after creation one test-bug failure (`actual value must be number or bigint, received "undefined"` — test snapshotted a global primitive), corrected in the test, not the implementation | `apps/web/src/avatar/sdk.ts` maps real `onChange` event types; `main.tsx` registers the pinned factory; `App.tsx` resolves it only on Start | `sdkAdapter.test.ts` 4 passed; `entryPath.test.tsx` 2 passed; suite 134 passed; typecheck clean | Full-suite regression |
| B6 Secrets guard | NFR secret handling; R07 | `node --test scripts/verify-secrets.test.mjs` → 1 failing (script absent). First real-tree run then exited 1 (scope bug scanned untracked `.env`; plus deliberate fixture look-alikes) | Guard sources tracked files from `git ls-files`, so ignored/untracked files including the real `.env` are never opened; fixture file skipped; no values printed | `npm run verify:secrets` exit 0; `npm run test:secrets` 7 passed | Added tracked-file scoping test |
| B7 Browser suite execution (AC1–AC8) | All; credit-spend risk | First run: 26 failed at `browserType.launch` (pinned Chromium build 1148 absent). See "Browser environment recovery" for the completed install and the later real failures | Installed the exact pinned browser build; fixed the two genuine defects found by the real browser (B11) | `npm run test:e2e` → 26 passed, exit 0 | Re-ran full suite after every later change |
| B8 A late SDK `token()` callback for a closed Start must not mint or borrow a token (`STALE_CALLBACK_AFTER_STOP`, `STALE_CALLBACK_AFTER_FAILURE`, `STALE_UNLOCK_NEWER`) (AC4, AC7) | FR-2; R05, R07 | `npx vitest run apps/web/src/avatar/connection.test.ts` → **3 failed / 17 passed**, exit 1. After Stop the callback resolved `"st_abc"` (a fresh mint) instead of rejecting; after a failed connect it resolved `"st_abc"`; after a newer Start an old callback resolved `"st_token_2"` (the newer Start's token) | `closeLifecycle()` ends the Start's generation; the `token` callback refuses a stale generation before any mint; `stop()` relies on the same close path | `connection.test.ts` → **20 passed**, exit 0; full suite 138 passed | Full-suite regression; the three matrix rows now have behaviour tests |
| B9 A mint that resolves after the Start was closed must not be cached for a later Start (AC4, AC7) | FR-2; R05, R07 | `npx vitest run apps/web/src/avatar/tokenAdapter.test.ts` → 1 failed: `expected promise to reject, received {attemptId:"att_first", token:"st_test_first…"}`; no second mint for the new Start | `createHttpTokenAdapter` keeps an epoch; `reset()` bumps it; a mint completing under an old epoch is never cached, is reported superseded, and the consumed identity is released with a best-effort `stop` lifecycle note | `tokenAdapter.test.ts` → 2 passed (including caching/de-dup inside one open Start), exit 0; full suite 141 passed | Full-suite regression |
| B10 Stopping during connecting must not raise a failure alert (AC5, AC7) | AC5/AC7; UX honesty | `npx vitest run apps/web/src/App.test.tsx` → 1 failed: `role="alert"` present with `That start did not work. You can try again.` after the user pressed Stop | `handleStart` ignores a rejection when the connection state is `stopped` | `App.test.tsx` → 26 passed, exit 0 | Full-suite regression |
| B11 Real-browser request protection and phone-sized control visibility (AC1, AC2, AC6) | AC1/AC2/AC6; local token abuse, honesty | First real `npm run test:e2e`: **20 passed / 6 failed** (3 behaviours × 2 projects). `bootstrap … no permissive CORS` received `access-control-allow-origin: "*"` from the Vite dev server; preflight test same; at 375×667 the Start button was outside the viewport (`viewport ratio 0`) | `vite.config.ts`: `server.cors = false`; narrow-viewport CSS keeps the primary control as a fixed bottom action bar while the disclosure stays readable in flow | `npm run test:e2e` → **26 passed**, exit 0 (31.4 s) | Full E2E suite re-run after all later changes; still 26 passed |
| B12 Remote Mira audio/video must reach page elements, follow `tracks-changed` and detach on Stop/end/unmount (AC6) | AC6; No False Hope (no text-only "connected" claim), media cleanup | Codex independent probe reproduced first: **1 test, 4 failing soft assertions** — no `video`, no `audio`, neither track's `attach` called. Maintained RED: `npx vitest run apps/web/src/avatar/mediaOutput.integration.test.tsx` → **1 failed**: `the page needs an output video element for Mira: expected null not to be null`, exit 1 | `ConversationLike` exposes the SDK's `avatar.videoTrack/audioTrack`; `sdk.ts` forwards them; `connection.ts` attaches on `tracks-changed`/`avatar-ready`/element registration, detaches on change and teardown; `App.tsx` renders labelled `<video>`/`<audio>` inside the connected surface and registers them only while `ready` | `mediaOutput.integration.test.tsx` → **4 passed** (attach, track replacement and Stop; SDK end; unmount; a getter that throws before connect and after end), exit 0; the unchanged Codex probe → **2 passed** | Full suite and E2E re-run; camera stays disabled and no media element exists before Start |
| B13 A new Start must wait for the prior Stop's server release instead of racing the same-session guard (AC4, AC7) | AC4/AC7; R05 (credit), R07 (token abuse) | Codex independent probe reproduced: held Stop release → `connection.start()` rejected `Could not start the conversation.` Maintained RED: new `startFlow.integration.test.ts` case with a 75 ms-delayed release → same rejection, exit 1 | `HttpTokenAdapter.closeAttempt` now returns the lifecycle POST promise; `createAvatarConnection` tracks `releasePending` and awaits it before minting; failures fall through to the unchanged server guard (no bypass, no new session, no sleep in application code) | `startFlow.integration.test.ts` → **8 passed** (including delayed release and a failed-release regression that must still reject with only 1 provider call), exit 0; the unchanged Codex probe → **2 passed** | One-mint-per-Start, stale-callback and same-session guard tests all still pass |
| B14 Wrapping the real pinned SDK must not read its pre-connect participant (AC6) | AC6; real-SDK contract | Codex SDK-contract probe reproduced `Not connected — call connect() first`. Maintained RED: `npx vitest run apps/web/src/avatar/sdkContract.integration.test.ts` → **3 failed** (the real-SDK case threw at `createSdkAdapter().createConversation(...)`), exit 1 | `sdk.ts` no longer spreads or reads `conversation.avatar` while wrapping; a guarded lazy `avatar` getter returns undefined before connect and after disconnect; `connection.syncMedia` also guards participant and track reads | `sdkContract.integration.test.ts` → **3 passed**; the unchanged SDK probe → **3 passed** | All earlier media, adapter and integration tests still pass |
| B15 A synchronous SDK construction failure must reach a recoverable state, not strand `connecting` (AC5) | AC5; recoverability, attempt-slot hygiene | Same maintained RED file, construction-failure case: `expected 'connecting' to be 'unavailable'`. Codex probe reproduced independently | `options.createConversation` and its event subscriptions are wrapped in try/catch; on failure `closeLifecycle()` unsubscribes/releases and the state becomes `unavailable` before the error is rethrown; cancelled-generation checks are preserved | `sdkContract.integration.test.ts` → **3 passed**; the unchanged SDK probe → **3 passed** | Delayed-release ordering test still passes |
| B16 No token mint before the SDK-mediated microphone consent (AC3) | AC3; R05 (credit/start quota), token lifetime | Same maintained RED file, consent case: `expected "spy" to not be called at all, but actually been called 1 times`. Codex probe reproduced the same eager mint | Removed the eager `await tokenFn()` before construction. The SDK's own `token` option is the only mint path, and the pinned SDK calls it after `ensureMicrophone`; the cached/single-flight callback, generation guard and server one-mint guard are unchanged | `sdkContract.integration.test.ts` → **3 passed**; the unchanged SDK probe → **3 passed**; `connection.test.ts` 20 passed after its doubles were updated to the documented callback order | Full suite and browser suite re-run (see below) |

### Test corrections (not counted as RED/GREEN behaviour evidence)

- **Duration field on the token-mint body.** An in-progress test expected `max_session_seconds` in `POST /session-tokens` and failed with a missing import. Verified against the pinned package: `SessionTokenRequest` has no duration field, and `index.js` line 3110-3111 sends `max_session_seconds` on the **conversation-start** request from the SDK's `maxSessionSeconds` option. The test was corrected to assert the documented token body (duration absent, exact top-level keys); the 60 s cap is asserted by `connection.test.ts` (`maxSessionSeconds === 60`, `MAX_SESSION_SECONDS === 60`). The unused server-side constant/helper was removed.
- **A vacuous "ignores caller-supplied persona" route test** asserted an always-empty local array. It now captures the provider request body and asserts fixed `persona_id: "mira"`, the fixed purpose prompt, and absence of the caller's `emma` / `give legal advice` strings. It passed on first run after the correction; not counted as new behaviour.
- **Unused-symbol diagnostics** in `App.tsx` and `connection.test.ts` were removed (no behaviour change); see editor diagnostics below.

## Codex independent-testing round — blockers fixed (2026-11-23)

Codex reviewed commit `8b2fd40` and returned **CHANGES REQUIRED** (`docs/evidence/V0-S1-codex-independent-testing-2026-11-23.md`). Its fresh results were: `npm test` 140 passed / 1 failed (immediate Stop→Start); `npm run test:e2e` 25 passed / 1 timed out in `page.goto` (the isolated case passed; recorded as a reliability concern, not evidence that microphone capture occurred); both independent probes failed. I reproduced both probe failures exactly before changing code.

- **P1 no output media (AC6).** Fixed behind the replaceable adapter: `ConversationLike` now exposes the pinned SDK's `avatar.videoTrack/audioTrack`; `sdk.ts` forwards them; `connection.ts` attaches on `tracks-changed`/`avatar-ready` and whenever the page registers elements, detaches on track replacement, Stop, SDK end, failure and unmount; `App.tsx` renders labelled `<video>`/`<audio>` only in the connected state. Behaviour tests: `mediaOutput.integration.test.tsx` (3 tests: attach + replacement + Stop; SDK end; unmount). Camera stays off in both layers, and no media element exists before Start.
- **P1 Stop/reset ordering (AC4/AC7).** `closeAttempt` now returns the lifecycle POST promise; the connection stores it as `releasePending`, and the next `start()` awaits it before minting, then still lets the unchanged server guard decide. No sleep in application code, no new session, no loosened guard and no masked rejection. Behaviour tests: a deterministic delayed-release restart (observed RED before the fix) and a failed-release regression (must reject with only one provider call).
- **E2E reliability only.** The independent `page.goto` timeout is treated as harness reliability, not capture evidence: `playwright.config.ts` test timeout raised from 30 s to 60 s with no assertion, retry, guard or timeout-masking change. The full suite passes 26/26.
- **History limitation retained.** Codex did not witness B1–B7, and some of those rows include module-absence/import/test-correction failures that are not qualifying behaviour RED under AGENTS.md. I have not retroactively upgraded them; B12–B13 are this round's observed RED/GREEN.

## Claude findings / Codex triage round — three fixes (2026-11-23)

Codex retested `0134750`; the earlier synthetic probes and maintained checks passed, then actual Claude review identified three further gaps. Codex reproduced all three with `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` → **3 failed**. I reproduced them in maintained tests (`sdkContract.integration.test.ts` → **3 failed**) before changing code. This was actual Codex triage; I did not perform or claim the Claude review.

- **Real SDK participant must be lazy (AC6).** The exported pinned facade throws from `avatar` before `connect()`; the adapter previously read it while wrapping. `sdk.ts` now exposes a guarded getter that is evaluated only when the connection needs the participant and returns no tracks when unavailable. `connection.syncMedia` guards the participant and track reads too. A media regression also uses a getter that throws before connect and after session end: construction, attachment and cleanup stay safe.
- **Synchronous construction failure must recover (AC5).** Construction and event subscription are now inside a try/catch: cleanup runs and the state becomes `unavailable` before the error propagates, instead of leaving `connecting`.
- **No mint before microphone consent (AC3).** The eager pre-connect `tokenFn()` call is gone. The SDK's own token callback (called after `ensureMicrophone` in the pinned SDK) is the only mint path, so a denied microphone spends no token or attempt. One-mint-per-Start, caching, generation isolation and the server guard are unchanged.
- **Test doubles updated to the documented order.** `connection.test.ts` fakes now invoke the `token` callback during `connect()`, as the real SDK does. This mock change is not itself behaviour evidence; B14–B16's RED evidence is the contract tests above. The no-key browser failure path now uses a **fake microphone** (`--use-fake-device-for-media-stream`, pre-granted permission) so it reaches the server's honest 503 instead of failing at the missing device; no provider is contacted and the live browser still prompts normally.
- **Claude P3 notes** (separate pseudonymous provider end-user id, clearer timer-ended wording, speak-first smoke instructions) are recorded for consideration and were not implemented in this defect round.

## Verification — actual commands and results (2026-11-23)

```
npm test
exit 0 — 13 test files, 150 tests passed

npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts
exit 0 — the three unchanged Claude/Codex SDK-contract probes passed

npx vitest run --config .setup/vitest.codex-review.config.ts
exit 0 — the two earlier unchanged Codex independent probes passed

npm run typecheck
exit 0 — no diagnostics (tsc 5.7.2, root tsconfig)

npx tsc --noEmit -p tsconfig.json --noUnusedLocals --noUnusedParameters
exit 0 — no unused-symbol diagnostics

npm run build
exit 0 — vite 6.0.3, built in 1.83 s; bundle 819 kB (800 KiB).
        The >500 kB chunk warning is informational (the pinned SDK bundle)

npm run test:e2e
exit 0 — 26 passed (19.4 s) on the pinned Chromium 131.0.6778.33 / build 1148,
        projects chromium and chromium-narrow. Provider access disabled by
        PSC_E2E_NO_KEY=1; the API logs "No usable NUANCE_API_KEY. Start will answer 503."
        The harness pre-grants a fake microphone so the SDK reaches that 503;
        no physical device and no provider call are used.

npm run verify:secrets
exit 0 — "no credential leak patterns found in tracked source"

npm run test:secrets
exit 0 — 7 passed, 0 failed
```

### Browser environment recovery (honest deviation)

Playwright 1.49.1 pins Chromium build 1148 (131.0.6778.33). It was absent at session start (and `chromium-1234` from another project is incompatible). `npx playwright install chromium` downloaded the **complete, exact** official artifact (`143,564,014` bytes, matching the CDN `Content-Length`; then `92,011,729` bytes for the headless shell) but stalled indefinitely extracting the 238 MB `chrome.dll` at 0 bytes, twice across sessions, leaving `__dirlock` and one orphaned process tree. I stopped only the verified installer PIDs, removed only the partial `chromium-1148` directory and stale `__dirlock`, and extracted the already-completed official zips from `%TEMP%` with Windows `tar`. I then created Playwright's own `INSTALLATION_COMPLETE` marker in each browser directory. `npx playwright install --dry-run chromium` reports the expected install locations, `(Get-Item chrome.exe).VersionInfo.FileVersion` reports `131.0.6778.33`, and the real browser suite passes. No other browser directory was modified and no unpinned binary was substituted.

## Editor diagnostics reconciliation ("21 Problems" reported by the owner)

- The VS Code Problems panel **cannot be observed from this CLI session**. This is a stated limitation, not a claim that the panel is empty.
- The authoritative compiler here is the root `tsconfig.json` used by `npm run typecheck` (the same project a workspace VS Code instance loads): **0 diagnostics**. Running with `--noUnusedLocals --noUnusedParameters` (the common extra editor hints) was **0 diagnostics after cleanup**.
- At session start the compiler had exactly **1** diagnostic (the half-finished `MAX_SESSION_SECONDS` import in a test), now resolved; 2 genuine unused-symbol hints were also removed. No diagnostic was suppressed, downgraded or ignored to reduce the count.
- The owner's 21 entries were not reproducible from this session. They were most likely from the earlier broken tree that Codex did not see (2 failing tests / typecheck error plus transient missing-module errors during B5), but I cannot verify their messages or severity; no claim is made that all 21 are cleared. If any remain, they may be stale editor state or non-TypeScript diagnostics (for example markdown lint), which `tsc` cannot observe.

## Disposition of the Codex build-check findings

1. **Page startup not connected to the real SDK — addressed.** `main.tsx` now registers `createNuanceConversation` from the pinned package; `App.tsx` resolves it lazily through `createSdkAdapter`; `entryPath.test.tsx` renders the real entry path with no injection and proves a nonblank page and no SDK load before Start; the browser suite renders the real page. Not proven: a live SDK conversation (see blockers).
2. **One-mint-per-explicit-Start contract — addressed end to end.** Production `requestToken` is the shared `HttpTokenAdapter`; it bootstraps once, presents the server-issued `attemptId` on any repeat, and dedupes in flight. `startFlow.integration.test.ts` crosses the real browser adapter, real connection wrapper and real Express app with only the provider HTTP call faked: 1 provider call per Start, 1 token POST per Start, identity reuse, deadline behaviour, Stop→Start, and stable active state past token expiry. B8/B9 add the stale/closed-Start cases.
3. **Browser verification — completed.** Matching Chromium installed (method above); full suite 26/26 passing with provider access disabled. Environment recovery is kept separate from application assertions; the first real run exposed two genuine application/config defects (B11), now fixed.
4. **Missing artifacts — completed.** `scripts/verify-secrets.mjs` + tests, `docs/adr/ADR-001-mira-spike-attempt-identity-and-sdk-adapter.md`, and this report now exist.

## Remaining blockers / limitations (must not be read as passing tests)

- **Live Nuance conversation is not verified.** No live browser conversation has been run by the builder; a live smoke test needs real credentials and the owner's explicit go-ahead, and must be recorded separately with what the owner observed. The automated suites never contact the provider.
- **Independent testing and review.** Codex retested the earlier fixes, then reproduced three actual Claude findings on `0134750` and returned CHANGES REQUIRED. These fixes are stopped for a fresh Codex retest and follow-up Claude verification. Claude review has occurred once and did not approve; the owner has not approved merge. This report does not replace those gates.
- **The live audiovisual exchange is still unverified.** B12/B14 prove the page wires remote tracks into labelled media elements and can wrap the real pre-connect SDK safely; they do not prove actual provider playback in a browser, microphone permission denial against the real SDK, live capacity behaviour or a completed conversation. Those need the owner-authorized live smoke test, which this round did not start.
- **No rate limiting / single local session.** The `attemptId`/CSRF design is a bounded local prototype control, not a multi-user or hosted defence. Lifecycle `started`/`stop` reports are authenticated only by session cookie + CSRF and affect only that session; revisit before shared/hosted use (ADR-001 D5).
- **Browser timer is courtesy only.** The visible 60 s timer starts when connecting begins and calls Stop; the provider-enforced `maxSessionSeconds` is the conversation cap. A user who spends >60 s at the permission prompt is stopped early and can Start again.
- **SDK contract details** (`avatar` readiness before/after connect, `tracks-changed`, `avatar-presented`, `session-ended`, `max_session_seconds` at conversation start) are pinned to `0.40.0` in `sdk.ts`; re-check before any SDK upgrade.
- **`.env` handling.** The real `.env` was never read into model context or printed. Server code loads it programmatically; tests use synthetic `nk_test_…` / `st_test_…` values.
- **Browser install deviation** is recorded above; the artifact is the exact pinned official build, but the installer itself did not complete on this machine.

## Files added for this story

`package.json` scripts/deps, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `apps/server/src/{main.ts,app.ts,config.ts}`, `apps/server/src/avatar/{attemptRegistry,sessionGuard,nuanceGateway}.ts` (+ tests), `apps/web/**` (App, entry, avatar adapter/connection/token adapter/sdk contract integration + tests), `tests/e2e/avatar.spec.ts`, `scripts/verify-secrets.mjs` (+ tests), `docs/adr/ADR-001-…md`, the Codex/Claude evidence reports, and this evidence file. `.vscode/` is local owner tooling and remains untracked; `.env`, `dist/`, `test-results/`, `node_modules/`, `.setup/` are ignored.

## Stop point

The three Claude-triage behaviours are fixed with observed RED→GREEN tests; all five unchanged Codex probes pass, and local verification is green. No live session, merge, push or deployment was performed, and no live credentials were used. Stopping for a fresh Codex retest and follow-up Claude verification, then owner merge approval.
