# ADR-0001 — E0-S1 foundation tooling, structure and contracts

- Status: **Proposed by the builder (DeepSeek).** Records implementation choices for E0-S1 only; it does not change approved architecture AD-01…AD-10 or approve new product scope. Owner approves; Codex independently tests; Claude reviews.
- Date: 2026-11-23. Branch: `feature/e0-s1-foundation`, started from the unmerged Mira commit `68a3c1f` (branch dependency recorded; no merge). Baseline for this story: `bd055ad`.
- Story: `docs/stories/E0-S1-foundation.md`. Risks in scope: R05, R06, R07, R09, R10, R19, R20, R23, R24, R25; R08/R21 are enforced here only by keeping the app local and visibly incomplete.

## Context

E0-S1 was overtaken by the approved Mira spike. The code already had a pinned React/Vite/TypeScript + Express stack, loopback services, a lockfile, Vitest/Supertest/Playwright, secret exclusions and the tested optional Mira page. E0-S1 still needed its exact health contract, fictional-demo landing/status/retry, run instructions, initial threat model and scoped evidence. The owner directed completion of only that remaining foundation work while preserving Mira.

## Decisions

### D1 — Reuse the existing modular-monolith layout and pinned versions

Keep `apps/web` (React 18.3.1, Vite 6.0.3, TypeScript 5.7.2) and `apps/server` (Express **4.22.3**, Node 26.13.0 / npm 11.20.0), with Vitest 2.1.8, Supertest 7.1.4 and Playwright 1.49.1 (Chromium 131.0.6778.33, build 1148). No new top-level dependency was added for E0-S1 beyond patching Express within the approved stack; `package-lock.json` remains authoritative. Do not re-scaffold or change the approved stack.

**Dependency finding:** the inherited Express 4.21.2 pin produced 4 production advisories (1 moderate, 3 high) in transitive `qs`, `body-parser` and `path-to-regexp` (denial-of-service classes). The exact pin was raised to Express 4.22.3 and the lockfile regenerated; `npm audit --omit=dev --audit-level=high` then reported 0 vulnerabilities. Unit, API and browser suites were rerun green. This is a scoped patch upgrade, not a framework change.

### D2 — The default route is the fictional-demo foundation; Mira stays opt-in at `/mira`

`main.tsx` renders the foundation landing for `/` and lazy-loads the existing Mira page plus the pinned Nuance SDK only on `/mira`. This preserves the tested Mira implementation and all prior tests without downloading or evaluating the provider SDK on the foundation page. A small path check avoids adding a router dependency. This is an implementation proposal, not a new architecture decision.

Consequence: direct navigation to `/mira` relies on the Vite dev server's SPA fallback; the build is a static bundle and has no production server in this story.

### D3 — Exact health contract and generic 404

`GET /api/health` returns HTTP 200 with exactly `{"status":"ok","mode":"fictional-demo"}`, `Cache-Control: no-store`, and no configuration, path, version or user data. It reads no request input and cannot contact the provider. Unknown routes return a generic JSON 404 (`{"error":"not-found"}`) rather than Express's HTML 404 that echoes the path. A final four-argument JSON error boundary maps body-parser failures to generic `400 {error:"bad-request"}` and `413 {error:"payload-too-large"}` responses, other errors to `500 {error:"internal"}`, and never echoes request text or a stack/path; configuration and provider code are not reached.

### D4 — The landing reports availability only from the validated health contract

`fetchHealth()` uses same-origin fetch with `cache: 'no-store'` and an 8-second `AbortController` budget that stays armed through `response.json()`. It rejects non-2xx, unreadable JSON, a stalled request/body past that budget, and any body other than the exact fictional-demo contract. The landing has checking, available and unavailable states with a keyboard-operable Retry that issues a fresh request and clears the failure on success. It renders no form, sign-in, upload or sensitive input.

### D5 — Documentation and evidence are part of the foundation

`README.md` records install-from-lockfile, loopback run URLs, checks and not-implemented scope. `docs/security/threat-model.md` lists trust boundaries and marks auth, encryption, consent, legal-verification, recovery and hosting controls pending. `docs/evidence/E0-S1-builder.md` carries observed RED/GREEN evidence and risk status. Planned controls are never marked complete.

**Alternative rejected:** treating the Mira prototype page as the E0-S1 landing. It mentions AI and microphone use but does not carry the required fictional-demo/incomplete-foundation notices or the foundation API status/retry contract.

## Consequences

- The foundation page does not prove private-data security, account isolation or legal correctness; those remain future gates.
- The health route and landing are additional read-only surfaces with their own leak/retry tests.
- The lazy Mira chunk keeps the foundation first load smaller; the production build still contains the pinned SDK chunk for `/mira`.
- A route choice made in code can be revisited in a later BMAD story; it is not an approved navigation architecture.

## Open items

- Independent Codex testing and Claude review of this foundation, then owner merge approval.
- Future stories own authentication, encryption, upload validation, consent, legal verification, court access and recovery; their controls must be evidenced before activation.
- Revisit the route/lazy-loading choice if a production server or client router is introduced.
