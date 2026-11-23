# Start the Mira connection prototype

**Historical handoff:** the owner has since reported full project approval and a successful live Mira rehearsal. Use `START_NEXT_BUILD.md` for the next slice. The Continue-specific instructions below describe the earlier setup; DeepSeek now builds directly in Harness.

The owner selected an avatar-first local feasibility test on November 22. Use this handoff instead of the older E0-S1 starter. DeepSeek writes the application code in Continue; Codex's work so far has been setup, documentation and connection verification only.

## In Continue

Use DeepSeek in Agent mode and invoke the project-local `/bglad-build` command. Supply the new story `docs/stories/V0-S1-mira-connection-spike.md` as the current requested change. Read and follow its full scope before implementation. The owner explicitly authorized this limited avatar exception to the earlier foundation-only plan.

Read AGENTS.md, the stable BMAD setup notes and this story. Use installed BMAD 6.12.4, observed RED/GREEN/refactor and the documented risk gates. Implement only the local Mira connection test: explicit Start, server-held secret/token minting, camera off, visible AI disclosure, accessible status and clean Stop. Never read, copy or print the real `.env` contents as model context; server code loads settings programmatically and tests use synthetic credentials. No forms, legal records or automatic submissions yet.

Record evidence, local run instructions and gaps in `docs/evidence/V0-S1-builder.md`, then stop for actual independent testing and review. Reading this handoff is not proof the avatar connection works.
