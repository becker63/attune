Agent: proof-package-evidence-integration-agent

Wave: Phase 6 proof package migration, follow-up evidence integration slice for tasks 11.3 and 11.4.

Ownership:
- Edited only `packages/joern-effect/**`, `packages/joern-effect-properties/**`, and this handoff file.
- Observed unrelated pre-existing framework/OpenSpec/workspace changes in the worktree and left them untouched.

Changed:
- Added Schema-coded shared evidence summaries and typed target intents to `joern-effect` so Joern runtime, CPG builder, generated DSL, template registry, query evidence, and generated schema coverage operations expose contract-visible evidence metadata.
- Added Schema-coded proof property evidence, atom graph coverage summaries, and typed target intents to `joern-effect-properties` for property runtime, corpus/counterexample store, worker property wrapper, coverage search, fuzz scheduler, workspace pool, and Joern oracle operations.
- Added compile-only checks that `PackageEvidenceShapes` are exact over package operation ids and typed target intents reference known operations.
- Expanded contract tests to decode the new evidence/coverage/target-intent schemas and assert command surfaces are covered by explicit typed-executor migration waivers.
- Kept existing proof-pressure command behavior unchanged; raw `nx:run-commands`, Nix, Arion, env, and script wrapper surfaces remain operational but are now represented by typed contract metadata plus waivers.

Generated:
- None. No generated source, schema, or README artifacts were regenerated.

Validated:
- `nx run joern-effect:typecheck`
- `nx run joern-effect:test`
- `nx run joern-effect-properties:typecheck`
- `node scripts/codex/pnpm.mjs --dir packages/joern-effect-properties exec tsx scripts/runPropertyVitest.ts test/property-negative-fixtures.test.ts test/attune-package-contract.test.ts`

Not run:
- Full `nx run joern-effect-properties:test` / package-wide property suite.
- Heavy Joern proof-pressure, Nix image, Arion container, fuzz workbench/nightly/campaign, mutation, or four-hour DSL campaign runs.
- Workspace policy gates such as `workspace:policy-fast`, `workspace:policy-proof-pressure`, and `workspace:package-contracts-check`.

Contract status:
- `joern-effect` now has exact operation-derived `PackageOperations`, `PackageEvidenceShapes`, `PackageTargetIntents`, and a `joern-effect/typed-executor-migration` waiver for remaining wrapper/env/toolchain command surfaces.
- `joern-effect-properties` now has exact operation-derived `PackageOperations`, `PackageEvidenceShapes`, partial `PackageAtomGraphCoverage` for currently covered high-signal proof operations, `PackageTargetIntents`, and existing command/live-toolchain waivers.
- Focused typechecks and contract tests pass with the new metadata.

Residual migration debt:
- Replace project-local `nx:run-commands`, package scripts, direct Nix/Arion invocations, shell env defaults, Vitest spawning wrappers, and Joern schema extraction wrappers with real typed Nx executors or inferred targets.
- Route emitted property/fuzz/worker/coverage evidence into the private framework evidence/runtime cache once the framework API is available, instead of contract-local fixture summaries.
- Expand `PackageAtomGraphCoverage` from the current high-signal operations to every proof operation once generated atom graph observers exist.
- Move Context.Tag proof services to canonical `Effect.Service` scaffolds or keep long-lived non-migration waivers with owner/review metadata.

Blocked by:
- Generic `attune:package-check`, `attune:generated`, and `attune:toolchain` executor implementation and inference are not available in this slice.
- Framework evidence/runtime cache write API and atom graph observer helpers are not ready for proof packages to call directly.
- No generated Schema-coded package harness/runtime exists yet for replacing the current fixture handler maps.

Next agent:
- Proof executor migration agent: implement or adopt typed Nx executor wiring for `joern-effect` generation/schema extraction and `joern-effect-properties` property/fuzz/container targets, then remove or narrow the typed-executor migration waivers.
