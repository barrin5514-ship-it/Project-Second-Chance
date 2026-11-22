# Story evidence template

Template only. Nothing below is a passing test or completed review until filled with observed results. Do not store sensitive payloads, credentials, private records or keys in reports.

## Identity and scope

- Story, date, builder identity, absolute workspace and branch:
- Commit/diff scope and preserved pre-existing work:
- Installed BMAD version/config evidence and runtime/dependency versions:
- Acceptance criteria, FR/NFR and risk IDs in scope:
- Explicit exclusions and pending prerequisite ADRs:

## Test first evidence

| Behavior / acceptance criterion | FR/NFR and risk IDs | RED command, expected assertion, actual failure and exit before implementation | Minimal behavior implemented | GREEN command, count/result and exit | Refactor and regression command/result |
| --- | --- | --- | --- | --- | --- |
| Fill with observed evidence | | | | | |

If behavior already existed or a test was written after implementation, state that directly; do not invent a RED stage. Setup/import errors are not behavioral RED evidence. Keep each behavior's evidence distinguishable.

## Other necessary checks

List configuration, dependency, permission/source, manual accessibility, visual, recovery and secret-exclusion checks separately from TDD. Include exact commands or reproducible steps, dates and outcomes. Preserve official source references for permissions/fees without copying private information.

## Whole story verification

| Check and exact command | Exit | Test count / observed result | Limitations or failure names |
| --- | --- | --- | --- |
| Full test suite | | | |
| API/integration suite | | | |
| Browser/end-to-end suite | | | |
| Type check | | | |
| Build | | | |
| Applicable security/privacy/legal negative paths | | | |

Do not mark an unrun command PASS. Record applicability and why for checks outside the story's capabilities. Code coverage percentage does not replace meaningful adverse-case tests.

## Risk status and residual exposure

| Risk ID | Applicable control / evidence path | Actual status and tested scope | Remaining exposure / blocker / next responsible role |
| --- | --- | --- | --- |
| | | OPEN until supported | |

Use OPEN, IN PROGRESS, AWAITING INDEPENDENT VERIFICATION, MITIGATED IN TESTED SCOPE or BLOCKED. Builder completion does not assert independent risk closure. Future controls remain OPEN.

## Run and review handoff

- Local startup steps and loopback URLs:
- Files changed and why:
- Known failures, unrun checks, dependency findings and remaining risks:
- Codex independent report: pending until actually performed.
- Claude review: pending until actually performed.
- Owner merge decision: pending until actually given.
- Human legal/security review for real-user launch: separate gate; not established by this report.
