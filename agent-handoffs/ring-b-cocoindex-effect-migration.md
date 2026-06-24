Changed:
- Removed the package-local generated-contract compatibility test
  `packages/cocoindex-effect/test/attune-package-contract.test.ts`.
- Updated `attune.generator-shapes.json` so the `cocoindex-effect`
  compatibility shape entry no longer expects the deleted package-local
  compatibility test and describes mechanical indexed facts.
- Updated the framework-owned source ownership shard for `cocoindex-effect` so
  its transitional contract shard output names only the authored
  `src/attune.package.ts` source boundary.

Program-index proof:
- `cocoindex-effect:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace. Source ownership and shape conformance also
  passed after stale compatibility-test paths were removed.
- No project-local Attune generated companions or package-root source ownership
  shards exist under `packages/cocoindex-effect`.

Removed surfaces:
- The deleted test asserted framework-owned generated contract object shapes,
  handler maps, property maps, inferred laws, and guidance partitions as an
  active package-local surface. Its useful workflow questions are now answered
  by program-index materialization, focused CocoIndex fixture tests, and public
  Nx check/typecheck targets.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/package-contracts/cocoindex-effect/attune.generated.ts`
- `framework/architecture/src/generated/package-contracts/cocoindex-effect/attune.contract.generated.ts`
- `framework/architecture/src/generated/source-bom/cocoindex-effect.json`
- `.attune/cache/generated/cocoindex-effect/attune-operation-registry.ts`
- `.attune/cache/generated/cocoindex-effect/attune-property-registry.ts`
- `.attune/cache/generated/cocoindex-effect/attune-type-guidance.ts`
- `.attune/cache/generated/cocoindex-effect/attune-property-evidence.ts`
- `.attune/cache/generated/cocoindex-effect/generated-freshness.json`
- `.attune/cache/evidence/cocoindex-effect/evidence-scaffold.json`

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
  compatibility repair target names for registry, type-guidance, generated
  freshness, and observation/evidence scaffolding. They remain implementation
  routes behind the public `attune-repair` surface until Phase 7 removes or
  renames them.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Ring B with `joern-effect`.
- In Phase 7, remove or quarantine the shared compatibility generated outputs,
  cache helpers, and internal old-noun repair target names after all ring
  handoffs identify the remaining blockers.
