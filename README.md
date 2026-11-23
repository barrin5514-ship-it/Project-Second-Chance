# Project Second Chance

Local, fictional-data foundation for a legal-information and reentry-assistance application. **Development foundation — accounts and protected uploads are not available yet.** This is not legal advice, not an eligibility decision, and not a production service.

## What exists

- A responsive landing page at `/` with the fictional-data and incomplete-foundation notices, a same-origin API status check, and a keyboard-operable retry when the local API is unavailable.
- `GET /api/health`, which returns exactly `{"status":"ok","mode":"fictional-demo"}` (HTTP 200, JSON) and reads no configuration, provider or user data.
- The separately approved, opt-in Mira AI connection test at `/mira`. It is not needed for the foundation and is not loaded on `/`.
- Express API bound to loopback, React/Vite/TypeScript web app, Vitest/Supertest unit and integration tests, and Playwright Chromium browser tests.

## Requirements

- Node.js 20.12 or newer (verified with Node v26.13.0, npm 11.20.0).
- Dependencies are pinned by `package-lock.json`. Install with the lockfile:

```bash
npm ci
```

- Optional: install the matching Playwright browser once for browser tests:

```bash
npx playwright install chromium
```

## Run locally

```bash
npm run dev
```

- Web app: <http://127.0.0.1:5173/>
- Optional Mira page: <http://127.0.0.1:5173/mira>
- API health: <http://127.0.0.1:3001/api/health>

Both development services bind to `127.0.0.1`, not all network interfaces. No hosting, deployment or public exposure is configured.

## Checks

```bash
npm test             # all unit/integration tests
npm run test:api     # API/health/server tests
npm run test:e2e     # Playwright Chromium: foundation + Mira
npm run typecheck    # tsc --noEmit
npm run build        # production web build
npm run verify:secrets
npm run test:secrets
```

The browser suite starts both local servers with `PSC_E2E_NO_KEY=1`, so no provider call is possible during automated tests. It uses a fake microphone only inside Playwright to exercise the server's honest no-key failure path.

## Configuration and secrets

The real `.env` is git-ignored and must never be committed, pasted into chat, logged or sent to browser code. `.env.example` contains placeholders only.

The optional Mira page needs `NUANCE_API_KEY` in the project-root `.env`; server code loads it programmatically. The foundation landing and `/api/health` do not read or use it. Do not start a live provider conversation without the owner's explicit authorization.

## Not implemented yet

Accounts, sign-in, sessions, private cases, protected/encrypted uploads, document extraction, employment notices, legal-source retrieval, court discovery, AI consent workflows, and any automatic sending or filing. Accounts and protected uploads are explicitly unavailable. See `docs/security/threat-model.md` for pending controls, and the E0-S1 evidence at `docs/evidence/E0-S1-builder.md`.

## Documentation

- `AGENTS.md` — roles, boundaries and build authority.
- `docs/product/BMAD_Architecture_Spine.md` and `docs/product/Project_Second_Chance_PRD.md` — approved architecture and product requirements.
- `docs/stories/E0-S1-foundation.md` — this foundation story.
- `docs/adr/0001-foundation-tooling.md` — E0-S1 tooling, structure and contract choices.
- `docs/security/threat-model.md` — trust boundaries and controls still pending.
- `docs/evidence/E0-S1-builder.md` — observed builder evidence and gaps.
