---
title: 'E0-S1 runnable fictional-demo foundation'
type: 'feature'
created: '2026-11-23'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'bd055ad3e917f0ab91a9c0d8cdb93743266b5925'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/process/BMAD_STABLE_TDD.md'
  - '{project-root}/docs/planning/RISK_REGISTER.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** E0-S1 was partially overtaken by the approved Mira spike. The working tree has the React/Vite/TypeScript + Express stack, loopback services, lockfile, tests and secret exclusions, but it lacks E0-S1's exact safe `/api/health` contract, the fictional-demo landing/status/retry screen, and the foundation run/threat-model evidence.

**Approach:** Reconcile the ten E0-S1 criteria against the existing code and complete only the missing foundation behavior. Keep the tested Mira connection test as an explicit opt-in page; the default landing and health flow must never contact a provider.

## Boundaries & Constraints

**Always:** Local fictional demo only; loopback binding; exact health JSON; no secrets/paths/user data in responses; keyboard/mobile access; preserve Mira, its tests, prior evidence and env exclusions; observed RED→GREEN per behavior; record risks/AC mapping.

**Never:** Accounts, sign-in, uploads, private records, SQLite, forms, court/model calls from the foundation flow; deleting Mira; re-scaffolding; reinstalling BMAD; merge, push, deploy or paid changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HEALTH_OK | `GET /api/health` | 200, JSON, exactly `{status:"ok",mode:"fictional-demo"}`; no provider call | N/A |
| HEALTH_UNKNOWN | `GET /api/unknown` | 404 generic JSON without path/env values | No stack or filesystem detail |
| LANDING_READY | health resolves | Exact project/fictional/incomplete notices; status becomes available | No media/provider starts |
| LANDING_UNAVAILABLE | health rejects, non-200, non-JSON or wrong shape | Unavailable message and enabled Retry; never claims ready | Actionable retry |
| RETRY_SUCCESS | Retry clicked after failure, health then succeeds | Fresh health request, ready state, failure cleared | Keyboard focusable |
| MIRA_OPT_IN | `GET /mira` or landing link | Existing Mira page remains available and unchanged | Foundation path does not load media |
| NO_EXTERNAL | Landing open | Only same-origin `/api/health` requested | No AI/court request |

</frozen-after-approval>

## Code Map

- `apps/server/src/app.ts` -- `createApp(deps)` mounts Mira routes; add health route + generic JSON 404.
- `apps/server/src/health/health.routes.ts` -- new exact health handler.
- `apps/server/src/avatar/*`, `apps/server/src/main.ts` -- loopback listener, provider gateway, attempt guard; do not change behavior.
- `apps/web/src/main.tsx` -- entry; choose landing for `/`, Mira for `/mira`, register SDK.
- `apps/web/src/App.tsx` -- existing Mira page; preserve, add a back link only.
- `apps/web/src/foundation/FoundationLanding.tsx` (+ `.test.tsx`, `.css`) -- new landing, status/retry, link to `/mira`.
- `apps/web/src/api/health.ts` (+ test) -- same-origin validated health client.
- `apps/web/src/App.test.tsx`, `entryPath.test.tsx`, `avatar/mediaOutput.integration.test.tsx` -- Mira tests; keep importing `App`.
- `tests/e2e/avatar.spec.ts` -- update navigation to `/mira`; `tests/e2e/foundation.spec.ts` -- new landing/retry checks.
- `package.json` -- add `test:api`; `README.md`, `docs/security/threat-model.md`, `docs/adr/0001-foundation-tooling.md`, `docs/evidence/E0-S1-builder.md` -- new docs.
- `.gitignore`, `.env.example` -- verify/update placeholders only.

## Tasks & Acceptance

