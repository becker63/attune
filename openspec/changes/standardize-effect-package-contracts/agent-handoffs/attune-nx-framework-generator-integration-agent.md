# Attune Nx Framework Generator Integration Agent Handoff

Agent: `attune-nx-framework-generator-integration-agent`
Wave: Phase 2 / Phase 1A bridge

Ownership:
- `packages/attune-nx/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/attune-nx-framework-generator-integration-agent.md`

Changed:
- Extended `@attune/nx:package-contract` generation from two files to four
  deterministic source files:
  - `src/attune.package.ts`
  - `src/attune.package.generated.ts`
  - `src/attune.package.property.ts`
  - `src/attune.package.typecheck.ts`
- Added generated operation registry, exact handler/property map exports,
  property evidence plan, atom view graph shape, generated artifact ownership,
  and explicit no-checked-in protocol report policy.
- Added worker-compatible property module shape with hoisted
  `propertyFor(new URL(import.meta.url))`, worker assertion binding,
  isolation/random-source metadata, and gitignored evidence root.
- Updated compile-only assertions to import exact generated handler/property
  maps from `attune.package.generated.js`.
- Added a source-local `src/generators/package-contract/generator.js` bridge so
  `.js` imports can resolve the source generator in local source mode.
- Updated generator inventory and tests to mark operation registry, property
  evidence plan, worker property module, and no-report policy as present
  package-contract generator capabilities.

Generated:
- Generator output now owns:
  - `src/attune.package.generated.ts`
  - `src/attune.package.property.ts`
- No protocol reports, evidence summaries, ledgers, architecture summaries, or
  other checked-in report truth were generated.

Validated:
- `nx run attune-nx:test -- --run test/package-contract-generator.test.ts test/generators.test.ts test/generator-snapshots.test.ts`
  - Passed: 3 files, 14 tests.
- `nx run attune-nx:test`
  - Passed: 10 files, 45 tests.
- `git diff --check -- packages/attune-nx/src/generators/package-contract/generator.ts packages/attune-nx/src/generators/package-contract/generator.js packages/attune-nx/src/generator-inventory.ts packages/attune-nx/test/package-contract-generator.test.ts packages/attune-nx/test/generators.test.ts packages/attune-nx/test/generator-snapshots.test.ts`
  - Passed.

Not run:
- `openspec validate standardize-effect-package-contracts --type change`
  - Not run in this slice.
- Checked-in `dist` refresh was not completed. `nx run attune-nx:build`
  failed in the upstream `attune-architecture:build` dependency before
  reaching `attune-nx`.

Contract status:
- `@attune/nx:package-contract` now emits Schema-backed package contracts,
  compile-only assertions, `PackageTypeGuidance`, generated operation registry,
  generated property/evidence plan, generated atom-view graph shape,
  worker-compatible property module shape, and no-checked-in-report posture.
- Worker property module is descriptor/source-shape only. It intentionally
  hoists the worker builder but does not construct real FastCheck properties
  until property-runtime materialization supplies compatible arbitraries.
- Effect RPC harness generation remains intentionally absent because prior
  Phase 3 validation recorded the Effect 4 / `@effect/rpc` runtime mismatch.

Residual migration debt:
- Registered Nx generator execution still uses the existing checked-in `dist`
  factory until `attune-nx:build` can run cleanly or a dedicated dist-refresh
  slice is coordinated.
- Full executor replacement remains too large for this slice. Existing typed
  executors are still intent-only.
- Generated property modules still need the property-runtime agent to supply
  Schema-derived arbitraries, replay/evidence envelopes, and real worker
  execution tests.
- Package-contract generator still seeds one operation; it does not yet consume
  discovered package operations/services to generate multi-operation registries.
- Source BOM remains migration scaffolding until framework runtime/cache and
  language-service materialization fully replace it as the semantic surface.

Blocked by:
- `nx run attune-nx:typecheck` failed outside this ownership in
  `framework/protocol/src/source/index.ts`:
  - line 561: `unknown` passed where `Node` is required.
  - line 613: exact-optional-property mismatch for `IdDerivationOptions`.
  - line 623: exact-optional-property mismatch for `SymbolLikeDeclaration`.
- `nx run attune-nx:build` failed outside this ownership in
  `packages/attune-architecture-lint/src/framework-policy-cli.ts`:
  - line 359: missing `checkAtomReactivityConformance`.
- This agent did not edit `framework/**` per ownership constraints.

Next agent:
- `property-runtime-agent`: consume `attune.package.generated.ts` and
  `attune.package.property.ts` shapes to add Schema-derived arbitraries,
  replay/evidence envelopes, and real worker assertion coverage.
- `framework-protocol-source-agent`: fix the current
  `framework/protocol/src/source/index.ts` typecheck blockers so
  `attune-nx:typecheck` can verify package-local changes again.
- `nx-graph-agent`: connect generated registry/evidence/atom-view shapes to
  inferred typed targets once framework runtime materialization is ready.
