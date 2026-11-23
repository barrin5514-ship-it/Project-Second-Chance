# Continue session runner setup — November 22, 2026

Codex configured tooling only. DeepSeek remains the application builder. No second builder was launched by this setup.

## Verified

- Official `@continuedev/cli@1.5.47` installed locally under ignored `.setup/continue-cli`; no global CLI install.
- Existing DeepSeek configuration reused by file path without copying credentials into the repository or assistant context.
- The default custom HTTP transport repeatedly returned `Connection error`. A direct Node request authenticated successfully. Continue's built-in `FEATURE_FLAG_DISABLE_CUSTOM_FETCH=1` alternative succeeded, with `NODE_USE_SYSTEM_CA=1` and certificate verification enabled. These settings apply only to the launched process.
- Final launcher `node .setup/mira-runner.mjs --check`: exit 0, `RUNNER_READY`; all agent tools excluded. This is a runner connection check, not application verification.
- Launcher syntax and VS Code task JSON validated. Actual installed CLI command matcher verified to match `npm test` exactly and reject chained variants and `git push` for that permission.
- Preview verified expected project, feature branch, pinned CLI, explicit command list and no global permission changes.

## Use in VS Code

Stop the previous Continue IDE builder before launching another builder against the same files. Then choose Terminal > Run Task > **Mira: build with session approvals**. It opens an interactive terminal using the existing DeepSeek model configuration.

The task automatically permits file Write/Edit/MultiEdit tools and listed exact install/build/test/read-only Git commands. Other terminal commands retain the CLI's normal Ask behavior; additional arguments may require approval. BMAD checkpoints still apply. Do not select Auto mode or save broad permanent approvals.

Each launch uses a separate ignored Continue home under `.setup/runner-sessions`, so its CLI permission state does not modify global Continue IDE settings. The launcher asks DeepSeek to save progress and a truthful builder report after completed behaviors and before stopping. Report persistence depends on the builder following those instructions; an abrupt crash can still prevent the final write.

## Limits

This is approval management, not a filesystem sandbox. File edit tools are broadly allowed for the session; project and secret boundaries are instructions, not OS-enforced confinement. Listed npm commands execute project scripts and dependencies. Continue's own tool restrictions can still reject a command. This setup reduces prompts; it does not guarantee zero prompts, unattended recovery, or completion.

The launcher and installed CLI are local ignored setup assets. The tracked VS Code tasks refer to those local assets; a fresh checkout needs the local setup recreated. No application tests, live Mira conversation, Codex acceptance gate or Claude review are claimed here.

## November 23 correction

The first real build session exposed permission-list omissions: compound read-only checks, output-filtered tests and the required BMAD renderer were not preapproved. The runner uses Windows PowerShell 5, so an initial `&&` chain failed and the builder retried with alternatives. Codex inspected the saved session, added 17 reviewed exact commands in ignored `.setup/mira-reviewed-commands.json`, added PowerShell-compatible guidance, and included the latest Codex findings in the new-session handoff. Actual installed matcher checks pass for all 17, including rejection of appended `; git push` and standalone `git push`. No broad Bash wildcard or Auto mode was added. A running CLI does not reload these launch flags; a fresh task launch is required. End-to-end unattended build behavior is not verified, and new/unlisted commands can still prompt. Do not claim all interruptions are solved.
