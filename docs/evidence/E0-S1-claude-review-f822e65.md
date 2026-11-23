# Actual Claude foundation review — November 23, 2026

Commit f822e659484af11950c3463529b0693545d29fda. Actual model: claude-sonnet-5-5. First-party authenticated Claude Code; read-only restricted tools; successful exit 0, no permission denials. No application edits, command execution or live provider session. Codex independently reproduced F1/F2; see E0-S1-codex-independent-testing-f822e65.md. Owner merge approval remains pending.

---

# E0-S1 foundation review (commit f822e65)

I read the files you listed and Codex's probe file. I ran no commands or tests, so everything below comes from source reading. The foundation is **not ready for owner merge consideration as it stands**. It needs two small fixes first, and neither is a P0 or P1.

## Findings

### F1 · P2 · An unresponsive health request leaves the landing on "Checking" with no Retry
- **Where:** `apps/web/src/api/health.ts:21-27` and `apps/web/src/foundation/FoundationLanding.tsx:29-43`. The fetch has no `AbortSignal` or timeout. The landing only reaches `unavailable` when the promise rejects. Retry renders only when `status === 'unavailable'` (line 60).
- **Trigger:** The API accepts the connection but never answers, or sends headers and then stalls the body, so `response.json()` never settles. A dead API is not affected, because the Vite proxy returns an error quickly and that path is covered.
- **Impact:** The page never claims ready, so it fails honestly. But it offers no recovery for a stalled API, which is the case a status check exists to catch. It conflicts with AC5, which says API failure "presents an actionable retry state".
- **Classification:** I confirm it as a real defect on source analysis. The spec's LANDING_UNAVAILABLE row lists "rejects, non-200, non-JSON, wrong shape" and omits a hang, so it is a gap in the approved matrix and not a violation of its literal text. It is not a P1 because nothing is overstated. I recommend fixing it in this branch because the fix is small.
- **Bounded fix:**
  - In `fetchHealth`, add an `AbortController` with a timeout (an injectable constant, 5–10 s is plausible).
  - Keep the timer armed through `response.json()` and clear it in `finally`, so a body stall is also caught.
  - Pass `signal` to `fetch`, and abort on component unmount.
  - Leave the component unchanged. Its `active` guard already prevents stale updates.
- **Tests:**
  - Promote Codex's pending-fetch probe into `health.test.ts` and `FoundationLanding.test.tsx` using fake timers.
  - Add a case where the headers arrive and the body never resolves.
  - Add a Playwright case using `route` that never fulfils, then a recovery click.
  - The 60 s figure in the probe is only an observation ceiling and should not become the product timeout.

### F2 · P2 · Malformed or oversized JSON bodies get Express's default HTML stack-trace error
- **Where:** `apps/server/src/app.ts:54` mounts `express.json({limit:'1kb'})` before `mountHealthRoute` (line 58) and before the 404 handler (lines 200-203). There is no four-argument error middleware, and `NODE_ENV` is never set in `main.ts` or the dev scripts, so Express's default handler includes stack traces.
- **Trigger:** Any request with `Content-Type: application/json` and a malformed body, or a body over 1 kb. This includes `GET /api/health` and unknown paths, because body-parser runs before routing.
- **Impact:** The response is HTML with `SyntaxError` and local filesystem and `node_modules` paths. That contradicts "exactly safe health" (AC3), the spec rule "no secrets/paths/user data in responses" and its "no stack or filesystem detail" note. It also makes the generic-404 claim in ADR D3 and the threat model true only for well-formed requests. Practical exposure is low, since the service is loopback-only with no CORS and the leaked paths are the developer's own.
- **Classification:** This is a real defect in the foundation's own contract, and it is **pre-existing**. The body parser comes from the Mira prototype, and the Express 4.22.3 bump did not introduce it. The gap is that the foundation added the health route and the generic-404 claim but did not cover this path. It is not a P1 because loopback exposure is minimal.
- **Bounded fix:** Add a final `(err, req, res, next)` middleware after the 404 handler.
  - Map body-parser's `err.status` or `err.type` to `400 {error:'bad-request'}` and `413 {error:'payload-too-large'}`, and everything else to `500 {error:'internal'}`.
  - Set `Cache-Control: no-store`, return no message or stack, and log nothing from the body.
  - Check `res.headersSent` and call `next(err)` in that case.
  - I found no Mira tests that depend on the old behavior (no 400/413 matches under `apps`), but the avatar suites should be rerun to confirm.
