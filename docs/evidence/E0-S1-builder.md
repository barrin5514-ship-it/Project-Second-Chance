# E0-S1 builder evidence — runnable fictional-demo foundation

Builder: DeepSeek. Status: **BUILDER IMPLEMENTATION COMPLETE — STOPPED FOR CODEX INDEPENDENT TESTING AND ACTUAL CLAUDE REVIEW.** This file records observed results only. It does not claim Codex acceptance, Claude approval or owner merge approval. No merge, push, deployment or live provider session occurred. The real `.env` was not read, quoted or committed.

## Identity and scope

- Story: `docs/stories/E0-S1-foundation.md` (AC1–AC10). BMAD spec created from that approved story: `_bmad-output/implementation-artifacts/spec-e0-s1-foundation.md`.
- Date: 2026-11-23. Absolute workspace: `<owner-home>\Documents\ChatGPT\Next Chapter Project\ProjectSecondChance`.
- Branch: `feature/e0-s1-foundation`, created from the **unmerged** Mira branch commit `68a3c1f`; owner/Codex/Claude/live evidence was preserved first in `bd055ad`. No merge or push. Baseline recorded in the spec: `bd055ad3e917f0ab91a9c0d8cdb93743266b5925`.
- BMAD: stable **6.12.4** (`_bmad/_config/manifest.yaml`, install date 2026-11-20, modules core + bmm). The installed `bmad-build` skill rendered through `uv run --no-cache _bmad/scripts/render_skill.py ...` to `_bmad/render/bmad-build/.../workflow.md`; no reinstall was performed. Continue is not required for this build.
- Runtime/dependencies: Node **v26.13.0**, npm **11.20.0**; React 18.3.1, Vite 6.0.3, TypeScript 5.7.2, Express **4.22.3** (patched from 4.21.2 — see dependency finding), Vitest 2.1.8, Playwright 1.49.1 with Chromium 131.0.6778.33 / build 1148. `package-lock.json` updated for the Express patch.
- Applicable risks: R05, R06, R07, R09, R10, R19, R20, R23, R24, R25; R08/R21 remain a local-demo boundary, not a security claim.
- Explicit exclusions: accounts, sign-in, sessions, private cases, uploads, encryption, extraction, notices, legal answers, court adapters, AI consent, deployment, paid services. No real records are used.

## Pre-existing work preserved

The working Mira prototype and all prior tests (150 unit/integration tests, 26 browser tests) were kept. `apps/web/src/App.tsx` remains the Mira page, now at `/mira`; it still carries the explicit Start, microphone/AI disclosure, camera-off settings, attempt/token guards and cleanup. The owner-updated `AGENTS.md`, `START_AVATAR_PROTOTYPE.md`, `START_NEXT_BUILD.md`, live-smoke evidence and the `68a3c1f` Codex/Claude reports were committed in `bd055ad` before the feature work.

## Test-first evidence

| Behaviour / acceptance criterion | FR/NFR and risk IDs | RED command, expected assertion, actual failure and exit before implementation | Minimal behaviour implemented | GREEN command, count/result and exit | Refactor and regression |
| --- | --- | --- | --- | --- | --- |
| B1 Exact safe health contract and generic API 404 (AC3, AC5) | NFR-04/13; R07, R23 | `npx vitest run apps/server/src/health/health.routes.test.ts` → **2 failed**: health returned 404 instead of 200; unknown route returned `text/html` instead of JSON. exit 1 | `health.routes.ts` mounts `GET /api/health` with exact `{status:"ok",mode:"fictional-demo"}`, no-store, no config/provider access; `app.ts` adds generic JSON 404 after routes | same command → **2 passed**, exit 0; `npm run test:api` → **83 passed / 6 files**, exit 0 | Health logic extracted into its own module; all existing server tests still pass |
| B2 Validated same-origin health client (AC5) | NFR-13; R07, R23 | `npx vitest run apps/web/src/api/health.test.ts` → **4 failed**: stub threw `not implemented` for success, non-200, non-JSON and wrong-shape cases. exit 1 | `fetchHealth()` uses same-origin/no-store GET, rejects non-2xx, unreadable JSON and any body other than the exact fictional-demo contract | same command → **4 passed**, exit 0 | Client keeps a narrow `HealthResponse`; no raw response text is surfaced |
| B3 Landing content, status and keyboard retry (AC4, AC5, NFR-15/20) | NFR-13/15/16; R20, R23 | `npx vitest run apps/web/src/foundation/FoundationLanding.test.tsx` → **6 failed** against a placeholder render: no heading/notices/status/retry. exit 1 | `FoundationLanding.tsx` renders the exact project/fictional/incomplete notices, No False Hope copy, no form, health checking/available/unavailable and a fresh-request Retry; `.css` adds mobile layout | same command → **6 passed**, exit 0 | Component accepts an injected health loader for deterministic tests; production defaults to `fetchHealth` |
| B4 Opt-in Mira route and real-browser foundation behavior (AC1, AC2, AC4, AC5, AC6) | AD-02; R20, R21, R24 | `npx playwright test tests/e2e/foundation.spec.ts --project=chromium` → **6 failed** against the old `/` Mira page (heading/notices/status/retry absent). exit 1 | `main.tsx` renders the landing at `/`, lazy-loads the preserved Mira page and pinned SDK only at `/mira`; `App.tsx` gains a back link; Mira browser spec navigates to `/mira` | foundation spec → **6 passed**, exit 0; full `npm run test:e2e` → **38 passed** (6 foundation × 2 projects + 26 preserved Mira), exit 0 | Full suite rerun after the Express patch; still 38 passed |
| R1 Mira preservation regression (not new TDD) | R24; prior V0-S1 evidence | Pre-existing behavior; no RED claimed | No Mira logic changed except the back link and route | `apps/web/src/**` prior suites and 26 Mira browser tests pass after navigation moved to `/mira` | `npm test` 162 passed; see whole-story table |

