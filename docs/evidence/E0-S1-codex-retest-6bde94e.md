# E0-S1 independent Codex retest — 6bde94e

Date: 2026-11-23 (America/New_York). Reviewed commit: `6bde94ee57ebb4a39a758cef4d1a11f40fce0ebc`, branch `feature/e0-s1-foundation`. This branch includes the still-unmerged Mira work. Codex ran these checks independently of the builder; no application source or maintained test was changed.

## Verdict

Both previously reproduced P2 defects pass the unchanged independent probes. No blocking finding remains from this Codex retest of the bounded local fictional-demo foundation. [Actual Claude follow-up](E0-S1-claude-followup-6bde94e.md) also completed with both P2s resolved in source and no blocking findings. Codex separately checked README, threat-model and ADR correction descriptions against the code; these describe the current scope and retain future controls as pending. Older pending-review labels in builder/ADR records are superseded by these new reports. Owner merge approval remains a separate pending gate. This is not approval for real records, hosted access, later product features or deployment.

## Independent observations

- **Stalled health request/body:** Both unchanged failure probes now reach unavailable with an enabled Retry instead of staying on Checking. Source inspection confirms the 8-second abort budget remains armed across both fetch and `response.json()`, then clears in `finally`. The UI's existing active guard suppresses stale state updates.
- **Malformed/oversized JSON:** The unchanged probes now receive generic JSON 400/413 responses rather than HTML stack/path disclosure. Source inspection confirms final four-argument error middleware after the generic 404, `no-store`, generic 500 fallback, and delegation when headers have already been sent. Parser failures occur before configuration/provider access.
- **Root-page isolation:** The browser regression now records API paths and requires every observed `/api/` request to be `/api/health`. The foundation route keeps Mira optional and lazy-loaded. Existing Mira SDK-contract and media/restart probes remain green.

## Commands actually executed

| Check | Observed result |
| --- | --- |
| `npm test` | Exit 0; 167 passed, 16 files |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | Exit 0; 6 unchanged independent probes passed |
| `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts` | Exit 0; 3 unchanged SDK-contract probes passed |
| `npx vitest run --config .setup/vitest.codex-review.config.ts` | Exit 0; 2 unchanged media/restart probes passed |
| `npm run test:e2e` | Exit 0; 38 passed, desktop and narrow Chromium configurations |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; 148.49 kB main, 9.92 kB Mira page, 664.09 kB SDK chunk |
| `npm run verify:secrets` | Exit 0; no credential leak patterns found in tracked source |
| `npm run test:secrets` | Exit 0; 7 passed |
| `npm audit --omit=dev --json` | Exit 0; 0 reported production vulnerabilities |
| `git diff --check` | Exit 0 |

The 11 independent probes are separate from the maintained suite. `test:api` was not rerun separately in this retest; server checks are included in `npm test`. Browser tests explicitly used no provider key; no live Nuance conversation occurred. The dependency audit used system certificate trust without disabling certificate validation. The SDK chunk-size warning remains informational. Deprecation/localStorage notices did not fail the checks.

## Limits and remaining gates

Focus retention after Retry removes its button, and aborting a health request immediately on unmount, remain documented nonblocking P3 notes. The timeout still bounds an unmounted request and stale results do not update the page. No screen-reader audit, production security assessment, private-data workflows or new live audiovisual rehearsal was performed. Builder RED-to-GREEN history is recorded in its report; this retest confirms current behavior and does not independently recreate the historical pre-fix state.

At initial inspection the tracked working tree was clean; only owner-local `.vscode/` was untracked. This retest adds evidence files only, without committing, merging, pushing, deploying, reading real `.env` values or changing approval settings. Owner merge approval remains pending even if Claude follow-up passes.
