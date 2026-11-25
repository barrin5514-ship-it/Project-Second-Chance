# Project Second Chance

## Authority and roles

Read `docs/product/BMAD_Architecture_Spine.md` and `docs/product/Project_Second_Chance_PRD.md` before implementation. The Spine records approved AD-01 through AD-10; the PRD distinguishes approved decisions from proposals. A proposal is not an approval. Preserve the original FR and NFR IDs.

The owner reaffirmed on 2026-11-20: DeepSeek builds; Codex independently tests; Claude reviews; the owner approves before merge. Do not impersonate the other models or claim their review occurred. Builder tests do not replace independent testing. Work on feature branches. No merge to main, push, deployment, paid service setup, or external messages without owner authorization.

## First build target selected November 22

The owner selected a bounded avatar-first local connection prototype using the Nuance Mira persona while instructor approval of the capstone remains pending. The current next build target is `docs/stories/V0-S1-mira-connection-spike.md`, with handoff `START_AVATAR_PROTOTYPE.md`. This explicit exception supersedes the older E0-S1-only and avatar-exclusion instructions only for the scope of that prototype. It does not authorize form processing, legal advice, private records, broader MVP implementation, deployment or a paid-plan change. DeepSeek still builds; Codex does not write the application in place of DeepSeek.

The real `.env` must never be read into assistant context, quoted, committed, logged or placed in browser code. Server code may load it programmatically without disclosing values. Use synthetic credentials in tests. The selected avatar was accepted by a token-mint check; no live browser conversation has been verified.

## Delivery update November 23

The owner now reports approval of the entire Project Second Chance project. The corrected Mira prototype at `68a3c1f` passed fresh Codex checks and actual follow-up Claude review, and the owner reports a successful live rehearsal with the microphone off afterward; a read-only provider check confirmed zero active sessions. See `docs/evidence/V0-S1-live-smoke-2026-11-23.md` and the linked verification reports. This newer evidence supersedes the older no-live-conversation statement above. Owner merge approval remains separate and has not been given.

The next slice follows the existing approved delivery sequence: reconcile and complete the missing E0-S1 foundation criteria using the current working code, then proceed through the planned prerequisite gates. Read `START_NEXT_BUILD.md`. Do not restart the scaffold, remove the working opt-in Mira test, or implement the entire MVP in one pass. DeepSeek now builds directly in DeepSeek Harness; Continue and the local CLI wrapper are not required. Broad project approval does not authorize production/private records, automatic legal decisions, deployment or a paid-plan change. Later story boundaries are still refined through the installed stable BMAD workflow.

This folder is Project Second Chance, separate from DevSquadAI, CoachLab and brandon-portfolio. Do not edit those projects or alter global Git trust settings. Check the absolute path, existing files, Git ownership and working-tree state before changing anything. If an existing repository is discovered, preserve unrelated work.

## Integration and next slice — November 23

The owner explicitly approved local integration after fresh Codex retesting and actual Claude follow-up. Mira and E0-S1 are integrated on local `main` at `04a0fb8dcad1d539aaf44e56d28fe63d6e9d8dec`; `docs/evidence/E0-S1-merge-result.md` records the successful post-merge test. Older pending-merge and finish-E0-S1 instructions above are historical. The current branch `feature/e0-s2-source-readiness` is for the bounded investigation in `docs/stories/E0-S2-source-readiness.md`. Research permission is not permission for live court integration, real records, paid access or the next coding story. DeepSeek investigates; Codex verifies; actual Claude reviews; the owner approves its merge separately. Follow START_NEXT_BUILD.md's current section rather than replaying its historical handoff.

## Current delivery update — November 24

The owner explicitly approved E0-S2's local merge after fresh Codex verification and actual Claude follow-up. Main is now `c2a1dca28fd295a1a71d20f5e1e2e230edbfdb13`; see `docs/evidence/E0-S2-merge-result.md`. The historical next-target/pending-merge statements above are superseded. Current next work is `docs/stories/E1-S1-authentication.md` on `feature/e1-s1-authentication`: refine the existing authentication/session slice through installed stable BMAD 6.12.4 and mandatory TDD, then stop at independent gates. Preserve Mira and health. This slice permits fictional-demo accounts only, not protected cases/uploads, hosted access, live court/provider work or a new merge. Read the current START_NEXT_BUILD.md; no Codex-written application implementation is authorized in place of DeepSeek.

## Latest delivery target — E1-S2, November 24

