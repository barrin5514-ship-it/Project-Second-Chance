# Current next step — E1-S2 private cases and encrypted documents

Updated November 24, 2026 (America/New_York). The owner approved local E1-S1 integration after fresh Codex tests and actual Claude follow-up. Main is `e2edea5a11ba250b881449acaa951844e38abba0`; see `docs/evidence/E1-S1-merge-result.md`. The merged authentication tree passed 241 tests again. Historical pending-authentication-merge statements are superseded for that integration only.

## DeepSeek: start here

The prepared branch is `feature/e1-s2-private-documents`. Read `docs/stories/E1-S2-private-cases-encrypted-documents.md`, AGENTS.md, approved PRD/Architecture Spine, risk register and delivery plan. Use the installed BMAD 6.12.4 bmad-build workflow to investigate and refine this slice, produce the concrete implementation spec, storage/key-management ADR and upload-validation ADR, then implement through the workflow's actual gates with behavior-by-behavior TDD.

The thin slice is authenticated owner-isolated case CRUD and validated encrypted document upload/list/download/live deletion. Protect sensitive metadata as well as blob bytes. Resolve exact key storage/recovery, formats/limits and retention implications as concrete proposals through the existing review/approval gates; they were not settled by the authentication merge. Never put encryption keys in Git, browser code, data snapshots or assistant context. No private-storage application code or key has been created by this handoff.

The story includes the required cross-user, expiry/revocation, multipart/content/path, tamper/wrong-key, disk/lock/interrupted-write, cleanup/deletion and browser negative-path tests. Make the existing auth guard reusable and expiry-aware before private endpoints: req.isAuthenticated alone is insufficient. Preserve the auth startup race fix, request budgets, identity reconciliation and request protections.

Preserve accounts, public foundation/health, optional Mira, runtime settings, all prior evidence and owner-local `.vscode/`. Use fictional inputs and isolated temporary test stores/keys only. Do not start OCR/extraction, AI, legal/court features, sharing, hosted access or real-record processing. E1-S3 owns full deletion/retention/backup-restore guarantees; E1-S2 still needs honest live deletion, durable writes and restart integrity. Do not imply that uploads prove recovery or production security.

Save `docs/evidence/E1-S2-builder.md`, concrete spec/ADRs, threat-model/README/ignore/risk updates and actual RED/GREEN/regression/full-check results. Stop for Codex independent testing, actual Claude review and the owner's separate E1-S2 merge decision. No merge, push, deployment, paid/external account, external messages or live provider/court session is authorized.

## Integrated history and remaining sequence

- Mira/E0-S1: `04a0fb8`; foundation and opt-in avatar connection preserved.
- E0-S2: `c2a1dca`; bounded source readiness with both functional fictional court search and guided official lookup required. Court access and legal-source gaps stay OPEN.
- E1-S1: `e2edea5`; fictional authentication passed fresh independent checks, actual Claude review and owner approval. Local-only and deferred P3 notes remain documented.
- After E1-S2: E1-S3 deletion/recoverability, E2 local extraction, E3 server-enforced optional AI consent, verified legal/notice/court workflows, then restricted fictional demonstration. Each capability keeps its own evidence and review gates; no unattended full-MVP build.
