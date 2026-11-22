# E0 S1 Runnable fictional demo foundation

Status: ready for DeepSeek implementation under the owner's November 20 instruction to start building with the established roles. This is the first implementation story, not a claim of approved new architecture or completed software.

## User value

As the project owner, I want a separately runnable and testable application foundation so that the team can build the five approved workflows without mixing repositories or presenting unfinished privacy controls as working features.

## Scope

Create the minimum React/Vite/TypeScript frontend and Node/Express/TypeScript backend, test setup, local run instructions, initial threat model and implementation decision log. SQLite, sessions, private cases and encrypted files belong to subsequent stories. Do not build dummy login or pretend document uploads are protected.

Method: official BMAD stable v6.12, pinned package 6.12.4, with mandatory TDD as documented in `docs/process/BMAD_STABLE_TDD.md`. Read the risk register before implementation. Primary risks for this story: R05, R06, R07, R09, R10, R19, R20, R23, R24 and R25. R08 and R21 are enforced here by keeping the app local and making its incomplete status visible. All other risks remain tracked for their activation gates.

## Acceptance criteria

1. Everything is contained in this ProjectSecondChance folder. Git checks succeed or a specific blocker is reported without changing unrelated repositories or global settings. Use a feature branch; no merge or push.
2. A local command runs the web app and API. Development services bind to loopback rather than all network interfaces. No hosting or public exposure is configured.
3. `GET /api/health` returns HTTP 200 and exactly `{ "status": "ok", "mode": "fictional-demo" }`; it exposes no path, secrets, environment values, database details or user information.
4. The responsive landing screen visibly says `Project Second Chance`, `Fictional data only`, and `Development foundation — accounts and protected uploads are not available yet.` It explains No False Hope without making legal claims. No sensitive-input, upload or sign-in form is active.
5. The screen reports API availability using the health endpoint. API failure presents an actionable retry state without implying the app is ready. No external model or court request is made.
6. Repository ignore rules exclude dependencies, generated builds, local environment secrets, database files and journals, uploads, encryption keys and runtime storage. Include a safe configuration example with placeholders only. No real records or credentials are introduced.
7. The builder supplies passing unit/integration checks, a browser smoke test for the landing and API-failure/retry states, TypeScript checks and a production build. Exact commands, counts, exit codes and limitations are recorded. A failed check is not waived silently.
8. README instructions cover dependency installation from the lockfile, local startup, tests, loopback URLs and what is not implemented. The threat model lists trust boundaries and the planned auth, encryption, consent and legal-verification controls as pending.
9. BMAD 6.12.4 installation and prerequisites are verified before application implementation. The builder records the installed version and configuration, and preserves the approved documents and project instructions. Framework installation alone is not application completion.
10. For each implemented behavior, evidence records the test name, intended failure observed before implementation, minimal implementation, successful run and refactor/regression result. Applicable risk IDs and requirement IDs are linked. Configuration/manual checks are reported separately. Planned future controls are not marked complete.

## Implementation choices

The linked plan proposes a workspace layout and Vitest/Supertest/Playwright testing. These are implementation choices, not additional architecture approvals. Select compatible maintained versions at execution time, pin resolved versions in the lockfile and record any known dependency findings. Do not change the approved stack to a hosted database or different framework.

## Completion handoff

Provide `docs/evidence/E0-S1-builder.md`, files changed, how to run the app, test evidence, dependency versions, remaining risks and unresolved choices. This story is implemented only when its criteria are evidenced. Independent Codex testing, Claude review and owner approval are still required before merge.