The owner explicitly approved the verified authentication merge. Local main is now `e2edea5a11ba250b881449acaa951844e38abba0`; the maintained suite passed 241 tests on the merged tree. See `docs/evidence/E1-S1-merge-result.md`. Earlier next-target/pending-merge instructions above are historical. Current target is `docs/stories/E1-S2-private-cases-encrypted-documents.md` on `feature/e1-s2-private-documents`: use installed stable BMAD 6.12.4 to refine the bounded private-case/encrypted-document spec and ADRs before TDD implementation. Exact key/recovery, upload-format/limit and retention decisions remain proposals requiring their existing review gates. Fictional only; no extraction/AI/legal/court/hosted activation. Preserve authentication, health and optional Mira. DeepSeek implements; Codex tests; actual Claude reviews; owner approves E1-S2's merge separately. This handoff authorizes no Codex-written application replacement, key generation or real-record processing.

## Binding boundaries

- Modular monolith; React, Vite, TypeScript, Node.js and Express; SQLite metadata with separately encrypted private documents.
- Local and restricted hosted demonstrations use fictional data only. No real records, production launch, automatic legal eligibility, automatic sending or filing.
- No False Hope: never invent legal eligibility, deadlines, court matches, citations or outcomes. Preserve uncertainty and source provenance.
- Cloud AI is optional, provider-independent and explicitly consent-gated on the server. No external AI integration in the first story.
- Use maintained server authentication/session libraries, Argon2id, per-resource authorization and established cryptographic libraries. Never hand-roll cryptography or authentication.
- Never commit secrets, `.env` values, private databases, uploads, sensitive logs or key files. Store keys outside data snapshots and repository files.
- Court searches require permitted access. A functional clearly labeled fictional search plus guided official lookup is an approved MVP fallback. Name matches and user selections are not identity verification.
- Nora/Emma, advocate sharing, phase 2/3 capabilities and production access are outside the first build.

## Execution and evidence

Before application implementation, follow `docs/process/BMAD_STABLE_TDD.md`. Use official BMAD Method stable v6.12, pinned to npm package `bmad-method@6.12.4`; do not install the v7 preview from main, unpinned latest, or a legacy BMAD bundle from another project. A BGLAD wrapper may be used only if its underlying version and overrides are verified compatible with this baseline; the wrapper is not a substitute for checking the installed version. BMAD is not installed merely because these documents exist.

Read `docs/planning/RISK_REGISTER.md` and `docs/planning/RISK_DRIVEN_DELIVERY.md`, then start with `docs/stories/E0-S1-foundation.md` and its linked plan. Do not implement the entire PRD in one pass. Record implementation choices in ADRs, distinguishing them from approved architecture. This project-specific plan supplements the installed stable BMAD workflow; Superpowers is optional and must not replace the chosen BMAD method.

Mandatory TDD: write one behavior test, run it and observe the intended failure, implement the minimum behavior, run it successfully, then refactor with the suite green. Repeat for features and bug fixes. Test-runner setup may precede a behavior test; application behavior may not. A missing dependency, broken import, or compiler error is not sufficient RED evidence. Never fabricate prior RED evidence, weaken a safety assertion to obtain GREEN, or call tests written after behavior test-driven development. Preserve any pre-existing work; report missing TDD evidence honestly.

Every story lists applicable risk IDs and required negative-path tests before coding. Recheck applicability at story start and completion. Future-story controls stay OPEN until evidence exists; a story can finish without closing unrelated future risks, but cannot activate the risky capability ahead of its gate. Report actual commands, versions, exit codes, test counts and limitations, plus RED/GREEN/refactor evidence and requirement/risk links. Never describe unrun tests as passing or design controls as verified security. A source inspection, manual check or configuration check is not mislabeled as a TDD behavior test.

Failed required tests, critical security issues, unauthorized disclosure, unsupported legal claims or fictional/live mislabeling block completion and merge. Finish the assigned story, produce the handoff evidence, and stop for independent testing.

## Owner Git checkpoint preference — November 24

The owner requested frequent, meaningful commits and pushes to https://github.com/barrin5514-ship-it/Project-Second-Chance.git. Save scoped work at completed checkpoints, after the checks appropriate to that change; do not wait until an entire feature is finished. Record failing or incomplete verification honestly. Routine feature-branch pushes are authorized by this instruction; merges, force pushes, deployment and changes to repository visibility still require separate owner authorization. Never stage everything blindly: exclude credentials, private runtime data, keys, uploads, generated output and owner-local editor settings. A pushed checkpoint is not merge approval or a passing review gate.
