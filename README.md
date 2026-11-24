# Project Second Chance

Local, fictional-data foundation for a legal-information and reentry-assistance application. **Local fictional-demo accounts are available; private cases and protected uploads are not.** This is not legal advice, not an eligibility decision, and not a production service.

## What exists

- A responsive landing page at `/` with the fictional-data notices, a same-origin API status check that times out after 8 seconds, a keyboard-operable retry, and a link to the account page.
- `GET /api/health`, which returns exactly `{"status":"ok","mode":"fictional-demo"}` (HTTP 200, JSON) and reads no configuration, provider or user data.
- Fictional-demo account creation, sign-in, current-account state and sign-out at `/account`, backed by Passport local authentication, Argon2id (`@node-rs/argon2`), SQLite (`better-sqlite3`), `express-session`, `csrf-sync` and per-identifier/source rate limits. No email is sent and there is no password recovery.
- The separately approved, opt-in Mira AI connection test at `/mira`. It is not needed for the foundation and is not loaded on `/`. Account activity never contacts Nuance.
- Express API bound to loopback, React/Vite/TypeScript web app, Vitest/Supertest unit and integration tests, and Playwright Chromium browser tests.

## Requirements

- Node.js 22 or newer (verified with Node v26.13.0, npm 11.20.0). The pinned SQLite driver requires Node 22+.
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
- Account page: <http://127.0.0.1:5173/account>
- Optional Mira page: <http://127.0.0.1:5173/mira>
- API health: <http://127.0.0.1:3001/api/health>

Both development services bind to `127.0.0.1`, not all network interfaces. No hosting, deployment or public exposure is configured.

## Checks

```bash
npm test             # all unit/integration tests
npm run test:api     # API/health/server tests
npm run test:e2e     # Playwright Chromium: foundation + accounts + Mira
npm run typecheck    # tsc --noEmit
npm run build        # production web build
npm run verify:secrets
npm run test:secrets
```

The browser suite starts both local servers with `PSC_E2E_NO_KEY=1`, so no provider call is possible during automated tests. It uses a fake microphone only inside Playwright to exercise the server's honest no-key failure path.

## Configuration and secrets

The real `.env` is git-ignored and must never be committed, pasted into chat, logged or sent to browser code. `.env.example` contains placeholders only.

The optional Mira page needs `NUANCE_API_KEY` in the project-root `.env`; server code loads it programmatically. The foundation landing and `/api/health` do not read or use it. Do not start a live provider conversation without the owner's explicit authorization.

Account sessions use a generated secret at `runtime/auth-session-secret` and a SQLite file at `runtime/psc-auth.sqlite`. Both are under the git-ignored `runtime/` directory; never commit, paste or back up that directory into source control. The secret is generated once with `crypto.randomBytes`; a missing or too-short secret fails startup closed rather than using a predictable fallback. Account passwords are stored only as Argon2id hashes.

## Not implemented yet

Private cases, protected/encrypted uploads, document extraction, employment notices, legal-source retrieval, court discovery, AI consent workflows, password recovery, email delivery, MFA/OAuth, hosted deployment and any automatic sending or filing. Authentication here proves a local fictional-demo identity/session boundary only; it does not provide per-case/document authorization or encryption. See `docs/security/threat-model.md` for pending controls and `docs/evidence/E1-S1-builder.md` for this slice's evidence.

## Documentation

- `AGENTS.md` — roles, boundaries and build authority.
- `docs/product/BMAD_Architecture_Spine.md` and `docs/product/Project_Second_Chance_PRD.md` — approved architecture and product requirements.
- `docs/stories/E0-S1-foundation.md` — this foundation story.
- `docs/adr/0001-foundation-tooling.md` — E0-S1 tooling, structure and contract choices.
- `docs/adr/0002-authentication-and-sessions.md` — E1-S1 authentication/session choices and limitations.
- `docs/security/threat-model.md` — trust boundaries and controls still pending.
- `docs/evidence/E0-S1-builder.md` and `docs/evidence/E1-S1-builder.md` — observed builder evidence and gaps.
