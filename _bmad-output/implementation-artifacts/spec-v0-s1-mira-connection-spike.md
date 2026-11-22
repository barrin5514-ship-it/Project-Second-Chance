---
title: 'V0-S1 Mira local connection prototype'
type: 'feature'
created: '2026-11-22'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/process/BMAD_STABLE_TDD.md'
baseline_commit: '96eb8998d3e60f81c668f656c7e1ae589712bb91'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The owner selected an avatar-first feasibility test (story `docs/stories/V0-S1-mira-connection-spike.md`), but no application code exists. Nothing yet proves that the chosen Nuance Mira persona can appear in a local Project Second Chance page, receive a short non-sensitive spoken greeting, reply, and end cleanly — with camera off, no key in the browser, and honest failure states.

**Approach:** Build one bounded local prototype: a loopback-only Express API that mints a short-lived Nuance session token with the server-held key, and a React/Vite/TypeScript page that starts the conversation only on an explicit click through a replaceable SDK wrapper. Camera disabled in both client media options and server session config. No forms, no legal records, no auto-retry.

## Boundaries & Constraints

**Always:** Server-held `NUANCE_API_KEY` loaded programmatically from the project-root `.env` at runtime; browser never receives it. Loopback-only binding and local Host/origin enforcement. Fixed `persona_id: mira` plus a fixed non-sensitive purpose prompt set server-side — never caller-supplied. `interface_setup.video.input.camera = false`. Visible AI disclosure, explicit microphone-start consent, and "no legal advice" labelling. Distinguishable connecting/ready/mic-denied/unavailable/stopped states; generic errors echoing no secret, token or raw provider body. `maxSessionSeconds: 60`, `stayConnectedOnEnd: false`, plus a visible 60s Stop timer. Preserve No False Hope: never render a simulated avatar as live success.

**Never:** Form processing, case data, registration, private documents, uploads, filing or sending. Legal advice or eligibility claims in the prompt. Real user records. Vite-prefixed secrets. Reading, quoting or copying the real `.env` into context, logs, tests, reports or bundles. Unbounded automatic retries or repeated credit-spending conversations. Deployment, push, merge, paid-plan change. Claiming Codex testing or Claude review occurred.

## Request-protection routes

Two routes, deliberately different rules — a single blanket Origin rule would break both.

- **Bootstrap `GET /api/avatar/bootstrap`** — accepts a normal same-origin browser GET, which usually sends **no `Origin` header**. Enforce instead: the request's `Host` must be on the loopback allowlist, reject a present-but-foreign `Origin`, add no permissive CORS header, and set `Cache-Control: no-store`. Issues an HttpOnly SameSite=Strict cookie plus a readable double-submit CSRF value.
- **Token `POST /api/avatar/session-token`** — strict: exact expected `Origin` (missing or foreign → 403), matching CSRF cookie **and** header, POST only, `Cache-Control: no-store`. All checks run before any provider call.

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
| SDK_TOKEN_RECALL | SDK invokes `token()` again after a successful mint | Second mint refused before provider call | Fail-closed attempt guard |

</frozen-after-approval>

## Implementation Notes

Owner decisions recorded 2026-11-22: **Playwright = A** (real Chromium suite), **SDK pin = A** (exact `@nuancelabs/js-sdk@0.40.0`), **microphone handling = A** (SDK `MediaAccessError`, classifying on both `device` and `reason`). Git initialization in this exact folder on `feature/v0-s1-mira-spike` authorized; no push, no merge. Refinements from `docs/evidence/V0-S1-planning-check-codex.md` are folded into the matrix, boundaries, tasks and change log.

**Attempt-lifetime rule (new).** The pinned SDK retries capacity starts internally and calls `token()` again on each try; `0.40.0` exposes **no** option to disable that. The server therefore holds a single-use attempt record per browser session: a successful mint marks the attempt consumed and any further `token()` call for that attempt is refused *before* contacting the provider. The attempt is released on explicit Stop, failed connect, timeout, token expiry (`expires_at`, 60 s) and ended session, so a genuine new Start can mint again but an SDK-driven retry cannot. Server-enforced: one mint per attempt, 60 s token lifetime. Client-controlled: the visible Stop timer. `maxSessionSeconds: 60` is server-enforced duration. The browser timer alone is **not** a guaranteed spending cap.

## Code Map

Workspace `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance`. Greenfield for application code: no `package.json`, `apps/`, `src/` or tests exist yet.

