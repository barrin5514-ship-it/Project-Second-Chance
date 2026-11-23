# Mira live smoke test — November 23, 2026

Status: **OWNER-REPORTED LIVE SUCCESS AND MICROPHONE-OFF CONFIRMED; PROVIDER SESSION ENDED.** This is owner-reported live evidence, not direct assistant observation of audiovisual playback. The live rehearsal checkpoint is complete; merge approval remains separate.

The owner explicitly authorized a live Mira test after the Codex/Claude gates passed, and also reported that the entire Project Second Chance project has now been approved. This records the owner's report of project approval; it does not change merge/deployment gates or authorize private records/production use. Broader delivery can proceed within the established approved product scope after this bounded spike.

Reviewed code: `68a3c1f4c24d75d39d6c0a4147c9691c64fd947f`. Loopback API and Vite server started for the owner test; no application code changed. Account usage-only preflight returned HTTP 200, 10 available credits, zero active conversations and concurrency limit one. No session token was minted by that preflight.

Local launch uses `NODE_USE_SYSTEM_CA=1` with certificate checks enabled; `PSC_E2E_NO_KEY=0` permits the actual server configuration to load the saved key programmatically. No real credential was read into assistant context or printed. Provider access remains user-initiated by the Start button. The failed browser-automation handoff did not execute Start or microphone permission; the owner receives the direct local page link instead.

## Owner steps for one authorized rehearsal

Open `http://127.0.0.1:5173/`, review the AI/microphone/provider disclosure, press Start once, and control the browser microphone permission. Camera stays off. Speak first with a non-sensitive greeting such as “Hi Mira, this is a connection test. How are you?” Check that Mira appears and her reply is audible; press Stop before or at the one-minute rehearsal limit, then check the microphone indicator clears. Do not use case details or personal records. Do not repeatedly press Start if an error occurs; report the displayed generic message for diagnosis.

## Recorded result

- Owner's actual report: “link works test went very well.” This confirms the link works and the owner reports a successful rehearsal overall. Individual observations below were not separately described.
- Page/link: works, confirmed by owner.
- Mira visible/audible, greeting exchange, permission sequence and camera-off: positive overall test report; separate item-by-item confirmation not yet recorded. Do not invent a transcript, timing or detailed observations.
- Browser microphone indicator after Stop/end: owner explicitly confirmed, “Yes, the microphone turned off.”
- Read-only post-test Nuance usage check: HTTP 200, **zero active sessions**, **9 available credits**. Pre-test allowance was 10. The available balance decreased by one credit during the rehearsal interval; no additional conversation was started by Codex. This does not establish minutes per credit or a general pricing conversion.

No assistant-observed transcript or physical speaker/microphone assertion is claimed. No merge, push or deployment occurred. Owner-reported live success and local microphone shutdown are recorded separately from the independently checked provider end state. All broader legal/privacy risks and deferred review notes retain their prior status.
