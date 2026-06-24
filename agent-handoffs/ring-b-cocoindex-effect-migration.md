Changed:
- Removed the package-local generated-contract compatibility test
  `packages/cocoindex-effect/test/attune-project-facts.test.ts`.
- Updated `attune.generator-shapes.json` so the `cocoindex-effect`
  compatibility shape entry no longer expects the deleted package-local
  compatibility test and describes mechanical indexed facts.
- Updated the framework-owned artifact ownership shard for `cocoindex-effect` so
  its transitional contract shard output names only the authored
  `src/attune.package.ts` source boundary.

Program-index proof:
- `cocoindex-effect:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local Attune generated companions or package-root artifact ownership
  shards exist under `packages/cocoindex-effect`.

Removed surfaces:
- The deleted test asserted framework-owned generated contract object shapes,
  handler maps, property maps, inferred laws, and guidance partitions as an
  active package-local surface. Its useful workflow questions are now answered
  by program-index materialization, focused CocoIndex fixture tests, and public
  Nx check/typecheck targets.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/project-facts/cocoindex-effect/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/cocoindex-effect/attune.contract.generated.ts`
- `framework/architecture/src/generated/artifact-ownership/cocoindex-effect.json`
- `.attune/cache/generated/cocoindex-effect/attune-symbol-registry.ts`
- `.attune/cache/generated/cocoindex-effect/attune-property-observations.ts`
- `.attune/cache/generated/cocoindex-effect/attune-schema-observations.ts`
- `.attune/cache/generated/cocoindex-effect/attune-observation-scaffold.ts`
- `.attune/cache/generated/cocoindex-effect/artifact-freshness.json`
- `.attune/cache/observations/cocoindex-effect/observation-scaffold.json`

These retained files are framework-owned compatibility inputs or local cache
artifacts, not authored package source. Product generated MCP schema and tool
registry files remain product artifacts outside the Attune compatibility
surface.

Validated:
- `pnpm exec nx run cocoindex-effect:test --skipNxCache`
- `pnpm exec nx run cocoindex-effect:typecheck --skipNxCache`
- `pnpm exec nx run cocoindex-effect:attune-check --skipNxCache`

Not run:
- `cocoindex-effect:attune-repair`; the slice removed stale compatibility
  paths and did not need to execute safe cache repairs.
- Live CocoIndex/MCP provider actions, Kubernetes, Alchemy, destructive,
  container fuzzing, and heavy proof-pressure actions were not run.

Risks:
- `packages/cocoindex-effect/project.json` still exposes internal
  mechanical repair target names for symbol registry, property observations,
  schema observations, artifact freshness, and observation scaffolding. They
  remain implementation routes behind the public `attune-repair` surface.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Ring B with `joern-effect`.
- In Phase 7, remove or quarantine the shared compatibility generated outputs and remaining
  cache helper APIs after all ring
  handoffs identify the remaining blockers.