- `AGENTS.md` — binding roles, `.env` rule, scope. Do not modify.
- `docs/stories/V0-S1-mira-connection-spike.md` — 8 acceptance criteria; scope authority. Do not modify.
- `docs/evidence/V0-S1-planning-check-codex.md` — Codex planning findings addressed here. Do not modify.
- `docs/process/BMAD_STABLE_TDD.md` — RED→GREEN→refactor requirements.
- `docs/planning/RISK_REGISTER.md` — R05/07/08/09/10/15/16/20/21/23/24/25 plus prototype risks.
- `docs/evidence/STORY_EVIDENCE_TEMPLATE.md` — evidence shape.
- `.setup/check_nuance.py` — read-only reference for provider contract and sanitised-error style. Do not modify or run.
- `.env` — **exists; must never be read**. Loaded via `dotenv` from an explicit project-root path.
- `.gitignore` — already ignores `.env`, `node_modules`, `dist`, `runtime`. Preserve.
- `_bmad/`, `.agents/`, `.continue/` — installed BMAD 6.12.4 toolchain. Do not modify.

**Verified external facts (2026-11-22; docs.nuancelabs.ai, npm, and unpacked `0.40.0` types — not recalled):**
- `POST https://api.nuancelabs.ai/session-tokens` — `Authorization: Bearer nk_…`; body `{ personality: { persona_id, system_prompt }, interface_setup: { video: { input: { camera: false } } }, end_user_id }`; success `{ token, expires_at, warnings }`. Token `st_…` starts one conversation within 60 s; one conversation per token.
- Client API from the package's own `index.d.ts`: `createNuanceConversation({ token: () => Promise<string>, mediaDevices: { cameraEnabled: false }, maxSessionSeconds, stayConnectedOnEnd, startOn })`; `connect()`, `disconnect()`; `ConversationState` `idle|queued|connecting|connected|disconnected|failed`; events `avatar-presented`, `session-ended`, `tracks-changed`, `state-changed`.
- `MediaAccessError` exposes `readonly device: "camera" | "microphone" | "unknown"` **and** `readonly reason: "permission-denied" | "device-not-found" | "device-in-use" | "unknown"`. Its `message` is developer-facing and must not be shown to users.
- **No SDK option disables the internal capacity retry.** `ConversationState.Queued` documents that the SDK "tries again on its own", and each try calls `token()` again — hence the server-side attempt guard above.
- `@nuancelabs/js-sdk@0.40.0` confirmed on npm (`npm pack` succeeded; 8 files). Exact pin required.
- Provider disclosures: Terms https://app.nuancelabs.ai/terms ; Acceptable Use Policy https://app.nuancelabs.ai/acceptable-use ; Developer Agreement https://app.nuancelabs.ai/developer-terms ; **Privacy Policy https://app.nuancelabs.ai/privacy** — states that call/video recordings, audiovisual data and biometric data may be collected and used, including for model training absent account choices. Do **not** claim audio is unrecorded. This app not persisting transcripts is a separate fact from provider retention.
- Duration/spend: `max_session_seconds` is server-enforced up to the account maximum. A start spends a credit; `start_limit` (429) bounds starts per hour. The visible timer is not a spending guarantee.

## Tasks & Acceptance

TDD order is explicit: scaffold/config first (permitted), then for each behaviour **write the test → observe RED → minimal GREEN → refactor**, module by module. Tests precede the behaviour they cover, in the order listed.

