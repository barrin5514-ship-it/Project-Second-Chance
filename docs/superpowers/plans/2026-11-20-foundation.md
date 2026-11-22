# Project Second Chance Foundation Implementation Plan

> For agentic workers: use the installed official BMAD stable 6.12.4 build workflow, with this project plan and its mandatory TDD/risk controls. This file retains its original path for existing links; the path does not select Superpowers as the delivery method. The owner chose DeepSeek as builder; do not delegate implementation to another model or replace the independent Codex and Claude gates.

**Goal:** Deliver E0-S1, a local fictional-demo foundation with health monitoring and reproducible tests.

**Architecture:** Preserve the approved modular monolith. A responsive React application calls one Express API; the first story establishes runtime boundaries without activating private-data workflows. Authentication, SQLite persistence and encrypted documents follow in separate stories.

**Tech stack:** React, Vite, TypeScript, Node.js, Express. Proposed test tools: Vitest, Supertest and Playwright. Record chosen versions and use a lockfile.

**Spec:** `docs/stories/E0-S1-foundation.md`, `docs/product/BMAD_Architecture_Spine.md`, `docs/product/Project_Second_Chance_PRD.md`.

## Global constraints

- Fictional data only; no real-user or production-readiness claims.
- DeepSeek builds; Codex independently tests; Claude reviews; owner approves merge.
- No runtime cloud AI, external court access, paid services or deployment in this story.
- Preserve all ten architecture decisions. Record minor implementation choices as choices, not owner approvals.
- No sensitive-data handling is functional in E0-S1; the UI must say so.
- Read `docs/process/BMAD_STABLE_TDD.md`, `docs/planning/RISK_REGISTER.md` and `docs/planning/RISK_DRIVEN_DELIVERY.md`. Verify the pinned BMAD installation before application code. All behavioral changes use observed RED, minimal GREEN and refactor/regression evidence.

## Review focus

- Starting in the wrong workspace must not alter another product: verify identity before initialization.
- An API failure must show retry/unavailable rather than an apparently healthy app: browser failure test in Task 2.
- Health output must not leak deployment details: exact response assertion in Task 1.
- A narrow or keyboard-only browser must reach the status and retry control: browser assertions in Task 2.
- Secrets and private storage must not enter version control: ignore-rule check in Task 3.

## Proposed file map

