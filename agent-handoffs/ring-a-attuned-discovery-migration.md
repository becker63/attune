Changed:
- Removed the package-local compatibility test
  `packages/attuned-discovery/test/attune-project-facts.test.ts`.
- Updated `attune.generator-shapes.json` so the Ring A
  `attuned-discovery` and `effect-oxlint-policy` compatibility shape entries
  no longer expect deleted package-local compatibility tests.
- Updated the framework-owned artifact ownership shards for
  `attuned-discovery` and `effect-oxlint-policy` so their transitional contract
  shard outputs name only the authored `src/attune.package.ts` source boundary.

Program-index proof:
- `attuned-discovery:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local generated companions or package-root artifact ownership shards
  exist under `packages/attuned-discovery`.
- Runtime parity coverage for this Ring A package remains in the framework
  program-index fixture while framework-owned compatibility inputs are still
  being removed in later phases.

Removed surfaces:
- The deleted test asserted the authored package declaration and view roots as
  an active package-local old-shape surface. Its useful workflow questions are
  now answered by program-index materialization, focused product/runtime tests,
  and public Nx check/typecheck targets.
- The Ring A shape manifest and framework-owned artifact ownership shards no
  longer resurrect the deleted package-local compatibility test as an expected
  output.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/project-facts/attuned-discovery/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/attuned-discovery/attune.contract.generated.ts`
- `framework/architecture/src/generated/artifact-ownership/attuned-discovery.json`
- `.attune/cache/generated/attuned-discovery/attune-symbol-registry.ts`
- `.attune/cache/generated/attuned-discovery/attune-property-observations.ts`
- `.attune/cache/generated/attuned-discovery/attune-schema-observations.ts`
- `.attune/cache/generated/attuned-discovery/attune-observation-scaffold.ts`
- `.attune/cache/generated/attuned-discovery/artifact-freshness.json`
- `.attune/cache/observations/attuned-discovery/observation-scaffold.json`

These retained files are framework-owned compatibility inputs or local cache
artifacts, not authored package source. They remain only until Phase 7 can
delete or quarantine the shared generated aggregate, compatibility adapter
fixture, cache helper APIs, and final old-noun repair targets without losing
parity.

Validated:
- `pnpm exec nx run attuned-discovery:test --skipNxCache`
- `pnpm exec nx run attuned-discovery:typecheck --skipNxCache`
- `pnpm exec nx run workspace:shape-conformance --skipNxCache`
- `pnpm exec nx run attuned-discovery:attune-check --skipNxCache`

Not run:
- `attuned-discovery:attune-repair`; the slice removed stale compatibility
  paths and did not need to execute safe cache repairs.
- Live provider, Kubernetes, Alchemy, destructive, container fuzzing, and heavy
  proof-pressure actions were not applicable and were not run.

Risks:
- `packages/attuned-discovery/project.json` still exposes internal mechanical
  repair target names for symbol registry, schema observations, artifact freshness, and
  observation scaffolding. They are implementation routes behind the public
  `attune-repair` surface.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Ring A with `attune-foldkit`.
- In Phase 7, remove or quarantine the shared compatibility generated outputs and remaining
  cache helper APIs after the completed
  ring handoffs identify the remaining blockers.
