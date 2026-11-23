# Mira in-progress build check — November 23, 2026

Status: incomplete; targeted builder follow-up required. Codex inspected the saved workspace and ran checks. This is not final acceptance or a Claude review. DeepSeek remains the builder. Preserve existing work.

## Actual results

- `npm test`: exit 0; 7 files, 114 tests passed; reported duration 11.41 seconds.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Vite reported 959 ms build time.
- `npm run test:e2e`: exit 1; 26 tests failed at browser launch because the expected Playwright browser executable is not installed. These results do not establish application assertion failures; browser acceptance remains unverified. The test configuration disables provider access and no live avatar was started.
- Initial restricted-context test/build attempts could not load config; normal-directory reruns above succeeded. Do not report those initial execution-context errors as application defects.
- No `docs/evidence/V0-S1-builder.md` was present. No live conversation, final independent gate or Claude review is claimed.

## Concrete source findings to resolve with TDD

1. **Page startup is not connected to the real SDK.** `apps/web/src/App.tsx` reads `globalThis.__nuanceCreateConversation` and throws when it is absent. It invokes this lookup during component render, before Start. `apps/web/src/main.tsx` does not register that function; a search of the web source found no SDK import or registration. Existing component tests inject fakes, so their passing results do not exercise the real entry path. Reproduce with an entry-path test, wire the pinned real SDK through the replaceable connection adapter, and demonstrate a nonblank page before Start. Preserve no-media-before-consent. The browser implementation has not been approved merely because the bundle builds.

2. **Verify and correct the one-mint-per-explicit-Start contract end to end.** `connection.ts` calls `fetchToken()` before creating the SDK conversation, discards that initial token for SDK purposes, then its token callback calls `fetchToken()` again. Production `requestToken()` in App calls bootstrap again and posts an empty body each time; it does not pass the previous attempt identity. This appears to create fresh browser/session/attempt identities for SDK callbacks instead of enforcing the approved attempt rule. Add an integration test across the actual browser token adapter and server: first SDK callback uses the already-minted token; a later SDK callback cannot cause another provider mint for that Start. Verify explicit new Start, terminal cleanup and stale callback behavior against the approved spec. Do not weaken the spec or tests to accommodate extra mints.

3. **Browser verification is not ready.** Install the project's matching Playwright Chromium binary using the approved setup step, then run the browser suite. No-key tests must remain unable to spend credits. Confirm actual page behavior and keep environment failures separate from failed application assertions.

4. **Remaining required artifacts:** the secrets-check script and avatar ADR were absent at inspection. Finish the approved scope and write a truthful builder report with actual results, remaining gaps, and honest TDD evidence. Do not recreate finished modules or begin the broader capstone.

## Handoff

The owner also reports 21 entries in VS Code's Problems panel. Codex could not observe that panel on this device; their messages and severity are unverified. Before handoff, inspect available editor diagnostics and reconcile them with the compiler/build/test results. Resolve relevant errors; explain remaining warnings or stale/out-of-scope diagnostics with evidence. If the builder cannot access the panel, explicitly report that limitation instead of claiming all editor problems are cleared. Do not suppress diagnostics merely to reduce the count. A passing compiler command does not prove that all 21 panel entries have been addressed.

Read this report in the existing build session. Address the narrow findings, rerun relevant checks, update the builder evidence file, then stop for actual Codex acceptance testing and Claude review. No merge, push or deployment. This file being saved does not mean the active builder has received or read it.
