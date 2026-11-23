# V0-S1 independent testing — Codex — November 23, 2026

**Disposition: CHANGES REQUIRED. Independent acceptance has not passed.**

Reviewed saved commit `8b2fd4096ebd71bd098d9649fc5257768775d9cb` on `feature/v0-s1-mira-spike`. Initial worktree: only owner-local `.vscode/` untracked. Codex did not change application code, commit, merge, push, deploy, start a real Nuance conversation or inspect the real `.env`. The installer jobs in the builder message were not restarted or modified. DeepSeek remains the builder; Claude review and owner merge approval have not occurred.

## Fresh verification

| Check | Actual result |
| --- | --- |
| `npm test` | Exit 1: **140 passed, 1 failed**, 11 files, 16.83 s. Failure: `startFlow.integration.test.ts` — fresh explicit Start immediately after clean Stop. |
| `npx vitest run apps/web/src/avatar/startFlow.integration.test.ts` | Exit 1: **5 passed, 1 failed**, 6.82 s; same failure reproduced in isolation. |
| `npm run typecheck` | Exit 0; command chain proceeded to build. |
| `npm run build` | Exit 0; 3.58 s; SDK-containing bundle 817.77 kB, with informational large-chunk warning. |
| `npm run verify:secrets` | Exit 0; tracked-source pattern scan clean. This is not a comprehensive security proof. |
| `npm run test:secrets` | Exit 0: **7 passed**. |
| `npm run test:e2e` | Exit 1: **25 passed, 1 timed out**; desktop no-media-on-load case timed out in `page.goto`, before its assertion. |
| `npm run test:e2e -- --project=chromium --grep 'starts no microphone'` | Exit 0: isolated case **1 passed**, 11.2 s. Full-suite green has not been independently reproduced. Record the timeout as a verification reliability concern, not evidence that microphone capture occurred. |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | Exit 1: **2 independent acceptance probes failed**, 4.25 s, for the two findings below. |

The independent probes and configuration are local ignored files at `.setup/codex-mira-independent.test.tsx` and `.setup/vitest.codex-review.config.ts`. They exercise actual application modules, with a synthetic SDK/media fixture and a real Express app using only fake provider HTTP responses. No provider credits or physical microphone/camera were used. Copy/adapt them into the maintained test tree when fixing the behavior; do not merely edit the independent expectations to obtain green.

## P1 — No output media is wired to the page (AC6)

`apps/web/src/App.tsx` renders only a text paragraph inside the connected section (around lines 244–249). There are no audio/video output elements. `apps/web/src/avatar/sdk.ts` maps lifecycle events but exposes neither `conversation.avatar.videoTrack` nor `audioTrack`; it never attaches tracks or forwards `tracks-changed`.

The pinned local `@nuancelabs/js-sdk@0.40.0/index.d.ts` documents those remote tracks and their `attach`/`detach` methods. Its factory example attaches the video on `tracks-changed` (around lines 498–500). Importing/connecting the SDK is not enough to display and play its media in the app.

Independent reproduction: register an SDK-shaped synthetic conversation with remote audio/video tracks, render the real App using the real adapter, press Start, and emit `tracks-changed`, `avatar-ready`, and `avatar-presented`. The page reports Connected, but there are no media elements and neither track's attach function is called. This test fails four assertions. AC6's goal—see Mira and hear her reply—cannot be accepted from this implementation. No live test was needed to demonstrate the missing wiring.

**Builder follow-up:** implement remote output attachment behind the replaceable adapter and an accessible page surface; handle tracks arriving/changing and detach/cleanup on Stop, end and unmount. Add real behavior tests of that path, not just a fake lifecycle event changing a status string. Preserve no local camera and no media before explicit consent. Do not represent the Connected text alone as a verified audiovisual interaction.

## P1 — Stop resets the client before server release completes (AC4/AC7)

`connection.ts` calls `tokens.closeAttempt` and immediately calls `tokens.reset` inside `closeLifecycle` (around lines 120–130). `tokenAdapter.ts`'s lifecycle `notify` is fire-and-forget, returns void, and swallows rejection (around lines 114–126). The next Start can therefore post a new mint request while the old attempt still occupies the same server session. The server correctly returns 409, and the UI reports a generic failed Start despite the preceding Stop.

The existing builder-authored immediate Stop→Start test failed both in the full suite and in isolation. The independent probe also reproduces it deterministically by holding the old Stop notification while starting again against the real Express app with a fake provider. Expected successful restart; actual rejection `Could not start the conversation.` This is an application lifecycle ordering defect, not a compiler or missing-browser problem.

**Builder follow-up:** serialize the release/disconnect/start lifecycle, including pending requests and failures. Keep the same-session guard and one-mint-per-Start protection intact. The user should not need to wait an arbitrary interval or retry. Do not add sleeps to the test, silently bootstrap a new session, loosen the server guard, or mask the rejected Start to make this pass. Reproduce first, then implement with TDD and rerun the integration and acceptance probes.

## Evidence limits and next gate

- The builder's reported green results are historical claims, not the results of these fresh reruns. The checked commit remained unchanged while testing.
- No automated suite currently proves actual provider playback, microphone permission denial, live remote capacity behavior, or a completed real conversation. A live smoke test still needs owner authorization and must be reported separately after local blockers are fixed.
- The browser tests use no-key failure paths; their status/disclosure checks cannot substitute for media attachment acceptance.
- The builder's TDD table includes module-absence/import/test-correction failures. Those are not qualifying behavior RED evidence under AGENTS.md. Historical B1–B7 evidence was not independently witnessed; retain that limitation and do not fabricate it retroactively.
- Codex cannot observe the owner's VS Code Problems panel here. Compiler success is not a claim that all 21 previously reported entries are cleared.
- Claude has not reviewed this build. Return this report to DeepSeek for the bounded fixes, then request a fresh Codex verification before treating the testing gate as passed. No additional planning approval is needed to fix these defects within the already-approved spike.