**Execution:**
- [x] `apps/server/src/health/health.routes.test.ts` -- test exact health body, JSON content type, no provider call and generic 404; observe RED.
- [x] `apps/server/src/health/health.routes.ts`, `apps/server/src/app.ts` -- minimal health route and JSON 404 -- GREEN.
- [x] `apps/web/src/api/health.test.ts` -- success, non-200, invalid JSON and wrong-shape rejection; observe RED.
- [x] `apps/web/src/api/health.ts` -- validated same-origin client -- GREEN.
- [x] `apps/web/src/foundation/FoundationLanding.test.tsx` -- exact copy, no forms, checking/ready/unavailable, retry success/clears failure, keyboard; observe RED.
- [x] `apps/web/src/foundation/FoundationLanding.tsx` + `.css`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx` back link -- minimal landing/routing -- GREEN.
- [x] `tests/e2e/foundation.spec.ts`, update `tests/e2e/avatar.spec.ts` -- browser landing, API failure/retry, narrow, no external request, Mira opt-in; observe RED then GREEN.
- [x] `package.json` `test:api`; `README.md`, `docs/security/threat-model.md`, `docs/adr/0001-foundation-tooling.md`, `.env.example`; ignore-rule checks -- docs/config evidence.
- [x] `docs/evidence/E0-S1-builder.md` -- fill actual RED/GREEN, commands, risks, gaps.

**Acceptance Criteria:**
- Given the repo, when inspected, then all E0-S1 work is in this folder on `feature/e0-s1-foundation`, no merge/push.
- Given `npm run dev`, when opened, then web/API bind loopback only.
- Given `GET /api/health`, then 200 exact JSON and no sensitive detail.
- Given `/`, then the exact fictional/incomplete notices appear and no sensitive form is active.
- Given health failure, then unavailable + actionable keyboard Retry; no external AI/court call.
- Given `/mira`, then the preserved opt-in Mira test still works.
- Given ignore/config checks, then dependencies/builds/secrets/DBs/uploads/keys/runtime are ignored and only placeholders are trackable.
- Given full checks, then unit/integration, browser, typecheck and build pass with recorded commands/counts/gaps.
- Given docs, then install/start/test/loopback URLs/not-implemented and the pending threat controls are stated.
- Given evidence, then each behavior has observed RED/GREEN/refactor and risk/requirement links; future controls stay OPEN.

## Implementation Notes

- Implemented on `feature/e0-s1-foundation`, started from the unmerged Mira commit `68a3c1f` after preserving owner/Codex/Claude/live evidence in `bd055ad`. No merge or push.
- `GET /api/health` returns the exact fictional-demo body and is mounted before the Mira routes; a final generic JSON 404 prevents Express's HTML path echo. Health reads no config and cannot contact the provider.
- The landing validates only the same-origin health contract and exposes checking/available/unavailable plus keyboard Retry. It renders no form, sign-in or upload input.
- `/` is the foundation landing; `/mira` remains the preserved opt-in Mira page. The SDK and Mira page are loaded only on `/mira`, so the foundation page makes no provider call or SDK evaluation.
- Express was patched from 4.21.2 to 4.22.3 after `npm audit` found 4 production advisories; re-audit is clean and all suites were rerun.
- Actual final checks: `npm test` 167 tests/16 files; `npm run test:api` 85/6; `npm run test:e2e` 38; unchanged independent probes 6 + 3 + 2; typecheck 0; build 0; secrets guard 0 / 7 tests; audit 0 production vulnerabilities.
- Independent-review fixes: `fetchHealth` now aborts after 8 seconds with the timer armed through body reading, so a stalled health check reaches unavailable + Retry; a final JSON error boundary maps malformed/oversized bodies to generic 400/413 JSON without stack/path echo. The browser regression guard now asserts the only `/api/` request is `/api/health`.
- Remaining: Codex retest of these fixes, follow-up Claude verification and owner merge approval. Focus-after-Retry and abort-on-unmount (P3) remain deferred. Authentication, private storage, encryption, consent, legal verification, court access and recovery remain future gates.

## Spec Change Log

- **2026-11-23 — independent-testing fault paths (owner-directed retest).** Codex and actual Claude review found two P2 cases omitted from the original LANDING_UNAVAILABLE matrix row: a hang/stalled body, and parser errors before routing. Amended behavior: the health client owns a bounded 8 s timeout through body reading, and a final JSON error boundary maps parser/size failures to generic 400/413/500 JSON without stack/path/body echo. Known-bad states avoided: indefinite Checking with no Retry, and HTML stack disclosure of local paths. KEEP: exact health body, generic 404, no provider/config access, Mira opt-in isolation, keyboard retry.

## Review Triage Log

## Verification

**Commands:**
- `npm run test:api` -- expected: server health/route tests pass.
- `npm test` -- expected: all unit/integration tests pass.
- `npm run test:e2e` -- expected: foundation + Mira browser tests pass on pinned Chromium.
- `npm run typecheck` -- expected: no diagnostics.
- `npm run build` -- expected: success.
- `npm run verify:secrets` / `npm run test:secrets` -- expected: clean.
- `git check-ignore` representative secret/DB/upload/key/runtime paths -- expected: ignored.
