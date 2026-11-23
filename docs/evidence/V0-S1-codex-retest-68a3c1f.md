# Mira SDK/consent fix retest — Codex — November 23, 2026

Tested HEAD `68a3c1f4c24d75d39d6c0a4147c9691c64fd947f` on `feature/v0-s1-mira-spike`. Initial and post-test worktree: only owner-local `.vscode/` untracked. No application edits, commits, live media sessions, merge, push or deployment were performed by Codex. No real `.env` contents were inspected.

**Codex automated disposition: all five unchanged independent probes and required local checks pass. Follow-up Claude verification is a separate gate, recorded below when returned. A real audiovisual conversation remains unverified and requires owner authorization.**

## Fresh results

| Command | Observed result |
| --- | --- |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | Exit 0: **3/3 passed**, 9.22 s. Tests unchanged from the prior failing probes. |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | Exit 0: **2/2 passed**, 5.25 s. Original independent media/Stop probes unchanged. |
| `npm test` | Exit 0: **150/150 passed**, 13 files, 18.18 s. |
| `npm run typecheck` | Exit 0; subsequent build ran. |
| `npm run build` | Exit 0, 2.68 s; 819.19 kB bundle; existing informational chunk-size warning. |
| `npm run verify:secrets` | Exit 0; tracked-source credential-pattern check clean. |
| `npm run test:secrets` | Exit 0: **7/7 passed**. |
| `npm run test:e2e` | Exit 0: **26/26 passed**, 33.2 s; desktop/narrow pinned Chromium, synthetic microphone, provider access disabled. |
| `git diff --check` | Exit 0; no tracked working-tree edits. |

## Verified corrections

1. The unchanged actual-package probe can wrap the real pinned SDK before connect without prematurely reading its throwing participant getter. No token callback/network access occurs in this constructor probe. The adapter now exposes a guarded lazy getter; connection track reads handle unavailable participants. Maintained media regression covers a getter unavailable before connect and after end.
2. A synchronous SDK factory exception now triggers cleanup and `unavailable`; the unchanged error-path probe passes. Construction/subscriptions are guarded without changing stale-generation checks or server enforcement.
3. A permission-denied-before-token-use SDK fixture now results in **zero token fetches**; the unchanged consent-order probe passes. The app supplies its single-flight callback and lets the documented permission-first SDK invoke it. Earlier media attachment and delayed Stop-release probes still pass.

The fake microphone and pre-granted permission exist only in Playwright configuration. Runtime camera remains off, no local media starts on page load, and automated provider access remains disabled. Passing these tests does not prove real device permission handling, actual provider playback/capacity, or a completed live greeting.

## Limits carried forward

Previous P3 observations remain recorded/deferred: provider end-user identifier derivation, timer-ended wording and explicit speak-first rehearsal instructions. Local-only/session limitations and historical TDD-evidence limitations are not silently closed. The VS Code Problems panel has not been observed; compiler success is not a claim its previously reported 21 entries are all gone. No owner merge approval is inferred from any automated result.

## Completed follow-up Claude gate

Actual first-party Claude review returned successfully using claude-sonnet-5-5 with no permission denials. It found the three prior actionable defects addressed and no concrete remaining blockers or regressions in this bounded correction. See V0-S1-claude-followup-68a3c1f.md for the complete actual review and its scope limits. The cosmetic partial-subscription cleanup observation and existing P3 notes are nonblocking and deferred.

**Combined disposition: ready for a separate owner-authorized, brief live smoke test; not verified live and not approved for merge.** Codex rerun results above and Claude source review are now both recorded. No live session has been started. Speak first during a future authorized test; use a fictional, non-sensitive greeting. Owner must control microphone permission.
