---
title: 'V0-S1 Mira local connection prototype'
type: 'feature'
created: '2026-11-22'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/process/BMAD_STABLE_TDD.md'
baseline_commit: '96eb8998d3e60f81c668f656c7e1ae589712bb91'
---

<frozen-after-approval reason="human-owned intent â€” do not modify unless human renegotiates">

## Intent

**Problem:** The owner selected an avatar-first feasibility test (story `docs/stories/V0-S1-mira-connection-spike.md`), but no application code exists. Nothing yet proves that the chosen Nuance Mira persona can appear in a local Project Second Chance page, receive a short non-sensitive spoken greeting, reply, and end cleanly â€” with camera off, no key in the browser, and honest failure states.

**Approach:** Build one bounded local prototype: a loopback-only Express API that mints a short-lived Nuance session token with the server-held key, and a React/Vite/TypeScript page that starts the conversation only on an explicit click through a replaceable SDK wrapper. Camera disabled in both client media options and server session config. No forms, no legal records, no auto-retry.

## Boundaries & Constraints

**Always:** Server-held `NUANCE_API_KEY` loaded programmatically from the project-root `.env` at runtime; browser never receives it. Loopback-only binding and local Host/origin enforcement. Fixed `persona_id: mira` plus a fixed non-sensitive purpose prompt set server-side â€” never caller-supplied. `interface_setup.video.input.camera = false`. Visible AI disclosure, explicit microphone-start consent, and "no legal advice" labelling. Distinguishable connecting/ready/mic-denied/unavailable/stopped states; generic errors echoing no secret, token or raw provider body. `maxSessionSeconds: 60`, `stayConnectedOnEnd: false`, plus a visible 60s Stop timer. Preserve No False Hope: never render a simulated avatar as live success.

**Never:** Form processing, case data, registration, private documents, uploads, filing or sending. Legal advice or eligibility claims in the prompt. Real user records. Vite-prefixed secrets. Reading, quoting or copying the real `.env` into context, logs, tests, reports or bundles. Unbounded automatic retries or repeated credit-spending conversations. Deployment, push, merge, paid-plan change. Claiming Codex testing or Claude review occurred.

## Request-protection routes

Two routes, deliberately different rules â€” a single blanket Origin rule would break both.

