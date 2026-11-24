# Current next step — E1-S1 authentication and sessions

Updated November 24, 2026 (America/New_York). The owner approved local E0-S2 integration after fresh Codex verification and actual Claude follow-up. Local main is `c2a1dca28fd295a1a71d20f5e1e2e230edbfdb13`; see `docs/evidence/E0-S2-merge-result.md`. Earlier pending-merge statements in historical builder/review reports are superseded for that integration only. Court permissions and legal-source gaps remain OPEN.

## DeepSeek: start here

The prepared branch is `feature/e1-s1-authentication`. Read `docs/stories/E1-S1-authentication.md`, AGENTS.md, approved PRD/Architecture Spine, risk register and delivery plan. Use installed stable BMAD 6.12.4 bmad-build to investigate, produce the implementation spec and authentication/session ADR, and implement through its actual gates with behavior-by-behavior TDD. Do not restart the scaffold or repeat E0 research.

Build only fictional-demo account creation, sign-in, current-account state and sign-out, backed by maintained authentication/session libraries, Argon2id and SQLite. Test session fixation, expiry/revocation, CSRF, abuse limits, two-account isolation, storage failures and accessible browser flows. Library/version selection, exact routes and security settings are implementation proposals to resolve in the spec/ADR, not already-approved dependencies. The story provides acceptance criteria and the required test/evidence checklist.

Preserve the public foundation/health flow and opt-in Mira; account operations must not contact Nuance. Update obsolete accounts-unavailable copy only as real account behavior becomes available. Protected documents, uploads, AI consent gateway, legal/court features, recovery delivery and hosted deployment remain outside this story. Use fictional identifiers/credentials, no real records. Preserve owner-local `.vscode/`, existing private settings and all review evidence.

DeepSeek builds and records RED/GREEN/regression evidence. Save `docs/evidence/E1-S1-builder.md`, the BMAD spec, authentication/session ADR, README/threat-model/risk updates and actual check results, then stop for independent Codex testing and actual Claude review. The owner decides this new story's merge separately. No merge, push, deployment, paid service, external account, message, real-case query or live provider session is authorized.

## Integrated history and remaining sequence

- Mira and E0-S1 foundation: integrated in `04a0fb8`; 167 maintained tests passed after that merge, with earlier browser/independent-probe evidence preserved.
- E0-S2 source readiness: integrated in `c2a1dca`; research-only, no application change. The approved fallback requires both functional fictional candidate search and guided official manual lookup. No live court access permission or qualified legal review is claimed.
- After E1-S1: E1-S2 private cases/encrypted documents, E1-S3 deletion/recovery, local extraction, server-enforced optional AI consent, verified legal/notice/court workflows, then restricted fictional demo. Each later capability retains its own specification, evidence and approval gates; do not build the entire sequence in one run.
