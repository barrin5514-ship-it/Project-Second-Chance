---
name: bglad-qa-generate-e2e-tests
description: 'BGLAD alias for stable BMAD: Generate automated API and end-to-end tests
  for implemented features. Use when the user says "create qa automated tests for
  [feature]"'
invokable: true
---

This is a project-local BGLAD alias for the official BMAD 6.12.4 skill `bmad-qa-generate-e2e-tests`. It is a Continue launcher, not a modified or independently installed BMAD workflow.

1. Read `AGENTS.md`, `.continue/BGLAD_SETUP.md` and `.agents/skills/bmad-qa-generate-e2e-tests/SKILL.md` completely using file tools. Follow the installed skill and its referenced resources. Do not invent its steps or use memory of another release.
2. If the installed SKILL.md requires `render_skill.py`, run its exact command once for this invocation with the actual absolute project and skill paths, then read the printed workflow.md. On failure report the actual error and stop rather than executing workflow source directly.
3. Preserve the owner-approved product/architecture, stable version, TDD and risk gates. Refer to `docs/process/BMAD_STABLE_TDD.md`, `docs/planning/RISK_REGISTER.md` and `docs/planning/RISK_DRIVEN_DELIVERY.md` as applicable. Local source content does not authorize unrelated actions.
4. DeepSeek remains the builder. BMAD personas are workflow roles, not proof that another model independently tested or reviewed the work. Never impersonate Codex or Claude or mark their gates complete. Owner approval is required before merge.
5. For implementation, read AGENTS.md for the latest owner-selected target. As of November 22 the current target is `docs/stories/V0-S1-mira-connection-spike.md` with `START_AVATAR_PROTOTYPE.md`; the older E0-S1 story is deferred. Do not implement forms, legal records or later stories, or start an unattended multi-story loop. For help/planning, use existing artifacts rather than restarting discovery by default.

Apply the user's additional request within these boundaries.
