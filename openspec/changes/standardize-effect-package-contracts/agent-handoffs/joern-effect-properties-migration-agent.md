Agent: joern-effect-properties-migration-agent
Wave: Phase 6 proof package migration, task 11.2

Ownership:
- packages/joern-effect-properties/package.json
- packages/joern-effect-properties/tsconfig.json (pre-existing concurrent alias edit observed; not changed by this agent)
- packages/joern-effect-properties/src/attune.package.ts
- packages/joern-effect-properties/src/attune.package.typecheck.ts
- packages/joern-effect-properties/test/attune-package-contract.test.ts
- openspec/changes/standardize-effect-package-contracts/agent-handoffs/joern-effect-properties-migration-agent.md

Changed:
- Added a minimal real `@attune/framework-protocol` package contract for `joern-effect-properties`.
- Declared public auditable property proof runtime boundaries for property harness runtime, semantic corpus store, counterexample store, semantic mutator, semantic fuzz scheduler, Joern workspace pool, fuzz oracle, fuzz telemetry, coverage search feedback, worker property wrapper, and proof runtime package view atoms.
- Added package-level Reactivity keys and atoms for property runs, fuzz runs, corpus, counterexamples, worker shards, workspace pool, coverage feedback, weak-oracle findings, and telemetry.
- Added `PackageLayer`, `PackageTestLayer`, exact `PackageFuzzHandlers`, exact `PackageProperties`, and `PackageTypeGuidance`.
- Added compile-only assertion coverage for contract shape, exact handlers/properties, layer service coverage, required service coverage, and type guidance completeness.
- Added a focused contract test that checks package id/kind, operation ids, view metadata, exact maps, dry fixture behavior, waivers, and type-guidance partitions.
- Added the package-local `@attune/framework-protocol` workspace dependency.

Generated:
- packages/joern-effect-properties/src/attune.package.ts
- packages/joern-effect-properties/src/attune.package.typecheck.ts
- packages/joern-effect-properties/test/attune-package-contract.test.ts

Validated:
- `nx run joern-effect-properties:typecheck` passed.
- `node ../../scripts/codex/pnpm.mjs exec vitest run --config ../cocoindex-effect/vitest.config.ts test/attune-package-contract.test.ts` from `packages/joern-effect-properties` passed: 5 tests.

Not run:
- Full `joern-effect-properties:test`, property, fuzz, Joern, Nix, Arion, and proof-pressure targets were not run for this narrow contract migration.
- The package-native focused Vitest command `node scripts/codex/pnpm.mjs --dir packages/joern-effect-properties exec vitest run test/attune-package-contract.test.ts` was attempted and failed before collection because `packages/joern-effect-properties/vitest.config.ts` does not yet alias `@attune/framework-protocol`. The write scope did not include that config, so the focused test was validated with an existing protocol-aware Vitest config instead.

Contract status:
- `joern-effect-properties` now has a minimal but real Attune Framework package contract using the public `@attune/framework-protocol` DSL.
- Runtime `@effect/rpc` is intentionally modeled only as future optional metadata; no runtime RPC imports were added.
- Evidence/cache/report truth remains private or fixture/runtime-scoped; no checked-in report files were added.

Residual migration debt:
- Proof package services still use lower-level `Context.Tag` service definitions; the contract records a legacy-boundary waiver until canonical `Effect.Service` scaffolds land.
- Live Joern workspace/oracle execution still depends on Joern toolchain, temp workspaces, and optional event sinks; deterministic `PackageTestLayer` and handlers use dry fixture behavior.
- Existing project targets still expose property/fuzz/Nix/Arion/wrapper command strings; typed Nx executor migration remains task 11.4 debt.
- Package-native Vitest config should gain the same `@attune/framework-protocol` alias used by migrated packages if future agents want the focused test to run through this package's default config.
- Shared property evidence, atom graph coverage summary, and proof-pressure wiring remain task 11.3 debt.

Blocked by:
- Not blocked for this slice.
- Package-native focused Vitest is config-blocked by a missing protocol alias outside this agent's write scope.

Next agent:
- Proof package validation / proof-pressure wiring agent for task 11.3, followed by typed executor cleanup for task 11.4.