- **Bootstrap `GET /api/avatar/bootstrap`** â€” accepts a normal same-origin browser GET, which usually sends **no `Origin` header**. Enforce instead: the request's `Host` must be on the loopback allowlist, reject a present-but-foreign `Origin`, add no permissive CORS header, and set `Cache-Control: no-store`. Issues an HttpOnly SameSite=Strict cookie plus a readable double-submit CSRF value.
- **Token `POST /api/avatar/session-token`** â€” strict: exact expected `Origin` (missing or foreign â†’ 403), matching CSRF cookie **and** header, POST only, `Cache-Control: no-store`. All checks run before any provider call.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Same-origin POST, loopback origin, valid CSRF, no active attempt | 200 `{ token }` only; provider called once with mira + camera false | `no-store` |
| BOOTSTRAP_GET | Normal same-origin GET, no `Origin` header | 200 CSRF material; loopback `Host` enforced | Foreign `Host` rejected |
| BOOTSTRAP_FOREIGN_ORIGIN | GET carrying a foreign `Origin` | 403 | No cookie issued |
| FOREIGN_ORIGIN_POST | POST `Origin` not the exact expected value | 403 before provider call | Generic JSON |
| MISSING_ORIGIN_POST | POST with no `Origin` | 403 before provider call | Generic JSON |
| WRONG_METHOD | `GET` on the token route | 405, no provider call | Generic JSON |
| NO_CSRF_COOKIE | POST without bootstrap cookie | 403 before provider call | Generic JSON |
| CSRF_MISMATCH | Cookie present, header absent/different | 403, no provider call | Constant-time compare |
| CSRF_LENGTH_MISMATCH | Header and cookie differ in length | 403 controlled rejection, no throw | Length guard before `timingSafeEqual` |
| CONCURRENT_START | Two POSTs, same session, attempt active | Second 409 before provider call | No second provider call |
| KEY_MISSING | `NUANCE_API_KEY` unset | 503 unavailable, no provider call | No env value echoed |
| PROVIDER_401 / 5xx / TIMEOUT | Provider rejects or hangs | 502 / 504 generic | No raw body, token or key logged |
| PROVIDER_MALFORMED | Provider 200 without usable `token` | 502 generic | Unknown fields never forwarded |
| SDK_TOKEN_RECALL | SDK invokes `token()` again after a successful mint, same `attemptId` | Refused before provider call | Fail-closed attempt guard |
| STALE_CALLBACK_AFTER_STOP | Consumed attempt already Stopped; delayed SDK callback arrives with old `attemptId` | Refused, no provider call; does not unlock anything | Old identity never reusable |
| STALE_CALLBACK_AFTER_FAILURE | Connect failed/timeout ended; delayed callback for old `attemptId` | Refused before provider call | Same |
| STALE_UNLOCK_NEWER | Old attempt's Stop/end/error fires after a newer Start is active | Newer attempt's lock and UI state untouched | Identity-scoped callbacks only |
| PENDING_ATTEMPT_EXPIRED | Clock passes `expires_at` on an unminted, unstarted attempt | That attempt refused; a new explicit Start gets a fresh identity | Fake clock |
| ACTIVE_CONVO_PAST_TOKEN_EXPIRY | Conversation running while its token's `expires_at` passes | Conversation **not** treated as ended; stays ready | Fake clock |
| FRESH_START_AFTER_CLOSURE | Previous lifecycle safely closed, user clicks Start | One new mint allowed with a new `attemptId` | Exactly one provider call |

</frozen-after-approval>

## Implementation Notes

Owner decisions recorded 2026-11-22: **Playwright = A** (real Chromium suite), **SDK pin = A** (exact `@nuancelabs/js-sdk@0.40.0`), **microphone handling = A** (SDK `MediaAccessError`, classifying on both `device` and `reason`). Git initialization in this exact folder on `feature/v0-s1-mira-spike` authorized; no push, no merge. Refinements from `docs/evidence/V0-S1-planning-check-codex.md` are folded into the matrix, boundaries, tasks and change log.

**Attempt-lifetime rule.** The pinned SDK retries capacity starts internally and calls `token()` again on each try; `0.40.0` exposes **no** option to disable that. The server therefore enforces a single-use attempt guard, with attempt **identity** (how a delayed callback is told apart from a fresh click) and token-expiry semantics fixed as follows.

1. **Attempt identity.** Each explicit user Start creates a new opaque `attemptId` bound to the local browser session, minted by the server at bootstrap/Start â€” never invented inside the SDK `token` callback. The wrapper captures that one `attemptId` and reuses it for every `token()` callback in that connection attempt. A callback never mints a new identity, and an SDK-internal retry reuses the same one.
2. **Consumed is terminal.** Once a mint succeeds for an `attemptId`, every later callback for that same `attemptId` is rejected *before* provider contact â€” permanently, including after Stop, connect failure, timeout, token expiry or session end. Releasing active-session resources never makes a consumed identity usable again. Expired or closed sessions never resurrect an old identity.
3. **Fresh Start only through a new identity.** A genuine new Start mints a new `attemptId` and may proceed once the previous lifecycle is safely closed. A stale Stop/end/error callback belonging to an older `attemptId` must not clear a newer attempt's lock, and must not change the newer attempt's UI state.
4. **Expiry scope.** `expires_at` bounds only whether an *unused* token can still start a conversation; once a conversation has started it does not end it. Token-start expiry is therefore applied to a still-pending/unstarted attempt only, and is never treated as proof that an active conversation finished. The 60 s conversation limit (`maxSessionSeconds`) and Stop/cleanup behaviour are separate controls.
5. **Deterministic clock/provider tests** are required for all of the above (see matrix rows below and the task list), alongside the ordinary repeated/concurrent-start tests.

