# Mira fix retest — Codex — November 23, 2026

**Later gate update:** actual Claude review identified a real exported-SDK lifecycle failure and two additional error/consent defects, reproduced by Codex in three further probes. See `V0-S1-claude-findings-codex-triage-0134750.md`. Overall acceptance is blocked; the passing reruns below remain limited to their stated scope.

**Disposition: the two reported P1 findings are verified fixed in synthetic/local acceptance checks. Ready for the separate Claude review gate. No live audiovisual acceptance or merge approval is claimed.**

Commit tested: `01347509a4040451f235c013246aec7156701266`, branch `feature/v0-s1-mira-spike`. HEAD stayed unchanged during checks; initial worktree contained only owner-local untracked `.vscode/`. Codex did not alter application code or the original independent probes. The earlier testing report is retained as historical evidence, not overwritten.

## Fresh reruns

| Check | Result |
| --- | --- |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | Exit 0: **2/2 unchanged independent probes passed**, 10.82 s. |
| `npm test` | Exit 0: **146/146 passed**, 12 files, 12.79 s. Includes 3 media-output integration tests and 8 Start lifecycle integration tests. |
| `npm run typecheck` | Exit 0. |
| `npm run build` | Exit 0; 2.19 s; 819.15 kB bundle, informational large-chunk warning. |
| `npm run verify:secrets` | Exit 0; tracked-source pattern scan clean. |
| `npm run test:secrets` | Exit 0: **7/7 passed**. |
| `npm run test:e2e` | Exit 0: **26/26 passed**, desktop and narrow Chromium, 32.8 s. Provider access disabled. |
| `git diff --check` | Exit 0; no tracked working-tree edits. |

## Findings disposition

- **Remote output:** the actual App renders labelled audio/video elements after the synthetic SDK presentation event. The real adapter exposes the remote participant; the connection attaches tracks on media events/element registration and detaches during cleanup/replacement. The unchanged independent probe verifies media elements exist and their fake SDK track attachment methods were called. Maintained tests also cover replacement, SDK end and unmount. The pinned SDK implementation initializes one stable avatar participant object and updates its tracks, consistent with forwarding that object. These tests do not prove physical speaker playback or actual provider video.
- **Stop→Start ordering:** the actual lifecycle transport returns a release promise, and the next Start awaits it. The unchanged independent delayed-release test passes, as does the original immediate-restart test that previously failed. A maintained failed-release test preserves the server guard and one-provider-call behavior. No new session, sleep in application behavior, or weakened rejection guard was introduced to make this green.
- **Browser timeout:** only the per-test timeout changed from 30 to 60 seconds; assertions, retries=0 and provider-disabled configuration remain. The full rerun passed without retry. This is an environment tolerance adjustment, not proof that every future cold load will finish.

## Remaining gates and limits

Claude review has not been substituted by this report. Owner merge approval, live Nuance/microphone permission and an observed real audiovisual greeting remain separate. No real `.env` contents were inspected, no provider session was started and no credit was spent by these tests. No merge, push, deployment or broader capstone work occurred. Previous historical TDD-evidence limitations and inability to inspect VS Code's Problems panel remain disclosed in the original independent report.
