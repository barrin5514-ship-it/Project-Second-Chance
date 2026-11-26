# E1-S2 Task 02 — storage directory and deletion integrity

Builder: DeepSeek. Branch `feature/e1-s2-private-documents`. Base checkpoint before Task 02: `e702803` (Task 01 independently verified). This is builder evidence plus independent Codex/Claude results; it is not an E1-S2 merge approval. Fictional data only. No owner runtime content, `.env`, keys, database or real records were accessed.

## Root cause

1. `createDocument` called `ops.mkdir(dataDir/blobs/<shard>, { recursive: true })` before checking whether the blob root or any shard referenced by existing document rows was still available. Moving the blob root/shard away and uploading therefore recreated an empty managed directory.
2. `removeManaged` accepted a missing blob for non-ready rows after checking only that the parent path existed. Once the recreated empty shard existed, a second delete of the old error row returned success and removed metadata while the original ciphertext remained in the moved-away directory.
3. `reconcile` checked that the shard path existed, but had no shard identity. An empty recreation was indistinguishable from the original valid shard, so later work could treat it as healthy.

## Impact analysis

- **Upload:** now verifies `blobs` and `staging` roots, plus every shard referenced by an existing document, before any `mkdir` or write. Missing/unreadable managed directories fail with `PrivateStorageError('unavailable')`; nothing is recreated.
- **Shard identity:** each shard receives a random, non-sensitive `.psc-shard` marker. Existing populated legacy shards are adopted lazily; an empty shard without the marker is not adopted.
- **Deletion/retry:** requires the blob root, parent shard and marker. A ready document with an individually missing file still fails closed; an error-row missing file in a verified shard can still be retried.
- **Reconciliation:** requires both managed roots and every ready document's marked shard before treating an `ENOENT` as individual loss. A recreated empty shard fails closed.
- **Startup:** when document rows exist, missing `blobs` or `staging` fails closed rather than recreating a root.
- **Retrieval/restore:** an untouched document remains readable after the original root/shard is restored; the document is not marked missing by the failed upload.
- **Encryption/authorization/session:** no change to crypto envelopes, AAD, owner scoping or auth/session middleware. Full regression suite run.
- **Backward compatibility:** legacy populated shards without a marker remain usable; first-time uploads and new shard creation continue to work.
- **Operator policy:** a permanently lost shard makes private storage fail closed for uploads/deletion/reconciliation across accounts until the original directory is restored. This is intentional; E1-S3 recovery policy remains open.

## RED evidence

Added to `apps/server/src/private/privateStore.test.ts`:

- root loss before upload;
- shard loss before upload;
- recreated empty shard then repeated delete;
- legacy populated shard without marker.

Pre-fix `npx vitest run apps/server/src/private/privateStore.test.ts`: **3 failed / 19 passed (22)**. The failures were exactly: upload did not throw for root loss, upload did not throw for shard loss, and the second delete returned success after the shard was recreated empty. Log: `.setup/task02-red.log`.

## GREEN and compatibility

After the correction:

- `apps/server/src/private/privateStore.test.ts`: **22/22**
- `apps/server/src/private/privateHardening.test.ts`: **36/36**
- `apps/server/src/private/privateRoutes.test.ts`: **12/12**
- `npm test`: **402/402, 35 files**
- `npm run test:api`: **231/231, 20 files**
- `npm run typecheck`: exit 0
- Full maintained suite includes auth, session, upload, deletion, health, Mira, isolation and existing storage tests.

## Independent verification

Isolated copy: `<isolated-copy>` (no `.env`/`runtime`, exact source; node_modules junction). Codex used the default workspace profile, `npm.cmd test -- --no-cache`, `npm.cmd run test:api -- --no-cache`, and typecheck. It reported branch/HEAD clean before and after, **PASS**, 402 maintained, 231 API, typecheck 0; it did not copy or relocate the project.

Claude independently reviewed the resulting source and returned **PASS**, checking all six storage criteria, legacy behavior, encryption/AAD, owner scoping and junction refusal. Claude disclosed it could not execute npm in its session; the execution evidence is Codex's.

Targeted reversion on the disposable copy removed the upload directory precondition and delete marker requirement: **3 failed / 19 passed**, matching the original RED tests. The copy was restored byte-for-byte and remained clean. State: `.bglad/state/e1-s2-task02-storage-final.json`, run `.bglad/runs/e1-s2-task02-storage-final-1795719442315/`.

## Local checkpoint and build note

- Task 02 application/evidence checkpoint: `a440516`.
- Coordinator no-second-copy guard: `b0a7ae7`.
- `npm run build` initially hit a sandbox-owned stale esbuild temp file under the user temp directory (`Access is denied`); rerunning with `TEMP`/`TMP` pointed at an ignored workspace temp directory passed (`✓ built`, exit 0). This is an environment artifact, not an application failure; no source workaround was added.

## Preservation and remaining gates

- Only Task 02 storage behavior was changed; Task 01 regression coverage is preserved.
- No shutdown-path behavior was changed; existing shutdown/health tests remain green.
- No push, merge, migration, deployment, E1-S3 or Task 03.
- NR-3 through NR-8, the browser-artifact gate, GitHub owner-path publication blocker and owner key/retention/readiness decisions remain open.
- Owner runtime metadata was not accessed or changed.

**Status: Task 02 storage correction independently verified and PASS; E1-S2 is not approved and no merge is claimed.**
