# Next build after the Mira rehearsal

Updated November 23, 2026. The owner reports the entire Project Second Chance project is approved, the live Mira test worked well, and the microphone turned off after the test. Codex confirmed zero active provider sessions. Codex and actual Claude verification of the corrected prototype are saved in `docs/evidence/V0-S1-codex-retest-68a3c1f.md` and `docs/evidence/V0-S1-claude-followup-68a3c1f.md`; live evidence is `docs/evidence/V0-S1-live-smoke-2026-11-23.md`.

## Authority and roles

The ten approved architecture decisions and five MVP capabilities remain the scope. Read AGENTS.md, the Architecture Spine and PRD. DeepSeek builds directly in DeepSeek Harness; Codex independently tests; actual Claude reviews; the owner approves merging. The retired Continue runner is not a prerequisite for further work. No merge, push, deployment, private records or paid-plan change is authorized by this handoff.

## Immediate next slice: finish the existing E0-S1 foundation

This follows the existing `docs/planning/RISK_DRIVEN_DELIVERY.md` sequence and the already-written `docs/stories/E0-S1-foundation.md`; it does not reopen the architecture or authorize building all five features at once.

1. Inspect current code, Git ownership/branch and worktree before any edits. Preserve the working Mira prototype, all prior tests, owner-local `.vscode/`, and the uncommitted Codex/Claude/live-test evidence. Do not re-scaffold or reinstall BMAD.
2. Reconcile E0-S1's ten criteria against the existing implementation. Reuse React/Vite/TypeScript, Express, loopback listeners, lockfile, test runners and secret exclusions. Record what is already evidenced and what remains.
3. Complete only the missing foundation behavior: the precise safe `/api/health` contract, responsive fictional-demo landing/status/retry behavior, run documentation, threat model and scoped evidence. Use installed BMAD 6.12.4 and behavior-by-behavior TDD with risk/requirement links.
4. Preserve Mira as an explicit, optional connection-test capability. The older E0-S1 instruction against external model requests means the ordinary foundation/health/retry flow must not trigger a provider call. It does not authorize deleting the separately approved and tested avatar. Any UI route/navigation choice is an implementation proposal for the BMAD story investigation, not a new approved architecture decision.
5. Do not implement accounts, protected uploads, forms, legal answers or court adapters in the foundation slice. They follow their prerequisite gates. A passing Mira test does not establish account isolation or private-document protection.
6. Supply `docs/evidence/E0-S1-builder.md` with actual RED/GREEN results, dependency risks, criteria mapping and remaining gaps; stop for Codex testing and actual Claude review. Do not claim those gates passed yourself. New stories belong on feature branches; preserve existing history and do not merge the Mira branch without owner approval. If a new branch starts from the unmerged Mira commit, record that dependency explicitly.

## Subsequent sequence — existing plan, not newly approved implementation specs

- E0-S2 feasibility/source readiness: investigate permitted Georgia/Nebraska court access and authoritative legal sources early. No broad scraping, paid actions or live integrations from research alone.
- E1-S1: maintained authentication/sessions with Argon2id and negative-path tests.
- E1-S2/E1-S3: user-isolated cases, encrypted documents, deletion and tested recovery.
- E2/E3: local document extraction, then the optional provider-independent AI consent gateway.
- E4/E5/E6: verified legal information, employment notice assistance and permitted court discovery or the approved functional fictional/manual fallback.
- E7: restricted fictional-data demonstration, final regression and recovery rehearsal.

Future Mira form guidance/voice-fill is not built merely because the connection spike passed. Tie it to an explicitly scoped story and the account, consent and field-confirmation controls it needs. The project remains legal information and user-controlled drafts, not legal eligibility decisions or automatic filing.
