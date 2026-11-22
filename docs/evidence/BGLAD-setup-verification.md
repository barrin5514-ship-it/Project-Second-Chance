# BGLAD Continue DeepSeek setup verification

Date: November 20, 2026. Scope: development workflow setup only. No application implementation, application security tests, independent product review or production integration is claimed.

## Installed framework

Official command run from ProjectSecondChance:

`npx --yes bmad-method@6.12.4 install --yes --modules bmm --tools codex --user-name Brandon --communication-language English --document-output-language English --set bmm.user_skill_level=beginner --all-stable`

Result: exit 0. The installer reported core and BMad Method installed. `_bmad/_config/manifest.yaml` independently identifies installation/core/bmm version 6.12.4. There are 29 official skills under `.agents/skills`.

The installer has no native Continue target. The supported Codex target provides shared skill files; the Continue bridge is project-local configuration added separately. The original Codex BGLAD plugin was not found and was not silently reconstructed or represented as installed.

## Continue integration

- Existing VS Code extension: `continue.continue-2.0.0-win32-x64`.
- 29 invokable BGLAD aliases plus `/bglad` orientation prompt created in `.continue/prompts`.
- Each alias points to an existing official `.agents/skills/bmad-*/SKILL.md`; original skill contents were not renamed or modified.
- Always-applied `.continue/rules/00-bglad-project.md` carries model-role boundaries, approved scope, mandatory TDD, risk gates and credential exclusions.
- Installed Continue extension source confirms local `.continue/prompts` and `.continue/rules` Markdown loading and `invokable` support.
- Local Continue config validates against the installed extension's `config-yaml-schema.json`. Explicit `tool_use` and non-thinking request mode are configured for the existing DeepSeek entry. Credential preservation was checked in memory; it was never printed or written into project files.
- Previous global Continue configuration backed up beside the original under the user's `.continue` folder. No global API key or configuration file was copied into the repository.

## Actual command results

| Check | Observed result |
| --- | --- |
| Framework installer | Exit 0; core/bmm 6.12.4 in manifest. |
| `python .setup/verify_bridge.py` | Exit 0; 29 skills, 30 valid aliases, valid always-applied rule, valid installed Continue config schema, expected tool settings, and no saved DeepSeek key in scanned project instruction/config/source files. |
| `uv run --no-cache _bmad/scripts/render_skill.py --project-root <absolute project path> --skill <absolute .agents/skills/bmad-build path>` | Exit 0; printed an absolute rendered workflow.md path under `_bmad/render/bmad-build`. Rendering was checked; the build workflow was not executed to implement application code. |
| `uv run --no-cache _bmad/scripts/resolve_config.py --project-root . --key core.user_name --key modules.bmm.user_skill_level` | Exit 0; resolved Brandon and beginner. |
| Authenticated DeepSeek `/models` probe | Configured alias `deepseek-coder`; available IDs deepseek-flash and deepseek-v4-pro. No project files sent. |
| Synthetic DeepSeek tool-call probe | Exit 0; requested `deepseek-coder`, provider returned `deepseek-flash`, emitted `setup_ready` native function call; 334 total tokens on final probe. The synthetic function performed no action. |
| `code --new-window <ProjectSecondChance path>` | Exit 0; window inventory showed Welcome - ProjectSecondChance - Visual Studio Code. |

## Issues encountered and limits

Node/npm initially rejected a certificate chain during dependency downloads. Process-local `NODE_USE_SYSTEM_CA=1` used the existing Windows trusted roots, and installation succeeded. HTTPS verification remained enabled; global registry/TLS settings were not weakened.

The pinned tool installer emitted a warning about transitive glob 11.1.0 being deprecated and carrying known vulnerabilities. This is an OPEN toolchain finding, not a claim that the application has that dependency or is secure. Review before allowing untrusted inputs through the installer/tooling; do not silently change the owner's framework pin.

A default-cached uv check failed within the restricted execution environment because its interpreter cache could not be written. The official build render command with `--no-cache` succeeded; the final configuration check with `--no-cache` also succeeded under user-level runtime permissions. No failed result is recorded as a pass.

Native VS Code control timed out while binding the editor window with an expired continuation error. The editor window opened, but the command menu and an end-to-end conversation inside Continue were not visually verified. Reload/start a fresh Continue conversation, select DeepSeek Coder and Agent mode, then invoke `/bglad` or `/bglad-build`. If the list has not refreshed, explicitly ask Agent mode to read `.continue/prompts/bglad-build.md`. Authentication and native tool calls were verified separately via a minimal synthetic API probe, not misrepresented as an in-editor test.

No application code was created, no Git repository initialized, and no product test/review gates were marked complete. The E0-S1 builder run remains the next action.
