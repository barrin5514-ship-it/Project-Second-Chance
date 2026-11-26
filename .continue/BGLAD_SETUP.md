# BGLAD in Continue for Project Second Chance

Configured November 20, 2026. This is a project-local Continue bridge to official stable BMAD 6.12.4, not a restored copy of the former Codex BGLAD plugin. The official stable installer does not list Continue as a native target. Its shared skill files were installed using the supported Codex target into `.agents/skills`; Continue accesses those same unmodified instructions through the aliases below.

## Components

- `_bmad/_config/manifest.yaml`: actual installed core and bmm version records, both 6.12.4.
- `.agents/skills/bmad-*/SKILL.md`: 29 official skills, including build, help, architecture, sprint planning and reviews.
- `.continue/prompts/bglad*.md`: invokable Continue aliases, loaded only when selected.
- `.continue/rules/00-bglad-project.md`: always-applied project boundary, roles, TDD and risk instructions.
- `AGENTS.md`, `docs/product`, `docs/planning`, `docs/process`: the existing project decisions and build gates.

Continue 2.0.0 is installed. Its bundled loader supports Markdown prompts/rules and the `invokable` property. No project file contains a DeepSeek API key. The existing global Continue model configuration supplies authentication; the setup does not copy it into the repository.

## Use in VS Code

Open this ProjectSecondChance folder as the workspace. Open Continue, select the configured DeepSeek model and Agent mode. Start a new conversation after setup so workspace rules and prompts reload. Type `/bglad` to orient, or `/bglad-build` to implement the authorized first story. If Continue has not refreshed its prompt list, use Developer Reload Window or restart VS Code; the fallback is to ask Agent mode to read the matching `.continue/prompts/bglad-build.md` file explicitly.

For a setup-only check, ask: “Read AGENTS.md, .continue/BGLAD_SETUP.md and the installed BMAD manifest. Report the project, BMAD version, model selection if visible, roles and next story. Do not edit files, install anything or start building.”

For the build, select `/bglad-build` and add: “Implement E0-S1 only using its story and linked plan, mandatory TDD and listed risk gates. Stop after builder evidence for independent Codex testing and Claude review.”

Complete catalog: `.continue/BGLAD_COMMANDS.md`. BGLAD names are aliases; canonical skill names and installed files remain bmad-* so framework references continue to work. No alias grants permission to broaden scope or skip a review.

## Network and model notes

The saved model label is DeepSeek Coder with model `deepseek-coder`. An authenticated synthetic test confirmed that the provider currently serves this alias as `deepseek-flash` and returns native tool calls. This observation does not select the app's future runtime AI provider and does not claim the legacy label identifies a separate model.

The local Continue configuration now explicitly enables `tool_use` and sends `thinking.type=disabled`, matching the verified native-tool test and avoiding the newer thinking-history requirements in this older Continue integration. The previous config was backed up beside the original, outside this project; the saved key was preserved. Other model entries were preserved.

BMAD download initially failed certificate verification under Node's bundled trust set. Running npm for this setup with process-local `NODE_USE_SYSTEM_CA=1` used the existing Windows trust store and succeeded with HTTPS verification enabled. No global TLS verification or registry setting was weakened. For future npm operations with the same certificate error, use that process-local setting rather than disabling SSL validation.

The pinned installer emitted a deprecation/security warning for its transitive glob 11.1.0 dependency. Keep this recorded as an open toolchain finding for review. No application dependency tree or application security posture has been validated yet.

## Automated coordinator (November 26)

The supported noninteractive agent CLIs are wired through `bglad/orchestrator.mjs`; see `bglad/README.md` and `docs/evidence/BGLAD-automation-verification-2026-11-26-resume.md`. The owner submits one assignment to DeepSeek, which implements/verifies it and runs:

```powershell
node bglad/orchestrator.mjs run --task bglad/task.json
```

Codex tests first; Claude reviews only after Codex PASS. The coordinator stores state under `.bglad/` (ignored) and never commits/pushes/merges/deploys/migrates. Full automatic correction uses `--builder-dsh` through the installed Harness account route and the non-secret `bglad/headless-account.patch.yml`; no API key is stored in the project. Claude requires a valid login. Codex behavioral tests should use the isolated-copy/no-cache method in `bglad/README.md`; do not bypass the sandbox. Current environment blockers and prohibited bypasses are recorded in the evidence report. This adapter does not replace BMAD skills, BGLAD aliases, AGENTS.md or the owner approval gate.

## Limits of verification

Successful framework installation, file/schema checks and an authenticated tool-call probe do not prove Continue's complete UI workflow or the application's features. See `docs/evidence/BGLAD-setup-verification.md` for observed results and remaining checks. Do not claim application code or independent code review is complete.