- `package.json`, `package-lock.json`: workspace scripts and reproducible dependencies.
- `apps/server/src/app.ts`: construct Express app without listening as an import side effect.
- `apps/server/src/main.ts`: loopback listener and startup lifecycle.
- `apps/server/src/health/health.routes.ts`: non-sensitive health response.
- `apps/server/tests/health.test.ts`: API contract and leak prevention.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css`: accessible landing, fictional label and API status.
- `apps/web/src/api/health.ts`: typed same-origin health request.
- `apps/web/vite.config.ts`: local development proxy; loopback binding.
- `tests/e2e/foundation.spec.ts`, `playwright.config.ts`: browser acceptance and local services.
- `docs/adr/0001-foundation-tooling.md`: version, structure and test choices with rationale.
- `docs/security/threat-model.md`: boundaries and pending controls.
- `docs/evidence/E0-S1-builder.md`: observed execution evidence.

## Task 1 Testable API foundation

Produces: `createApp(): Express` with no listen side effect; `GET /api/health` contract `{status:'ok', mode:'fictional-demo'}`. The listener binds to `127.0.0.1` by default; document the port.

- [ ] Verify workspace, files and Git state; read AGENTS.md. If no Git repository exists, initialize one in this folder only and use `feature/e0-s1-foundation` for work. Do not create a baseline commit on main or merge to it.
- [ ] Verify disposable-file create/read/cleanup within this exact workspace before setup. Record write/lock failures without broad deletion, global settings changes or touching any other project. Future storage fault tests stay assigned to the persistence stories.
- [ ] Complete pinned BMAD setup verification, record prerequisites/version/configuration, and inspect installer changes for conflicts. Follow the installed stable build workflow. Do not silently substitute v7 or an unverified BGLAD wrapper.
- [ ] Map this story's risk IDs and acceptance criteria to the behavior tests, manual checks and remaining gates using the evidence template. Keep unimplemented future controls OPEN.
- [ ] Create only the workspace/test configuration needed to run the health contract test. Record dependency versions in the ADR and lockfile.
- [ ] Write `health.test.ts`: create the app, request the health route, assert HTTP 200, JSON content type and exact response object. Assert unknown routes return 404 without environment/path details.
- [ ] Run the targeted test and record a meaningful failing result before implementing the route. A broken installation does not count as a behavior test failing.
- [ ] Implement the app factory, health route and listener. Provide a root `test:api` script.
- [ ] Run `npm run test:api`; require all contract tests to pass. Record the real result.
- [ ] Refactor only while those tests remain green, then rerun the API suite and record the result. Apply this cycle to each behavior, not just one combined test at the end.

## Task 2 Accessible fictional-demo landing

Consumes: health endpoint from Task 1. Produces: a responsive landing page with loading, ready and unavailable states; retry invokes a fresh same-origin health request.

- [ ] Set up the minimum React/Vite and browser-test configuration needed for the landing tests; serve locally and proxy `/api` to Express. No production permissive CORS workaround.
- [ ] Write separate behavior tests: exact project heading and fictional-data notice; visible unimplemented account/upload disclosure; success after a valid healthy response; unavailable after failed or malformed health responses; keyboard-focusable Retry; retry success clearing failure; narrow viewport without horizontal scrolling. Exercise failure deterministically without depending on a real external outage.
- [ ] Run `npm run test:e2e` and record failure against the missing landing behavior.
- [ ] Implement `fetchHealth(): Promise<{status:'ok';mode:'fictional-demo'}>` with HTTP and response-shape validation, then the landing screen and status/retry UI. Do not expose a nonfunctional login or upload flow.
- [ ] Run `npm run test:e2e`; require all landing and error/retry assertions to pass. Use a browser screenshot for layout inspection in addition to tests.
- [ ] Refactor the landing/status code only with passing tests, then rerun the browser suite. Preserve RED/GREEN evidence for each introduced behavior.

## Task 3 Reproducible startup and honest handoff

Consumes: tested API and landing. Produces: complete E0-S1 evidence and instructions for independent review.

- [ ] Add ignore rules and safe configuration examples. Check representative `.env`, SQLite DB/WAL/SHM files, encrypted upload storage and key paths with `git check-ignore`; confirm safe example/docs remain trackable. Never print actual secret values.
- [ ] Record the initial threat model: untrusted browser, future uploads/OCR, external AI, court sources, SQLite, encrypted blobs, separate keys, backups and demo hosting. Clearly mark controls that are not implemented.
- [ ] Document exact supported runtime/dependency versions, loopback startup URLs and root scripts `dev`, `test:api`, `test:e2e`, `typecheck` and `build`. Do not claim scripts exist before creating and running them.
- [ ] Run the API and browser suites, `npm run typecheck` and `npm run build`. Record exact commands, exits, counts and limitations; report any checks that could not run as incomplete.
- [ ] Check `git status`, staged/unstaged diffs and generated-file exclusions. Record only scoped changes on the feature branch; never commit secrets or merge/push.
- [ ] Write the builder report using `docs/evidence/STORY_EVIDENCE_TEMPLATE.md`, with acceptance criteria, FR/NFR and risk mappings, observed RED/GREEN/refactor results and remaining OPEN risks. Update risk evidence references without claiming independent closure. Stop for Codex independent tests, then Claude review and owner approval. Do not proceed to authentication or later stories in this run.

## Plan self-check

E0-S1 acceptance criteria map to the API tests, browser states, ignore checks, documentation and evidence tasks above. No later MVP feature is presented as complete. Authentication/encryption libraries, supported uploads and retention are still open implementation ADRs for their dedicated stories. This plan is scoped to foundation delivery, not full PRD coverage.