**TDD honesty note:** `health.ts` and `FoundationLanding.tsx` were created as minimal throwing/empty placeholders before their tests so the first failing assertion reflected missing behaviour rather than a missing module. Those placeholders implemented no application behavior. The browser test failures were observed before the entry-route implementation. The Mira preservation row is a regression check, not retroactive TDD.

## Other necessary checks (not TDD)

- **BMAD installation/version:** manifest records 6.12.4; rendered build workflow executed. Not a claim that every workflow step was independently verified.
- **Disposable workspace write/read/delete (R25):** created `.e0-s1-write-probe.tmp`, read the exact content, deleted it; absence confirmed. No other project or global Git setting was touched.
- **Ignore rules (AC6):** `git check-ignore -v` mapped `.env`→`.gitignore:10`, `*.sqlite`/`*.sqlite-*`/`*.sqlite-shm`, `*.db`/`*.db-*`, `uploads/`, `keys/`, `runtime/`. `.env.example` is **not** ignored (exit 1 = trackable) and contains placeholders only. `git ls-files` showed no tracked `.env`, database, key or upload path.
- **Dependency finding (R10):** `npm audit --omit=dev` on Express 4.21.2 reported **4 advisories (1 moderate, 3 high)** in `qs`/`body-parser`/`path-to-regexp` (DoS classes). Upgraded the exact pin to Express **4.22.3** (still approved Express 4.x) and regenerated the lockfile. Re-run: **0 vulnerabilities**, exit 0. Full unit/API/browser suites re-ran green after the upgrade.
- **Build split:** landing bundle `index` 148.26 kB; lazy Mira page 9.92 kB; pinned SDK 664.09 kB in its own chunk. The >500 kB warning remains informational for the opt-in SDK chunk.
- **Visual inspection:** browser tests assert narrow reflow and visible notices; no screenshot-based visual approval is claimed.
- **Editor diagnostics:** the VS Code Problems panel was not observable from this session. `npm run typecheck` and `tsc --noUnusedLocals --noUnusedParameters` are the available compiler checks; neither proves every editor diagnostic is cleared.

## Whole-story verification

| Check and exact command | Exit | Test count / observed result | Limitations or failure names |
| --- | --- | --- | --- |
| `npm test` | 0 | **162 passed, 16 files** | Builder tests only; independent Codex testing still required |
| `npm run test:api` | 0 | **83 passed, 6 files** | Health tests use a controlled app/fake provider; no live provider |
| `npm run test:e2e` | 0 | **38 passed** (foundation + Mira, two viewports) | Uses local dev servers, fake microphone and no provider key |
| `npm run typecheck` | 0 | no diagnostics (tsc 5.7.2) | Does not observe the editor panel |
| `npm run build` | 0 | Vite 6.0.3, 2.64 s; 148.26 kB main + 9.92 kB Mira + 664.09 kB SDK chunk | Informational chunk-size warning only |
| `npm run verify:secrets` | 0 | tracked-source pattern scan clean | Pattern check, not a comprehensive secret scan |
| `npm run test:secrets` | 0 | **7 passed** | Test double fixtures only |
| `npm audit --omit=dev --audit-level=high` | 0 | **0 vulnerabilities** after Express 4.22.3 | Production dependencies only; not a full supply-chain review |
| `git diff --check` | 0 | no whitespace errors | N/A |

