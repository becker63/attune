Agent: Codex local implementation
Wave: Real relocation slice 2
Ownership: Source BOM cache-path compatibility

Changed:
- Added `sourceBomCacheShardPath(project)` in `packages/attune-nx/src/internal/source-bom.ts`.
- Relaxed `scripts/architecture/source-bom-check.mjs` so the root index may
  point to either the legacy `<projectRoot>/attune.source-bom.json` shard or
  `.attune/cache/source-bom/<project>.json`.
- Added architecture tests proving cache shards pass and unexpected shard paths
  fail.
- Added Attune Nx test coverage for the cache shard helper.

Generated:
- None.

Validated:
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run workspace:source-bom-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `openspec validate compress-attune-package-surface --type change`
- `git diff --check`

Not run:
- No real Source BOM shard was moved in this slice.

Contract status:
- Source BOM infrastructure now accepts the framework-owned cache/projection
  location required by the one-file package-local surface direction.
- Existing checked-in package-local shards remain the active projection.

Residual migration debt:
- Switch `upsertSourceBom` or selected repair/materialization callers to write
  cache shards when the repair path is ready.
- Move one normal package ring's shard and update `attune.source-bom.index.json`
  plus `attune.generator-shapes.json` together.
- Update the pre-push Source BOM ownership hook to consult the root index/cache
  path instead of assuming package-local shards.

Blocked by:
- Compatibility is ready, but no package ring has been moved to the cache path.

Next agent:
- Move a low-risk package ring, preferably `attuned-discovery`, to
  `.attune/cache/source-bom/<project>.json` and prove
  `workspace:source-bom-check` plus `workspace:package-contracts-check`.
