# E0-S1 foundation independent testing — Codex — November 23, 2026

**Disposition: CHANGES REQUIRED. Codex reproduced two fault-path gaps; actual Claude review independently agrees both need bounded fixes before owner merge consideration.**

Tested commit `f822e659484af11950c3463529b0693545d29fda`, branch `feature/e0-s1-foundation`. The branch is based on unmerged Mira commit `68a3c1f`, with preserved evidence in `bd055ad`; no merge approval is inferred. Worktree initially contained only owner-local untracked `.vscode/`. No application changes, commits, merge, push, deployment or live provider session were performed by Codex. No actual `.env` contents were read into context.

## Fresh reruns

| Check | Actual result |
| --- | --- |
| `npm test` | Exit 0: **162 passed**, 16 files, 12.47 s. This includes the server tests; the overlapping `test:api` subset was not redundantly rerun as a separate command. |
| `npm run typecheck` | Exit 0. |
| `npm run build` | Exit 0, 6.09 s. Main 148.26 kB, Mira 9.92 kB, SDK 664.09 kB; informational SDK chunk warning. |
| `npm run verify:secrets` | Exit 0: tracked-source scan clean. Not a comprehensive security proof. |
| `npm run test:secrets` | Exit 0: **7 passed**. |
| `npm run test:e2e` | Exit 0: **38 passed**, 29.1 s, desktop/narrow; provider disabled and synthetic microphone. |
| `npm audit --omit=dev --json` | Exit 0: **0 reported vulnerabilities** in production dependencies at check time. Does not cover development dependency findings or all supply-chain risk. |
| `git diff --check` | Exit 0; tested HEAD stayed unchanged. |
| `npx vitest run --config .setup/vitest.codex-foundation.config.ts` | Exit 1: **2 passed / 4 failed**, 3.48 s on the final six-case probe version (two defects, each with two fault cases). |
| Preserved Mira SDK/consent probes | `npx vitest run --config .setup/vitest.codex-sdk-contract.config.ts`: exit 0, **3 passed**, 2.48 s. |
| Preserved Mira media/restart probes | `npx vitest run --config .setup/vitest.codex-review.config.ts`: exit 0, **2 passed**, 4.79 s. |

The six independent foundation probes are `.setup/codex-foundation-independent.test.tsx`, with `.setup/vitest.codex-foundation.config.ts`. They are local ignored test assets, not application changes. The stalled-request probes use the actual production health client, synthetic fetch/body promises that never complete unless aborted, and simulated time; they do not bypass a client-owned timeout through dependency injection. No real network request or provider call is involved in those probes. The Express probes use the real app with configuration/provider functions that throw if called.

## Passing independent cases

- Ordinary `GET /api/health` returned exactly `{status:'ok',mode:'fictional-demo'}`, `Cache-Control: no-store`, and did not read the key or call the provider.
- Ordinary unknown API GET returned generic JSON `{error:'not-found'}` and did not echo the hostile path/query canaries.
- Source inspection confirms the main entry imports the foundation directly and imports Mira/SDK only under `/mira`. Foundation copy correctly labels fictional data and unavailable accounts/uploads. Mira remains an explicit optional feature.

## P2 — A stalled health request never offers recovery

Locations: `apps/web/src/api/health.ts` (`fetchHealth`) and `apps/web/src/foundation/FoundationLanding.tsx` (checking/retry state).

The actual fetch has no timeout/abort budget. The landing changes state only when its promise settles, and Retry exists only after rejection. If a local server accepts the connection but never sends/completes a response, the page can remain at Checking with no usable recovery action. That is a missing failure path in the foundation's API availability/retry capability (AC5, R07/R20).

Independent reproduction advances a generous 60-second simulated observation interval while the production client's fetch is held pending, or while headers arrive but the JSON body never completes. In both cases the page still says Checking and has no Retry. The 60 seconds is a probe observation ceiling, not a newly approved product timeout requirement. Choose/document a reasonable bounded timeout covering the entire operation through body reading, and ensure pending work is aborted or otherwise cannot overwrite newer results. Preserve manual keyboard retry and same-origin behavior. Add real pending-fetch/body regressions; do not only test immediate fetch rejection or increase test-runner timeouts.

## P2 — Malformed JSON bypasses generic API errors and exposes local paths

Location: `apps/server/src/app.ts`: JSON parser runs before mounted routes, with no final four-argument error middleware.

Independent reproduction posts intentionally incomplete synthetic JSON to an unknown API route. It receives HTTP 400 **HTML**, containing a SyntaxError stack and absolute local paths into body-parser/raw-body. A separate valid but oversized JSON body receives HTTP 413 **HTML** with framework stack details. Both bypass the normal generic 404 entirely. No secret value was used or observed; the concrete exposure is framework stack/local filesystem paths. This behavior exists in the reused parser stack and must not be described as caused by the Express security patch.

The initial threat model explicitly notes framework errors have not been exhaustively tested; this probe makes one such gap concrete. Add a sanitized JSON error boundary for parser/size/method/framework failures as appropriate, preserving useful status codes and avoiding request-body/path/stack echo in responses and logs. Test malformed JSON and over-limit bodies, retain the exact successful health response and existing Mira protections, and avoid weakening request parsing or guards to obtain green.

## Scope and evidence limits

No accounts, encrypted storage, legal verification or court integrations are accepted by these checks. Historical Mira evidence remains preserved; no new live smoke test was run. The VS Code Problems panel was not inspected. Production audit cleanliness is not a security assessment. Foundation source/probe checks and builder test reruns do not substitute for Claude's actual review or owner merge approval. Return only the bounded fault-path fixes to DeepSeek, with TDD and updated evidence, before accepting the foundation gate.

## Actual Claude review and focused handoff

First-party authenticated Claude Code returned a successful read-only review using actual model `claude-sonnet-5-5`, exit 0, no permission denials. Complete reviewer text is `docs/evidence/E0-S1-claude-review-f822e65.md`. Claude independently classified both defects P2 and recommended fixing them before merge consideration. No P0/P1 finding was reported. Claude ran no tests, edited no code and contacted no provider.

Its additional P3 notes concern keyboard focus after Retry, narrower-than-claimed same-origin provider/SDK regression coverage, and documentation updates. They are nonblocking notes, not additional product features or authorization to redesign the app. At minimum update evidence/threat-model statements to acknowledge the actual review and the corrected fault paths.

DeepSeek: fix the two bounded behaviors with TDD, rerun the unchanged final six-case independent foundation probe plus the maintained suites, preserve Mira and its earlier gates, update the builder evidence and stop for Codex retesting/follow-up Claude verification. Do not loosen parsing, remove status assertions or add arbitrary test sleeps. No owner merge approval, live session or deployment is granted by this handoff.