- **Tests:**
  - Keep Codex's probe as the regression test.
  - Add `GET /api/health` with a malformed JSON body and an oversized body, expecting generic JSON with no `SyntaxError`, `node_modules` or cwd in the text.
  - Add a canary that the error handler never reads the provider key.

### F3 · P3 · Focus is lost when Retry is activated
`FoundationLanding.tsx:60-64` unmounts the button on click, so keyboard focus falls to `<body>`. Keep the button rendered but disabled while checking, or move focus to the status region. The e2e test (`foundation.spec.ts:66-70`) calls `retry.focus()` programmatically and never Tabs to it, so it does not exercise real keyboard order. Add a `Tab`-reaches-Retry assertion and a focus-after-retry assertion.

### F4 · P3 · The "no external or provider activity" browser test is narrower than the claim
`foundation.spec.ts:31-33` only flags absolute URLs outside the base origin. It would miss a same-origin request to `/api/avatar/*` or a loaded SDK module. Assert that the only `/api/` request is `/api/health` and that no request URL matches `avatar` or `nuance`. By source reading, `main.tsx` loads the SDK only on `/mira`, so this would pass today. It is a regression guard.

### F5 · P3 · Documents are slightly out of step
- Evidence, ADR D4 and README describe failure and retry coverage as complete, but they do not mention that a hang is untested. Update them after F1.
- Threat-model line 33 ("no stack traces in handled routes") is hedged and not false, but it should explicitly record F2 until fixed.
- The threat model and evidence header both say Claude review has not occurred, so they will need updating after this review. Do that as an owner or builder step.

## What checked out
- **Health output:** `health.routes.ts` returns a frozen constant with no request or config access, and sets `no-store`. The unknown-GET 404 is generic JSON.
- **Client validation:** `fetchHealth` uses a relative `/api/health` with `credentials: 'same-origin'`. It rejects non-2xx responses, unreadable JSON, and any body that is not exactly `status:'ok'` with `mode:'fictional-demo'`. An extra field such as `{status:'ok', mode:'fictional-demo', x:1}` would still be accepted. That is acceptable, because the server exact-match tests cover the server side.
- **No provider activity on `/`:** `main.tsx` dynamically imports `./App`, the SDK wrapper and `@nuancelabs/js-sdk` only on `/mira`. The landing issues one health request. Retry is not concurrent, and the `active` flag prevents stale updates.
- **Mobile and CSS:** The landing has a narrow-screen layout, visible focus outlines, `role="status"` with `aria-live`, and a full-width Retry button.
- **Documents:** The documents mark authentication, encryption, consent, legal verification, recovery and hosting as pending. They do not present these as working controls, and the fictional and incomplete-foundation copy matches the story exactly.
- **Express 4.22.3:** `package.json` pins it exactly. I did not independently verify the audit result.
- **Scope:** I saw no forms, accounts, SQLite, uploads or provider calls added by this change.

## Review limits
- I read source only. I did not run vitest, Playwright, typecheck, build or audit, and I did not view the page.
- I did not read `.env` or any credential files.
- I did not read the full diff (`git diff` is a command), so I judged unchanged Mira internals and the full `avatar.spec.ts` only from grep hits showing navigation to `/mira`.
- I made no screen-reader, visual or live-provider checks.
- I did not verify Express default-handler stack behavior by execution. I inferred it from the middleware order and Codex's failing probe.
- This is not a complete security review. No owner approval, merge or deployment has occurred.

## Recommendation
Do not merge until the owner has seen F1 and F2 resolved. Both are small: a timeout in the health client and an error-handling middleware. Each needs tests, a rerun of the API and unit suites plus Codex's two failing probes, and a short update to the evidence. F3–F5 can be fixed with them or tracked as P3. Neither fix is a redesign.
