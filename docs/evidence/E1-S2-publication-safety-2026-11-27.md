# E1-S2 GitHub publication safety — remediation and owner decision

Date: November 27, 2026. This is a non-destructive local assessment. No GitHub push, force push, remote deletion, visibility change, history rewrite, merge or deployment occurred. Owner-specific absolute path values are not reproduced in this report.

## 1. Confirmed exposure categories and counts

Actual refs checked read-only:

- `origin/main` = `e2edea5a11ba250b881449acaa951844e38abba0` (26 commits).
- `origin/feature/e1-s2-private-documents` = `744f00a11f85d37dd5fcf98b80928c843c776e75` (29 commits).
- Local `HEAD` = `4f5787c` (44 commits), **15 commits ahead** of the published feature.

| Category | Published (`origin/main` and `origin/feature`) | Local-only committed at HEAD | Uncommitted working evidence |
| --- | ---: | ---: | ---: |
| Owner-specific absolute user path | **6 files** | **8 files** | **8 evidence files** (also 18 ignored generated BMAD render files) |
| Credentials/API keys/private-key markers | 0 identified | 0 identified | 0 identified |
| Real `.env` values | 0 (`.env.example` only, empty placeholder) | 0 | 0 |
| Runtime databases / journals | 0 tracked | 0 tracked | 0 tracked |
| Encryption keys / `.psc` ciphertext | 0 tracked | 0 tracked | 0 tracked |
| Browser artifacts / diagnostics with sensitive values | 0 tracked artifacts | 0 tracked artifacts | 0 tracked artifacts |
| Real legal records | 0 tracked | 0 tracked | 0 tracked |
| Owner email address | 0 tracked matches | 0 tracked matches | 0 tracked matches |

The history pattern scan found **14 unique path-bearing files** and **0 credential/private-key files** across reachable history. The prior “six published plus seventh unpublished” count was a point-in-time count; the actual local-only committed count is now **eight** because later Task evidence added files. The previous single-file count must not be treated as complete.

**Category correction — November 27:** of the eight local-only files, four (`E1-S2-nr1-correction`, `E1-S2-task02`, `E1-S2-task03`, `E1-S2-task05`) contained only a shared `Public` absolute path used as the isolated-copy location, not the owner-profile path. The other four local-only files contained owner-profile paths. All eight still required redaction and are counted as absolute-path exposure, but the stricter owner-profile category applies to four.

Six published files (names only; values omitted):

- `START_HERE.md`
- `_bmad-output/implementation-artifacts/spec-v0-s1-mira-connection-spike.md`
- `docs/evidence/E0-S1-builder.md`
- `docs/evidence/E0-S2-builder.md`
- `docs/evidence/V0-S1-builder.md`
- `docs/product/Project_Second_Chance_PRD.md`

Eight local-only committed files at HEAD (names only):

- `bglad/README.md`
- `docs/evidence/BGLAD-automation-setup-2026-11-26.md`
- `docs/evidence/BGLAD-automation-verification-2026-11-26-resume.md`
- `docs/evidence/E1-S2-corrective-2026-11-25.md`
- `docs/evidence/E1-S2-nr1-correction-2026-11-26.md`
- `docs/evidence/E1-S2-task02-storage-directory-integrity-2026-11-26.md`
- `docs/evidence/E1-S2-task03-shutdown-reliability-2026-11-26.md`
- `docs/evidence/E1-S2-task05-late-response-2026-11-27.md`

The eight uncommitted working evidence files were also redacted before any checkpoint; ignored generated BMAD render files were redacted in place but are not publication candidates.

## 2. Current-file remediation

The local working tree was scanned recursively (excluding Git, dependencies, runtime, setup/state, generated test outputs). Every current occurrence of a local-user absolute path was replaced with `<repo>`, `<isolated-copy>` or `<owner-home>` as appropriate.

- 14 tracked files, 8 untracked evidence files and 18 ignored generated render files were changed.
- No test totals, dates, reviewer findings, filenames, commit references or limitations were changed.
- No application source or maintained test was changed.
- No owner-specific path remains in current tracked or untracked non-ignored files.
- `rg`/Git scans after remediation return zero path matches; `git diff --check` and `node scripts/verify-secrets.mjs` pass.

