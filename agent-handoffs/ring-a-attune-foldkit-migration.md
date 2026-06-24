Changed:
- Removed the package-local compatibility test
  `packages/attune-foldkit/test/attune-package-contract.test.ts`.
- Updated `attune.generator-shapes.json` so the `attune-foldkit`
  compatibility shape entry no longer expects the deleted package-local
  compatibility test.
- Updated the framework-owned source ownership shard for `attune-foldkit` so
  its transitional contract shard output names only the authored
  `src/attune.package.ts` source boundary.

Program-index proof:
- `attune-foldkit:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local generated companions or package-root source ownership shards
  exist under `packages/attune-foldkit`.
- The Ring A workspace checkpoint passed with `workspace:attune-check` after
  `effect-oxlint-policy`, `attuned-discovery`, and `attune-foldkit` were all
  validated.

Removed surfaces:
- The deleted test asserted the authored package declaration and view roots as
  an active package-local old-shape surface. Its useful workflow questions are
  now answered by program-index materialization, focused FoldKit tests, and
  public Nx check/typecheck targets.
- The FoldKit shape manifest and framework-owned source ownership shard no
  longer resurrect the deleted package-local compatibility test as an expected
  output.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/package-contracts/attune-foldkit/attune.generated.ts`
- `framework/architecture/src/generated/package-contracts/attune-foldkit/attune.contract.generated.ts`
- `framework/architecture/src/generated/source-bom/attune-foldkit.json`
- `.attune/cache/generated/attune-foldkit/attune-operation-registry.ts`
- `.attune/cache/generated/attune-foldkit/attune-property-registry.ts`
- `.attune/cache/generated/attune-foldkit/attune-type-guidance.ts`
- `.attune/cache/generated/attune-foldkit/attune-property-evidence.ts`
- `.attune/cache/generated/attune-foldkit/generated-freshness.json`
- `.attune/cache/evidence/attune-foldkit/evidence-scaffold.json`

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
- `packages/attune-foldkit/project.json` still exposes internal compatibility
  repair target names for registry, type-guidance, generated freshness, and
  observation/evidence scaffolding. They are retained as implementation routes
  behind the public `attune-repair` surface until Phase 7 can remove or rename
  the helper APIs safely.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Phase 6 with Ring B.
- In Phase 7, remove or quarantine the shared compatibility generated outputs,
  cache helpers, and internal old-noun repair target names after Ring B and
  Ring C handoffs identify their remaining blockers.
