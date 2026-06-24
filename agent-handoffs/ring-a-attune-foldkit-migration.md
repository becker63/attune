Changed:
- Removed the package-local compatibility test
  `packages/attune-foldkit/test/attune-project-facts.test.ts`.
- Updated `attune.generator-shapes.json` so the `attune-foldkit`
  compatibility shape entry no longer expects the deleted package-local
  compatibility test.
- Updated the framework-owned artifact ownership shard for `attune-foldkit` so
  its transitional contract shard output names only the authored
  `src/attune.package.ts` source boundary.

Program-index proof:
- `attune-foldkit:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local generated companions or package-root artifact ownership shards
  exist under `packages/attune-foldkit`.
- The Ring A workspace checkpoint passed with `workspace:attune-check` after
  `effect-oxlint-policy`, `attuned-discovery`, and `attune-foldkit` were all
  validated.

Removed surfaces:
- The deleted test asserted the authored package declaration and view roots as
  an active package-local old-shape surface. Its useful workflow questions are
  now answered by program-index materialization, focused FoldKit tests, and
  public Nx check/typecheck targets.
- The FoldKit shape manifest and framework-owned artifact ownership shard no
  longer resurrect the deleted package-local compatibility test as an expected
  output.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/project-facts/attune-foldkit/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/attune-foldkit/attune.contract.generated.ts`
- `framework/architecture/src/generated/artifact-ownership/attune-foldkit.json`
- `.attune/cache/generated/attune-foldkit/attune-symbol-registry.ts`
- `.attune/cache/generated/attune-foldkit/attune-property-observations.ts`
- `.attune/cache/generated/attune-foldkit/attune-schema-observations.ts`
- `.attune/cache/generated/attune-foldkit/attune-observation-scaffold.ts`
- `.attune/cache/generated/attune-foldkit/artifact-freshness.json`
- `.attune/cache/observations/attune-foldkit/observation-scaffold.json`

These retained files are framework-owned compatibility inputs or local cache
artifacts, not authored package source. They remain only until Phase 7 can
delete or quarantine the shared generated aggregate, compatibility adapter
fixture, cache helper APIs, and final old-noun repair targets without losing
parity.

Validated:
- `pnpm exec nx run attune-foldkit:test --skipNxCache`
- `pnpm exec nx run attune-foldkit:typecheck --skipNxCache`
- `pnpm exec nx run workspace:shape-conformance --skipNxCache`
- `pnpm exec nx run attune-foldkit:attune-check --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`

Not run:
- `attune-foldkit:attune-repair`; the slice removed stale compatibility paths
  and did not need to execute safe cache repairs.
- Live provider, Kubernetes, Alchemy, destructive, container fuzzing, and heavy
  proof-pressure actions were not applicable and were not run.

Risks:
- `packages/attune-foldkit/project.json` still exposes internal mechanical
  repair target names for symbol registry, schema observations, artifact freshness, and
  observation scaffolding. They are implementation routes behind the public
  `attune-repair` surface.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Phase 6 with Ring B.
- In Phase 7, remove or quarantine the shared compatibility generated outputs and remaining
  cache helper APIs after Ring B and
  Ring C handoffs identify their remaining blockers.
