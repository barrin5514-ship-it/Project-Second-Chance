# E1-S2 checkpoint-integrity amendment — November 27, 2026

This is a dated correction record. It does not retroactively claim that earlier commits passed.

## Prior checkpoint defect

The publication candidate `c4f03c86927a8b586102ec5f4f59a00af39d13d3` was built from a committed snapshot that omitted implementation and test changes present in the builder working tree. Exact committed-candidate verification therefore observed:

- Maintained: **403 tests / 34 files, 3 failed**.
- API: **232 tests / 19 files, 3 failed**.
- Typecheck: **21 diagnostics**, including missing `listCasesWithProvenance`.

The earlier working-tree results (408/236) were valid only for the uncommitted overlay and are **not** evidence for candidate `c4f03c8`. Those historical results remain recorded; they are not rewritten or reassigned.

## Corrected checkpoints

- `ccf8621` — permanent committed-checkpoint policy and coordinator guards.
- `c0d1960` — Assignment A, late-response guards and tests.
- `c8fab7c` — Assignment B, required/fail-closed provenance.
- `60cada6`, `a557ed3`, `5c08c63`, `8d86bed`, `e3412be` — Assignment C isolation correction series; `e3412be` is the final independently reviewed C checkpoint.
- `c1b5214` — Assignment D, worker-exit acknowledgement and lifecycle tests.
- `41610e0` — committed auth-loader E2E negative control required by C.

Each final assignment checkpoint was verified from a clean clone with no overlay:

- A `c0d1960`: 403/232.
- B `c8fab7c`: 406/232, typecheck 0.
- C `e3412be`: 414/240, typecheck 0, build PASS locally.
- D `c1b5214`: 416/242, typecheck 0, build PASS locally.

Codex and Claude both passed A, B, C at `e3412be`, and D at `c1b5214` independently.

## Remaining documentation and independent tests

- `README.md` and the E1-S2 spec have uncommitted edits. The spec edit still contains an old historical-total overwrite (376/227 where the Task 06 restoration records 347/213); it is **not staged** or included in the publication candidate. Preserve it as unrelated uncommitted work pending a dated correction.
- `tests/independent/` remains untracked, preserved and not blindly published.
- The earlier historical TDD/provenance limitations remain open; this amendment does not convert them to passes.

## Candidate rule

The publication candidate must be extended only from committed checkpoints. The original repository history is not rewritten here. The sanitized candidate is extended on top of `c4f03c8` from the verified new commits; its exact hash and final verification are recorded separately.