## Acceptance criteria mapping

| AC | Evidence | Status |
| --- | --- | --- |
| 1. Contained workspace/Git, feature branch, no merge/push | Branch `feature/e0-s1-foundation`; base dependency recorded; scoped diff | Evidenced for builder; independent check pending |
| 2. Local command runs web and API; loopback only | `vite.config.ts` host `127.0.0.1`; server `listen(..., '127.0.0.1')`; `npm run dev` used by browser suite | Evidenced; no hosted exposure |
| 3. Exact `GET /api/health` | B1 tests assert status, JSON, exact body/keys, no provider call | Evidenced |
| 4. Responsive landing with exact notices; no active sensitive input | B3/B4 tests and browser assertions; `form,input,textarea,select` count 0 | Evidenced |
| 5. API availability + retry; no external model/court call | B2/B3/B4; failure/malformed/retry tests; browser captures external requests | Evidenced for foundation flow |
| 6. Ignore rules and placeholder config | `git check-ignore` results; `.env.example` placeholders only | Evidenced |
| 7. Unit/integration/browser/typecheck/build results | Whole-story table above | Evidenced |
| 8. README + threat model | `README.md`, `docs/security/threat-model.md` | Written; review pending |
| 9. BMAD 6.12.4 verified before implementation | Manifest and rendered workflow recorded | Evidenced |
| 10. Per-behavior RED/GREEN/refactor and risk links | B1–B4 table; risks below | Evidenced; historical Mira TDD limits retained in prior reports |

## Risk status and residual exposure

| Risk | Control / evidence | Status and remaining exposure |
| --- | --- | --- |
| R05 sensitive records/provider leakage | No private data or uploads activated; foundation reads no config; Mira keeps server-held key/token controls | **OPEN for future workflows** — account isolation and encryption not implemented |
| R06 five workflows exceed time | Only E0-S1 foundation completed; Mira preserved; no later feature built | **IN PROGRESS** — later gates unimplemented |
| R07 external service unavailable | Health failure/malformed/retry tests; Mira provider failure tests from prior evidence | **AWAITING INDEPENDENT VERIFICATION** for foundation; no live provider in this story |
| R09 wrong repo/Git ownership | Absolute path and branch checked; scoped diff; no global settings | **AWAITING INDEPENDENT VERIFICATION** |
| R10 framework/dependency drift | BMAD 6.12.4; exact pins; lockfile; Express 4.22.3 audit clean | **AWAITING INDEPENDENT VERIFICATION**; no full SBOM |
| R19 recovery | Not activated; no database/blobs | **OPEN** — later persistence story |
| R20 inaccessible UI/failure states | Landing keyboard retry, narrow viewport and no-horizontal-scroll browser tests | **AWAITING INDEPENDENT VERIFICATION**; no screen-reader audit |
| R23 self-certified TDD/reviews | Observed RED/GREEN table; Codex/Claude/owner gates not claimed | **AWAITING INDEPENDENT VERIFICATION** |
| R24 scope creep | Only missing E0-S1 behavior; Mira retained; no later feature | **AWAITING INDEPENDENT VERIFICATION** |
| R25 write/locking failure | Disposable write/read/delete probe succeeded; no storage workflow activated | **OPEN** for future storage fault tests |
| R08/R21 real-use/hosted exposure | Local loopback only; fictional landing labels; no deployment | **OPEN for real use** — not a security claim |

## Run and review handoff

- Local startup: `npm ci`, then `npm run dev`. Landing `http://127.0.0.1:5173/`, Mira `http://127.0.0.1:5173/mira`, health `http://127.0.0.1:3001/api/health`. Checks: `npm test`, `npm run test:api`, `npm run test:e2e`, `npm run typecheck`, `npm run build`, secret scripts.
- Files changed: health route/test, `app.ts` mount+404, web health client/test, foundation landing/test/CSS, `main.tsx` routing, Mira back link, foundation browser spec, Mira browser navigation, README, threat model, ADR-0001, `.env.example`, `package.json`/lockfile (Express patch), BMAD spec, this evidence.
- Known gaps: no independent Codex testing or actual Claude review yet; no live Mira run in this story; no accounts/private documents/encryption/consent/legal/court capabilities; route choice is an implementation proposal; editor Problems panel unobserved; no full dependency SBOM or independent security assessment.
- Codex independent report: **pending — not performed.**
- Claude review: **pending — not performed.**
- Owner merge decision: **pending — no merge or push performed.**
