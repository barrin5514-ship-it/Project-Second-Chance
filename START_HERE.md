> November 22 update: the next DeepSeek build is now the bounded Mira connection prototype. Use START_AVATAR_PROTOTYPE.md and docs/stories/V0-S1-mira-connection-spike.md instead of the older E0-S1 prompt below. The previous foundation plan is retained as history.

# Start Project Second Chance

Prepared November 20, 2026. The approved documents and build handoff are present. Official BMAD core and Method 6.12.4 are now installed, with project-local BGLAD commands for Continue. No application code or Git repository has been created; installing the framework is not implementing the MVP.

Updated method: official stable BMAD v6.12 pinned to package 6.12.4, mandatory test-driven development, and risk-driven story gates. This updated prompt supersedes the earlier foundation-only prompt. Setup evidence is in `docs/evidence/BGLAD-setup-verification.md`.

## In VS Code

1. Open this exact folder: `<repo>`.
2. In Continue, select DeepSeek and Agent mode.
3. Paste the prompt below. The files it needs are already in this folder.

Shortcut after Continue reloads the workspace: select DeepSeek Coder and Agent mode, then type `/bglad-build` and ask it to implement E0-S1 only. `/bglad` provides orientation. These are project-local Continue aliases for the official installed stable skills; see `.continue/BGLAD_SETUP.md` and `.continue/BGLAD_COMMANDS.md`.

## Builder prompt

You are the DeepSeek Builder for Project Second Chance. Read AGENTS.md, docs/product/BMAD_Architecture_Spine.md, docs/product/Project_Second_Chance_PRD.md, docs/process/BMAD_STABLE_TDD.md, docs/planning/RISK_REGISTER.md, docs/planning/RISK_DRIVEN_DELIVERY.md, docs/stories/E0-S1-foundation.md and docs/superpowers/plans/2026-11-20-foundation.md.

First verify the absolute workspace, current files, Git state and tool capabilities. Confirm this is ProjectSecondChance and not DevSquadAI, CoachLab or brandon-portfolio. Do not modify any other project or global Git configuration.

Verify prerequisites and the installed BMAD version. If absent, install official BMAD using `npx bmad-method@6.12.4 install` in this project, select stable/BMad Method if prompted and verify the resulting installation records actually identify 6.12.4. Never select v7 preview or update silently. Use a supported Continue configuration if the installer offers one; otherwise document the compatible file/instruction loading method without claiming native integration. If the required pinned package or compatible setup cannot be verified, report the blocker before application code. Do not substitute another version.

Then use the installed stable BMAD build workflow to implement E0-S1 only, following its acceptance criteria, risk links and mandatory RED → GREEN → REFACTOR cycle. You are authorized to create the local app foundation and install the pinned BMAD framework and dependencies necessary for this story. Work on a feature branch. Use the approved stack, fictional data only, and no cloud AI, court connections, paid services, hosting, deployment, push or merge. Record exact dependency versions and implementation choices. Do not introduce auth or encryption code until their dedicated stories and ADRs. Inspect any files created by the installer before adopting them; preserve project AGENTS.md and approved documents.

Run the prescribed checks, record actual BMAD version evidence, test failures before behavior implementation, passing runs, refactor checks, risk/requirement links and limitations in docs/evidence/E0-S1-builder.md, and explain how to run the app locally. Follow docs/evidence/STORY_EVIDENCE_TEMPLATE.md. Stop after the story for Codex independent testing and Claude review. Do not claim the full MVP or security has been completed. Keep all future risk controls open until their tests and reviews occur.

## Next handoff

Return the builder report and this folder location to Codex. Codex will inspect the files and independently test E0-S1. Claude code review and owner merge approval remain separate gates.

## Following build slices

E0-S1 establishes a testable foundation. Next come dedicated stories for maintained-library authentication and secure sessions; private cases and ownership tests; then validated encrypted document upload and download. Later stories implement local extraction, AI consent, notice assistance, cited legal information and court discovery. Those later stories are not authorized by the first-story prompt.