**Execution:**
- [ ] `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `playwright.config.ts` — scaffold, scripts, pinned deps — enables RED runs.
- [ ] `scripts/verify-secrets.mjs` + `.gitignore` review — prove `.env`, `.setup/`, `runtime/`, key files are ignored **before** any commit.
- [ ] `apps/server/src/config.ts` (+ test) — resolve project-root `.env` via `dotenv` from an explicit absolute path, independent of CWD; expose presence/absence only; synthetic fixtures in tests.
- [ ] `apps/server/src/avatar/localSession.ts` (+ tests) — loopback allowlist, bootstrap cookie/CSRF issue+verify with length guard before `timingSafeEqual`, single-use attempt guard with the release rules above.
- [ ] `apps/server/src/avatar/nuanceGateway.ts` (+ tests) — fixed mira persona + camera false, `AbortSignal` timeout, sanitised failure contract, malformed-response handling.
- [ ] `apps/server/src/avatar/routes.ts`, `app.ts`, `main.ts` (+ tests) — route-specific protections; 127.0.0.1 binding.
- [ ] `apps/web/src/avatar/connection.ts` (+ tests) — `cameraEnabled: false`, `maxSessionSeconds: 60`, `stayConnectedOnEnd: false`, explicit connect/disconnect, media release on Stop/end/unmount, `MediaAccessError` classification by `device` + `reason`, no app-level retry, late events after cancel ignored.
- [ ] `apps/web/src/App.tsx`, `styles.css` (+ tests) — disclosure, terms + privacy links, Start/Stop, 60 s timer, accessible states, narrow viewport.
- [ ] `tests/e2e/*.spec.ts` — Playwright Chromium: bootstrap→token happy path, foreign/missing-Origin POST rejection, no-Start/no-media state, keyboard operation, narrow viewport, Stop cleanup.
- [ ] `docs/adr/avatar-connection-prototype.md` — versions, request protection, attempt lifetime, duration, privacy/recording terms, storage decisions.
- [ ] `docs/evidence/V0-S1-builder.md` — filled from the template with observed evidence.

**Acceptance Criteria (all eight story criteria preserved):**
- AC1 — Given the prototype runs, when started, then React and Express bind loopback only, and the page states Project Second Chance, that Mira is an AI connection prototype, and that it gives no legal advice, with no case/form/upload/send capability.
- AC2 — Given the page is opened, then no conversation, microphone or camera starts; Start explains microphone audio is sent to Nuance, links provider terms **and** the privacy/recording disclosure, and the text explanation is usable without starting a call; no unrecorded-processing promise is made.
- AC3 — Given explicit Start with loopback origin and CSRF, then the server mints a short-lived token with fixed mira and camera false, the browser receives no API key, and the user alone controls the permission prompt.
- AC4 — Given a foreign origin, unsupported method, absent request protection, or a repeated/concurrent Start, then the request is rejected **without calling the provider**, proven with fixtures.
- AC5 — Given a missing key, provider failure or timeout, then a recoverable generic error appears with no secret, token or raw provider body, and connecting/ready/mic-denied/unavailable/stopped states are distinguishable; no simulated avatar is shown as live success.
- AC6 — Given the SDK reports the avatar presented, then a brief non-sensitive greeting exchange works, controls are keyboard accessible on a narrow viewport, and output is labelled AI; nothing is saved by this application.
- AC7 — Given Stop, navigation away, or an SDK-ended session, then the connection module disconnects and releases local media, the 60 s timer also calls Stop, and no automatic retry or repeated credit-spending conversation occurs.
- AC8 — Given the story is implemented, then builder evidence records observed RED→minimal GREEN→refactor/regression for each behaviour, dependency versions, safety limits and known gaps; tests use fake keys and fake provider responses; a live browser smoke test is recorded separately with what the owner observed, and unrun or unavailable hardware is not reported as passing.

## Spec Change Log

- **2026-11-22 — Codex planning-check refinements (owner-directed).** Triggered by `docs/evidence/V0-S1-planning-check-codex.md`. (1) Split bootstrap `GET` vs token `POST` protections — a blanket missing-`Origin` rejection would have broken the real browser bootstrap. (2) Added the `SDK_TOKEN_RECALL` row and attempt-lifetime rules; verified from the pinned package's own typings that **no** option disables its internal capacity retry, so the bound is enforced fail-closed at the token boundary. Added `maxSessionSeconds: 60` and `stayConnectedOnEnd: false`, and recorded what is server-enforced vs client-controlled. (3) Restored the eighth acceptance criterion and reordered tasks so tests precede behaviour. (4) Added CWD-independent `.env` loading, `no-store` on token/bootstrap responses, and the **Privacy Policy** link plus an explicit do-not-claim-unrecorded instruction. (5) Corrected `created` to the owner's local date 2026-11-22 (host clock read -05:00/Eastern). Known-bad states avoided: broken bootstrap, unenforced retry/credit policy, dropped AC8, wrong secret path, invented recording claims. KEEP: loopback-only, fixed mira, camera-off in both layers, No False Hope labelling, claim-no-reviews rule.

## Review Triage Log

## Verification

**Commands:**
- `npm test` — unit/integration suites pass.
- `npm run test:e2e` — Playwright Chromium suite passes.
- `npm run typecheck` — `tsc --noEmit` clean.
- `npm run build` — production build succeeds.
- `npm run verify:secrets` — staged/ignored file check shows no `.env`, key or runtime data.
- Manual: start dev, open `http://127.0.0.1:5173`; confirm disclosure before any Start. A live Nuance conversation needs real credentials and is recorded separately as observed or unrun.

## Open Questions

_None remaining — the three checkpoint choices are resolved by the owner (A/A/A) in Implementation Notes._