Attempts are released as follows: a *pending* (unminted, unstarted) attempt expires at `expires_at`; a *consumed* attempt stays refused forever for its identity while its session resource is freed on Stop, failed connect, timeout, `session-ended` and unmount. Server-enforced: one mint per attempt identity, 60 s token-start lifetime. Client-controlled: the visible Stop timer. `maxSessionSeconds: 60` is server-enforced conversation duration. The browser timer alone is **not** a guaranteed spending cap.

## Code Map

Workspace `<repo>`. Greenfield for application code: no `package.json`, `apps/`, `src/` or tests exist yet.

- `AGENTS.md` â€” binding roles, `.env` rule, scope. Do not modify.
- `docs/stories/V0-S1-mira-connection-spike.md` â€” 8 acceptance criteria; scope authority. Do not modify.
- `docs/evidence/V0-S1-planning-check-codex.md` â€” Codex planning findings addressed here. Do not modify.
- `docs/process/BMAD_STABLE_TDD.md` â€” REDâ†’GREENâ†’refactor requirements.
- `docs/planning/RISK_REGISTER.md` â€” R05/07/08/09/10/15/16/20/21/23/24/25 plus prototype risks.
- `docs/evidence/STORY_EVIDENCE_TEMPLATE.md` â€” evidence shape.
- `.setup/check_nuance.py` â€” read-only reference for provider contract and sanitised-error style. Do not modify or run.
- `.env` â€” **exists; must never be read**. Loaded via `dotenv` from an explicit project-root path.
- `.gitignore` â€” already ignores `.env`, `node_modules`, `dist`, `runtime`. Preserve.
- `_bmad/`, `.agents/`, `.continue/` â€” installed BMAD 6.12.4 toolchain. Do not modify.

**Verified external facts (2026-11-22; docs.nuancelabs.ai, npm, and unpacked `0.40.0` types â€” not recalled):**
- `POST https://api.nuancelabs.ai/session-tokens` â€” `Authorization: Bearer nk_â€¦`; body `{ personality: { persona_id, system_prompt }, interface_setup: { video: { input: { camera: false } } }, end_user_id }`; success `{ token, expires_at, warnings }`. Token `st_â€¦` starts one conversation within 60 s; one conversation per token.
- Client API from the package's own `index.d.ts`: `createNuanceConversation({ token: () => Promise<string>, mediaDevices: { cameraEnabled: false }, maxSessionSeconds, stayConnectedOnEnd, startOn })`; `connect()`, `disconnect()`; `ConversationState` `idle|queued|connecting|connected|disconnected|failed`; events `avatar-presented`, `session-ended`, `tracks-changed`, `state-changed`.
- `MediaAccessError` exposes `readonly device: "camera" | "microphone" | "unknown"` **and** `readonly reason: "permission-denied" | "device-not-found" | "device-in-use" | "unknown"`. Its `message` is developer-facing and must not be shown to users.
- **No SDK option disables the internal capacity retry.** `ConversationState.Queued` documents that the SDK "tries again on its own", and each try calls `token()` again â€” hence the server-side attempt guard above.
- `@nuancelabs/js-sdk@0.40.0` confirmed on npm (`npm pack` succeeded; 8 files). Exact pin required.
- Provider disclosures: Terms https://app.nuancelabs.ai/terms ; Acceptable Use Policy https://app.nuancelabs.ai/acceptable-use ; Developer Agreement https://app.nuancelabs.ai/developer-terms ; **Privacy Policy https://app.nuancelabs.ai/privacy** â€” states that call/video recordings, audiovisual data and biometric data may be collected and used, including for model training absent account choices. Do **not** claim audio is unrecorded. This app not persisting transcripts is a separate fact from provider retention.
- Duration/spend: `max_session_seconds` is server-enforced up to the account maximum. A start spends a credit; `start_limit` (429) bounds starts per hour. The visible timer is not a spending guarantee.

