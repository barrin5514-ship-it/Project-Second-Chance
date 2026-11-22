# Stable BMAD and test driven delivery

Owner instruction recorded November 20, 2026: use the official stable v6.12 line linked in the BMAD README, include test-driven development and plan against all documented risks. This adds delivery controls; it does not replace AD-01 through AD-10 or approve proposed product scope.

## Version boundary and verification

Selected pin: `bmad-method@6.12.4`. The official V6.12 branch package.json identifies 6.12.4. The linked main README distinguishes stable v6.12 from v7 preview. Because branches and default npm tags can change, do not use main/v7 skill-install commands or unpinned `latest` for this project.

The published npm package version and integrity were also verified on November 20; see `../evidence/BMAD-baseline-verification.md`. This confirms package availability, not a completed framework installation.

Sources checked November 20, 2026:
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/README.md#stable-v612-recommended-if-stability-is-needed-until-v7-is-finalized-for-release
- https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/V6.12/package.json
- https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/V6.12/README.md

The source README specifies Node.js 20.12+, Python 3.10+ and uv. This is the framework minimum, not a guarantee that every application dependency supports those versions. Record actual versions and verify compatibility before dependency selection.

Setup update November 20: official BMAD core and Method 6.12.4 are installed and recorded in `_bmad/_config/manifest.yaml`. The original local Codex BGLAD plugin was not found in the checked locations. Instead, project-local Continue BGLAD launchers load the 29 unmodified official skills from `.agents/skills`. The installer does not list Continue as a native target; the shared skills were installed through its supported Codex target, then bridged through Continue's documented local prompts/rules. Do not claim to have restored the unavailable original plugin. See `.continue/BGLAD_SETUP.md` and `docs/evidence/BGLAD-setup-verification.md`.

## Builder preflight before application code

1. Read project AGENTS.md, approved product documents, the first story, risk register and delivery plan. Verify the absolute workspace and preserve existing work. Check Git state before mutations.
2. Record Node, npm, Python and uv versions. Verify the pinned package is available from the intended registry; record version and integrity metadata. If unavailable, report the blocker without replacing the version or altering global proxy/registry settings.
3. Run `npx bmad-method@6.12.4 install` from ProjectSecondChance only. Choose the stable BMad Method and applicable coding-tool setup from the actual installer options; do not invent unsupported Continue options. Document manual instruction loading if native Continue integration is unavailable.
4. Inspect the generated installation/version records, configuration and files. Confirm they identify stable 6.12.4 and the intended project. A pinned launcher alone is not proof of the installed framework version. Check the installer's actual options/records; if they cannot establish the version, stop before application code and report the evidence.
5. Preserve AGENTS.md and source PRD/Spine. Identify applicable installed skills and their actual invocation method. Use installed `bmad-help` for navigation and the stable `bmad-build` workflow for implementation. Existing approved artifacts supply context; do not restart product discovery or silently overwrite the PRD.
6. Record any discrepancies between generated workflow defaults and the owner's roles, TDD requirements or product safeguards. Owner instructions and approved architecture take precedence. Do not run an unattended loop across all stories.

## Mandatory test first cycle

For each behavior or bug fix:

1. Define the applicable acceptance criterion, FR/NFR and risk IDs. Write one focused test for observable behavior, including the required negative path. Prefer real boundaries; use controlled fixtures/fault injection for external failures.
2. RED: run the test before implementing that behavior. Capture test name, command, exit and expected assertion failure. Resolve setup/import/type errors first; they do not demonstrate the behavioral assertion catches the missing behavior.
3. GREEN: write only enough production code to satisfy the test. Run it and the relevant existing suite. Keep safety assertions intact; do not weaken them to achieve a pass.
4. REFACTOR: improve structure without changing behavior. Rerun the relevant suite and record the result. If no refactor is needed, say so and still record the regression check.
5. Repeat for the next behavior. Before story handoff, run the project's documented full test command, required browser/integration suites, type checks and build. Name every failure or unrun check. A targeted green test is not proof the whole project passes.

Minimal test harness/configuration may precede behavior tests. Generated app behavior is still subject to test-first development. Manual source-permission review, dependency checks, installation checks and visual inspection are necessary evidence but are not called RED/GREEN tests. Never reconstruct a fictional RED run after implementation. Preserve existing work if code is discovered, report its actual status and missing TDD evidence, and add regression protection without misrepresenting history.

## Story and risk gate

Every story must carry acceptance criteria, relevant risk IDs, negative-path tests, implementation ADRs where needed, evidence paths and open blockers. A new risk discovered in testing is added before the next affected implementation step. Proposed future stories are refined by stable BMAD before coding; their names in the delivery plan are not blanket build authorization.

Controls for a capability must be evidenced before that capability activates, not deferred to final QA. For example, private document workflows cannot activate ahead of authorization, encryption, key-handling and upload protections. Cloud transmission cannot activate ahead of consent checks and privacy review.

DeepSeek implements and supplies RED/GREEN/refactor evidence. Codex independently tests behavior and failure cases. Claude reviews code, security and legal-safety assumptions. The owner approves merge only after required evidence and blockers are resolved. A provider/tool limitation cannot be hidden by claiming another agent ran. Human legal-content and independent security review for real use remain distinct from model review.

## Status reporting

Use OPEN, IN PROGRESS, AWAITING INDEPENDENT VERIFICATION, MITIGATED IN TESTED SCOPE or BLOCKED for risks. Documentation alone never marks a risk mitigated. Record what passed, what did not run, remaining exposure and the scope of each result. The overall MVP remains incomplete until all five approved feature gates and demo requirements are evidenced. Production access remains separately blocked.
