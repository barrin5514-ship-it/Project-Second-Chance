# V0 S1 Mira local connection prototype

Status: selected first prototype in the owner's November 22 discussion, while instructor approval of the larger capstone is pending. This bounded prototype supersedes E0-S1 as the next build target; it does not approve a new full MVP or imply teacher approval. DeepSeek remains builder, Codex independently tests, Claude reviews and the owner approves any merge.

## Goal

Demonstrate the chosen Nuance Mira persona appearing, receiving a short non-sensitive spoken greeting, replying and ending cleanly in a local Project Second Chance webpage. No form workflow is implemented in this story. The future direction has two optional modes: guidance only and voice filling of permitted non-sensitive fields, with correction and user confirmation. Those modes are subsequent stories, not scope for this test.

## Current evidence

The owner created and saved a Nuance API key locally. A minimal authenticated usage check succeeded. The API accepted a session-token request selecting `mira`. Neither probe started a conversation, used the microphone or established an end-to-end browser connection. Tokens and key values were not displayed or persisted in reports. No avatar application code exists yet.

## Approved exception to earlier scope

The owner chose this avatar-first connection prototype after the initial foundation handoff. The earlier instructions excluding avatars and runtime AI from E0-S1 still apply to E0-S1, but do not forbid this explicitly selected, isolated local prototype. The original approved product documents remain unchanged. Do not implement the five-feature capstone or declare a production architecture amendment from this prototype.

## Technology and boundaries

Use the existing pinned BMAD 6.12.4 workflow and TDD. Preserve React/Vite/TypeScript and Node/Express from the architecture. Use Nuance's documented JavaScript SDK and a server-minted short-lived token. Keep the SDK behind a small replaceable connection module. Check the currently supported SDK version/API against official documentation, pin the resolved dependency in the lockfile and record the version. Do not choose a different avatar silently.

The real API key lives only in the project's ignored `.env`, read by server configuration. Never read or quote its value in assistant context, logs, tests, reports or browser bundles. Load it programmatically at runtime; use synthetic values in tests. Do not introduce a Vite-prefixed secret or send the `.env` file to DeepSeek or any model. A safe `.env.example` contains placeholders only.

## Acceptance criteria

1. Given the dedicated ProjectSecondChance workspace, when the developer starts the prototype, React and Express bind to loopback only. The page visibly labels Mira as an AI connection prototype and says it provides no legal advice. No case data, registration, private documents, form filling, sending or filing is implemented.
2. Given the page is opened, no Nuance conversation, microphone or camera starts automatically. The Start action explains that microphone audio will be sent to Nuance and provides links to the actual provider processing/recording terms. A text explanation remains usable without starting a call. No promise of unrecorded processing is made without verified terms.
3. Given an explicit Start action and user-approved browser microphone permission, the server checks the local request boundary and mints a short-lived token using the saved key, fixed selected Mira persona and a non-sensitive connection-test purpose. The browser never receives the API key. Camera input is disabled both in client media options and server session configuration. The user controls any permission dialog.
4. Given a foreign origin, unsupported method, absent required local request protection or repeated concurrent Start request, the server rejects the request without calling the provider. Implement exact loopback-origin checks, a same-origin bootstrap/CSRF mechanism and one active connection attempt per local browser session; do not expose a public unauthenticated token vending endpoint. Use test fixtures to prove these controls.
5. Given the API key is missing or the provider rejects/fails/times out, the page shows a recoverable generic error without echoing secrets, tokens or raw provider bodies. Show connecting, ready, microphone-denied, unavailable and stopped states distinctly. Do not render a simulated avatar as a live success.
6. Given the actual SDK reports the avatar is presented, the user can exchange a brief non-sensitive greeting and receive audio/video output. Start, Stop and status controls are keyboard accessible and work on a narrow viewport. Label provider output clearly as AI. No transcript/audio/video is saved by this application; provider processing is disclosed separately.
7. Given Stop, navigation away or an SDK-ended session, the connection module disconnects and releases local media. A visible one-minute test timer also calls Stop to bound the rehearsal. Verify from current official Nuance session documentation whether an additional provider-enforced duration limit is supported; document its exact configuration if available. A browser timer alone must not be described as a guaranteed provider spending limit. No automatic retries or repeated credit-spending conversations.
8. Given this story is implemented, builder evidence includes observed RED -> minimal GREEN -> refactor/regression for the applicable server/connection/UI behaviors, dependency versions, safety limits and known gaps. Tests use fake provider responses and fake keys. An actual live browser smoke test is recorded separately with what the owner observed; permission or unavailable hardware/capacity cannot be reported as passing.

## Proposed implementation file map

- Root package/lockfile, README and TypeScript/test configuration needed to run the prototype.
- `apps/server/src/config.ts`: load server-only local environment and validate required settings without logging them.
- `apps/server/src/app.ts`, `main.ts`: testable Express factory and loopback listener.
- `apps/server/src/avatar/localSession.ts`: local session/CSRF/concurrency boundary, with tested cookie/origin behavior.
- `apps/server/src/avatar/nuanceGateway.ts`: fixed-provider session-token request, timeout and sanitized failure contract.
- `apps/server/src/avatar/routes.ts`: same-origin bootstrap and POST token endpoint; no caller-supplied persona, prompt or API destination.
- `apps/web/src/avatar/connection.ts`: replaceable SDK lifecycle wrapper with camera off and explicit connect/disconnect.
- `apps/web/src/App.tsx`, `styles.css`: disclosure, Start/Stop, timer and accessible states.
- Server contract/negative-path tests and browser tests under the matching application/test directories.
- `docs/adr/avatar-connection-prototype.md`: resolved SDK/API versions, local request protection, session duration, provider terms and storage decisions.
- `docs/evidence/V0-S1-builder.md`: actual behavior and test evidence following the existing template.

These are implementation choices for the bounded spike, not instructions to create production authentication, private records or a legal assistant. Refine them through the installed build workflow before coding if its investigation identifies a conflict. Do not bypass required security behavior to make the prototype run.

## Risks and review

Apply R05/07/08/09/10/15/16/20/21/23/24 from the risk register, and treat R24's prior avatar exclusion as replaced only for this limited story. Additional prototype risks are microphone/recording disclosure, avatar-driven overtrust, API key/token leakage, local token abuse, unexpected credit consumption, SDK changes and incomplete media cleanup. Each must link to the applicable tests/ADR/evidence before the spike is called verified. This does not mark existing legal/privacy risks mitigated.

Provider rules prohibit legal advice and collection of sensitive personal data. Do not add legal form processing, passwords, identity numbers, criminal records or professional advice to the avatar prompt/tools. Use fictional, non-sensitive greetings only.

## Handoff and stop condition

DeepSeek implements V0-S1 only and reports commands, exits/counts, test-first evidence, remaining gaps and local startup instructions. No paid-plan changes, deployment, push or merge. Codex independently tests the code, Claude actually reviews it, and the owner decides any merge. Do not impersonate those reviewers or automatically continue to forms.

Official references: https://docs.nuancelabs.ai/js-sdk ; https://docs.nuancelabs.ai/keys-and-tokens ; https://docs.nuancelabs.ai/personas ; https://docs.nuancelabs.ai/safety ; https://docs.nuancelabs.ai/reference/api/server/create-a-session-token