## Tasks & Acceptance

TDD order is explicit: scaffold/config first (permitted), then for each behaviour **write the test â†’ observe RED â†’ minimal GREEN â†’ refactor**, module by module. Tests precede the behaviour they cover, in the order listed.

**Execution:**
- [ ] `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `playwright.config.ts` â€” scaffold, scripts, pinned deps â€” enables RED runs.
- [ ] `scripts/verify-secrets.mjs` + `.gitignore` review â€” prove `.env`, `.setup/`, `runtime/`, key files are ignored **before** any commit.
- [ ] `apps/server/src/config.ts` (+ test) â€” resolve project-root `.env` via `dotenv` from an explicit absolute path, independent of CWD; expose presence/absence only; synthetic fixtures in tests.
- [ ] `apps/server/src/avatar/localSession.ts` (+ tests) â€” loopback allowlist, bootstrap cookie/CSRF issue+verify with length guard before `timingSafeEqual`, single-use attempt guard keyed by `attemptId` implementing the identity, terminal-consumption and expiry-scope rules above, with fake-clock tests for every attempt row in the matrix.
- [ ] `apps/server/src/avatar/nuanceGateway.ts` (+ tests) â€” fixed mira persona + camera false, `AbortSignal` timeout, sanitised failure contract, malformed-response handling.
- [ ] `apps/server/src/avatar/routes.ts`, `app.ts`, `main.ts` (+ tests) â€” route-specific protections; 127.0.0.1 binding.
- [ ] `apps/web/src/avatar/connection.ts` (+ tests) â€” `cameraEnabled: false`, `maxSessionSeconds: 60`, `stayConnectedOnEnd: false`, captures one server-issued `attemptId` per explicit Start and reuses it for every `token()` callback, explicit connect/disconnect, media release on Stop/end/unmount, `MediaAccessError` classification by `device` + `reason`, no app-level retry, and stale callbacks from an old identity cannot alter a newer attempt's UI state.
- [ ] `apps/web/src/App.tsx`, `styles.css` (+ tests) â€” disclosure, terms + privacy links, Start/Stop, 60 s timer, accessible states, narrow viewport.
- [ ] `tests/e2e/*.spec.ts` â€” Playwright Chromium: bootstrapâ†’token happy path, foreign/missing-Origin POST rejection, no-Start/no-media state, keyboard operation, narrow viewport, Stop cleanup.
- [ ] `docs/adr/avatar-connection-prototype.md` â€” versions, request protection, attempt lifetime, duration, privacy/recording terms, storage decisions.
- [ ] `docs/evidence/V0-S1-builder.md` â€” filled from the template with observed evidence.

**Acceptance Criteria (all eight story criteria preserved):**
- AC1 â€” Given the prototype runs, when started, then React and Express bind loopback only, and the page states Project Second Chance, that Mira is an AI connection prototype, and that it gives no legal advice, with no case/form/upload/send capability.
- AC2 â€” Given the page is opened, then no conversation, microphone or camera starts; Start explains microphone audio is sent to Nuance, links provider terms **and** the privacy/recording disclosure, and the text explanation is usable without starting a call; no unrecorded-processing promise is made.
- AC3 â€” Given explicit Start with loopback origin and CSRF, then the server mints a short-lived token with fixed mira and camera false, the browser receives no API key, and the user alone controls the permission prompt.
- AC4 â€” Given a foreign origin, unsupported method, absent request protection, or a repeated/concurrent Start, then the request is rejected **without calling the provider**, proven with fixtures.
- AC5 â€” Given a missing key, provider failure or timeout, then a recoverable generic error appears with no secret, token or raw provider body, and connecting/ready/mic-denied/unavailable/stopped states are distinguishable; no simulated avatar is shown as live success.
- AC6 â€” Given the SDK reports the avatar presented, then a brief non-sensitive greeting exchange works, controls are keyboard accessible on a narrow viewport, and output is labelled AI; nothing is saved by this application.
- AC7 â€” Given Stop, navigation away, or an SDK-ended session, then the connection module disconnects and releases local media, the 60 s timer also calls Stop, and no automatic retry or repeated credit-spending conversation occurs.
- AC8 â€” Given the story is implemented, then builder evidence records observed REDâ†’minimal GREENâ†’refactor/regression for each behaviour, dependency versions, safety limits and known gaps; tests use fake keys and fake provider responses; a live browser smoke test is recorded separately with what the owner observed, and unrun or unavailable hardware is not reported as passing.

## Spec Change Log

- **2026-11-22 â€” Codex revised-check attempt-identity clarification (owner-directed).** Triggered by `docs/evidence/V0-S1-revised-planning-check-codex.md`. Replaced the vague "release on Stop/expiry" wording with a server-issued `attemptId` per explicit Start, reused by every `token()` callback; consumption is terminal for that identity forever; stale callbacks cannot unlock a newer attempt; and `expires_at` applies only to starting an unused token, never as proof a running conversation ended. Verified against the pinned package's `SessionTokenResponse`: `expires_at` is documented as "when the token stops being able to **start** a conversation". Added matrix rows `STALE_CALLBACK_AFTER_STOP`, `STALE_CALLBACK_AFTER_FAILURE`, `STALE_UNLOCK_NEWER`, `PENDING_ATTEMPT_EXPIRED`, `ACTIVE_CONVO_PAST_TOKEN_EXPIRY`, `FRESH_START_AFTER_CLOSURE` plus fake-clock tests. Known-bad state avoided: deleting a single-use flag on release would let an SDK retry mint a second token, defeating one-mint-per-Start. KEEP: simple local prototype, no accounts/quotas/public service, Playwright retained in-story.

- **2026-11-22 â€” Codex planning-check refinements (owner-directed).** Triggered by `docs/evidence/V0-S1-planning-check-codex.md`. (1) Split bootstrap `GET` vs token `POST` protections â€” a blanket missing-`Origin` rejection would have broken the real browser bootstrap. (2) Added the `SDK_TOKEN_RECALL` row and attempt-lifetime rules; verified from the pinned package's own typings that **no** option disables its internal capacity retry, so the bound is enforced fail-closed at the token boundary. Added `maxSessionSeconds: 60` and `stayConnectedOnEnd: false`, and recorded what is server-enforced vs client-controlled. (3) Restored the eighth acceptance criterion and reordered tasks so tests precede behaviour. (4) Added CWD-independent `.env` loading, `no-store` on token/bootstrap responses, and the **Privacy Policy** link plus an explicit do-not-claim-unrecorded instruction. (5) Corrected `created` to the owner's local date 2026-11-22 (host clock read -05:00/Eastern). Known-bad states avoided: broken bootstrap, unenforced retry/credit policy, dropped AC8, wrong secret path, invented recording claims. KEEP: loopback-only, fixed mira, camera-off in both layers, No False Hope labelling, claim-no-reviews rule.

## Review Triage Log

## Verification

**Commands:**
- `npm test` â€” unit/integration suites pass.
- `npm run test:e2e` â€” Playwright Chromium suite passes.
- `npm run typecheck` â€” `tsc --noEmit` clean.
- `npm run build` â€” production build succeeds.
- `npm run verify:secrets` â€” staged/ignored file check shows no `.env`, key or runtime data.
- Manual: start dev, open `http://127.0.0.1:5173`; confirm disclosure before any Start. A live Nuance conversation needs real credentials and is recorded separately as observed or unrun.

## Open Questions

_None remaining â€” the three checkpoint choices are resolved by the owner (A/A/A) in Implementation Notes._

