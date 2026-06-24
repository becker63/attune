Changed:
- Removed the package-local compatibility test
  `packages/attuned-discovery/test/attune-package-contract.test.ts`.
- Updated `attune.generator-shapes.json` so the Ring A
  `attuned-discovery` and `effect-oxlint-policy` compatibility shape entries
  no longer expect deleted package-local compatibility tests.
- Updated the framework-owned source ownership shards for
  `attuned-discovery` and `effect-oxlint-policy` so their transitional contract
  shard outputs name only the authored `src/attune.package.ts` source boundary.

Program-index proof:
- `attuned-discovery:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local generated companions or package-root source ownership shards
  exist under `packages/attuned-discovery`.
- Runtime parity coverage for this Ring A package remains in the framework
  program-index fixture while framework-owned compatibility inputs are still
  being removed in later phases.

Removed surfaces:
- The deleted test asserted the authored package declaration and view roots as
  an active package-local old-shape surface. Its useful workflow questions are
  now answered by program-index materialization, focused product/runtime tests,
  and public Nx check/typecheck targets.
- The Ring A shape manifest and framework-owned source ownership shards no
  longer resurrect the deleted package-local compatibility test as an expected
  output.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/package-contracts/attuned-discovery/attune.generated.ts`
- `framework/architecture/src/generated/package-contracts/attuned-discovery/attune.contract.generated.ts`
- `framework/architecture/src/generated/source-bom/attuned-discovery.json`
- `.attune/cache/generated/attuned-discovery/attune-operation-registry.ts`
- `.attune/cache/generated/attuned-discovery/attune-property-registry.ts`
- `.attune/cache/generated/attuned-discovery/attune-type-guidance.ts`
- `.attune/cache/generated/attuned-discovery/attune-property-evidence.ts`
- `.attune/cache/generated/attuned-discovery/generated-freshness.json`
- `.attune/cache/evidence/attuned-discovery/evidence-scaffold.json`

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
- `packages/attuned-discovery/project.json` still exposes internal compatibility
  repair target names for registry, type-guidance, generated freshness, and
  observation/evidence scaffolding. They are retained as implementation routes
  behind the public `attune-repair` surface until Phase 7 can remove or rename
  the helper APIs safely.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Ring A with `attune-foldkit`.
- In Phase 7, remove or quarantine the shared compatibility generated outputs,
  cache helpers, and internal old-noun repair target names after the completed
  ring handoffs identify the remaining blockers.
