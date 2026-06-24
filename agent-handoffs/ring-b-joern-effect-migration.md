Changed:
- Removed the package-local generated-contract compatibility test
  `packages/joern-effect/test/attune-project-facts.test.ts`.
- Updated active Joern shape invariants in `attune.generator-shapes.json` to
  describe source, schema descriptors, observations, diagnostics, and focused
  tests instead of old generated-contract/evidence wording.

Program-index proof:
- `joern-effect:attune-check` passed through the public Nx target and
  materialized program-index facts before reporting check status.
- The materialized index included mechanical project, target, source_file,
  symbol, schema_descriptor, edge, artifact, observation, diagnostic, and
  repair rows for the workspace.
- The Ring B workspace checkpoint passed with `workspace:attune-check` after
  `attune-nx`, `cocoindex-effect`, and `joern-effect` were all validated.
- No project-local Attune generated companions or package-root source ownership
  shards exist under `packages/joern-effect`.

Removed surfaces:
- The deleted test asserted framework-owned generated contract object shapes,
  handler maps, property maps, target-intent compatibility payloads, and old
  guidance partitions as an active package-local surface. Its useful workflow
  questions are now answered by program-index materialization, focused Joern
  unit tests, and public Nx check/typecheck targets.

Retained compatibility-only surfaces:
- `framework/architecture/src/generated/project-facts/joern-effect/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/joern-effect/attune.contract.generated.ts`
- `.attune/cache/generated/joern-effect/attune-symbol-registry.ts`
- `.attune/cache/generated/joern-effect/attune-property-observations.ts`
- `.attune/cache/generated/joern-effect/attune-schema-observations.ts`
- `.attune/cache/generated/joern-effect/attune-observation-scaffold.ts`
- `.attune/cache/generated/joern-effect/artifact-freshness.json`
- `.attune/cache/observations/joern-effect/observation-scaffold.json`

These retained files are framework-owned compatibility inputs or local cache
artifacts, not authored package source. Product Joern generated bindings,
template registry files, schema snapshots, and README generation remain product
artifacts outside the Attune compatibility surface.

Validated:
- `pnpm exec nx run joern-effect:test --skipNxCache`
- `pnpm exec nx run joern-effect:typecheck --skipNxCache`
- `pnpm exec nx run joern-effect:attune-check --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`

Not run:
- `joern-effect:attune-repair`; the slice removed stale compatibility paths and
  did not need to execute safe cache repairs.
- Live Joern server/runtime, proof-pressure, container fuzzing, provider,
  Kubernetes, Alchemy, and destructive actions were not run.

Risks:
- `packages/joern-effect/project.json` still exposes internal mechanical
  repair target names for symbol registry, schema observations, artifact freshness, and
  observation scaffolding. They remain implementation routes behind
  the public `attune-repair` surface.
- Shared framework-owned compatibility generated outputs still import old
  helper APIs. They are outside this package-local deletion slice.

Follow-ups:
- Continue Phase 6 with Ring C using cheap validation only.
- In Phase 7, remove or quarantine the shared compatibility generated outputs and remaining
  cache helper APIs after Ring C
  handoffs identify remaining blockers.