**This does not remove historical exposure.** The published refs and the 15 unpublished local commits still contain the old path strings.

## 3. Publication checks

Added:

- `scripts/check-publication-safety.mjs` — scans tracked + untracked non-ignored working files; reports only file/category, never values.
- `scripts/check-publication-safety.test.mjs` — 6 tests: absolute user path, private-key marker/token, portable placeholders/legitimate fixture, prohibited env/database/key/ciphertext paths, CLI synthetic violation, and CLI clean fixture.
- `package.json`: `check:publication`, `test:publication`.
- `.gitignore`: `*.psc`.

Current result: `check:publication` exit 0; `test:publication` **6/6** (including CLI integration coverage). The check does not scan committed history and does not replace history remediation.

### Correction after independent review — November 27

The first publication-check CLI entrypoint comparison was ineffective on Windows, so the command exited 0 without scanning. Codex also found five diagnostic `.txt` evidence files still containing absolute user paths. The entrypoint now compares resolved `process.argv[1]` with `fileURLToPath(import.meta.url)`; CLI tests cover a synthetic violation (nonzero exit, category-only output) and a clean fixture. The five log files were redacted with the same placeholders, preserving their recorded results and provenance. The check now prints its scan result and returns 0.

**Second correction — November 27:** Claude found the absolute-path rule did not match JSON-escaped Windows paths (doubled backslashes), typical of source manifests and coordinator state. The rule now accepts any drive letter with one or two backslashes or forward slashes before `Users`, and tests cover both plain and JSON-escaped forms plus a CLI JSON fixture. The check/test count remains six unit/integration tests.

## 4. History remediation plan — owner decision required

Published history requires an owner decision because six files are already on both remote refs and local history contains eight more path-bearing files.

### Option A (recommended if removal is required): owner-authorized history rewrite

- Rewrite all descendants of the earliest exposed commit on `main` and `feature/e1-s2-private-documents`, replacing the local-user path strings with neutral placeholders.
- This changes commit hashes for both published refs; all 44 local commits may need reconstruction; 26/29/44 counts are current pre-rewrite.
- Force-push both refs only after separate owner authorization; notify collaborators; all clones must reset/reclone.
- Create and verify a local `git bundle` backup outside the repository before any rewrite; preserve old refs/hashes in a private backup, not an additional public copy.
- GitHub may retain cached commit objects, commit URLs, search/index caches, PR refs or forks even after force-push. Deleting/archiving the public repository or GitHub support may be required for full removal.
- Preserve the historical text provenance through the rewrite record; do not rewrite test totals or findings.

### Option B: forward-only redaction only

- Keep current-file remediation and publish only new commits after owner approval.
- Historical commits and both remote refs continue to expose the paths. Not sufficient if the owner requires removal of historical exposure.

### Option C: archive/delete repository or change visibility

- Owner-only destructive action. Avoid unless the owner deliberately accepts loss of public history/access. This is not recommended as a default.

### Required owner decisions

1. Choose **A** (history rewrite + force push, recommended only if historical removal is mandatory), **B** (forward-only, historical exposure retained), or **C** (archive/delete/visibility change).
2. If A: authorize a local backup bundle, force-push of both refs, collaborator notification, and the exact redacted replacement text.
3. Confirm whether any credential rotation is required. No credentials/private-key files were identified; the observed exposure is owner path information. If any credential was ever present, rotate it independently.
4. Decide whether public historical commit-object residual exposure is acceptable after force-push, or whether repository removal/visibility change is required.

No remote operation is authorized or performed by this report. Overall Task 07 remains **BLOCKED** pending the owner decision.

## 5. Remaining risks

- Published paths remain in both remote refs and cached GitHub history.
- Local-only path-bearing commits remain unpublished but would be exposed by a normal push.
- Git history content scans have inherent binary/PDF limitations; no credential was identified, but absence is not a cryptographic proof.
- Browser-artifact and other unrelated acceptance gates remain separate.
- No application tests were rerun; Task 07 is documentation/security-tooling only.
