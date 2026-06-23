Agent: Codex local coordinator
Goal: Finish the one-Attune-file relocation for `framework/architecture` after
  all product/proof/platform/framework policy consumers had moved generated
  companions to framework-owned materialization.

Before package-local Attune files:
- `framework/architecture/src/attune.package.ts`
- `framework/architecture/src/attune.contract.generated.ts`
- `framework/architecture/src/attune.generated.ts`
- `framework/architecture/attune.source-bom.json`

After package-local Attune files:
- `framework/architecture/src/attune.package.ts`

Files moved:
- `framework/architecture/src/attune.contract.generated.ts` ->
  `framework/architecture/src/generated/package-contracts/attune-architecture/attune.contract.generated.ts`
- `framework/architecture/src/attune.generated.ts` ->
  `framework/architecture/src/generated/package-contracts/attune-architecture/attune.generated.ts`
- `framework/architecture/attune.source-bom.json` ->
  `framework/architecture/src/generated/source-bom/attune-architecture.json`

Files left behind with waiver:
- None for the one-file surface. Direct inventory now finds only
  `src/attune.package.ts` for active package/framework Attune roots.

Generated/cache layout:
- Checked-in generated compatibility material now lives under
  `framework/architecture/src/generated/package-contracts/attune-architecture/`.
- Source BOM compatibility projection now lives under
  `framework/architecture/src/generated/source-bom/attune-architecture.json`.
- `attune-repair` also wrote a gitignored freshness projection at
  `.attune/cache/generated/attune-architecture/generated-freshness.json`.

Typecheck strategy:
- The central package-contract aggregate now imports the architecture generated
  contract from the framework-owned generated path instead of
  `src/attune.package.ts`.
- `framework/architecture/tsconfig.json` and `vitest.config.ts` gained the
  narrow `joern-effect/package-effect` alias needed by relocated Joern
  compatibility material during architecture checks.

Source BOM strategy:
- `attune.source-bom.index.json` and `attune.generator-shapes.json` now point
  `attune-architecture` at the framework-owned generated Source BOM projection.

SQLite/ProtocolStore changes:
- No raw SQLite or ProtocolStore internals were exposed. The generated
  freshness cache remains gitignored framework materialization state.

Nx repair changes:
- Added `attune-architecture` to the safe generated relocation set in
  `framework/architecture/src/attune-repair-cli.ts`.
- Added `framework/architecture` to the completed one-file ratchet roots in
  `framework/architecture/src/framework-policy-cli.ts`.
- `nx run attune-architecture:attune:repair-generated --skipNxCache` performed
  the relocation.

Docs updated:
- This handoff records the final architecture-package relocation. The existing
  OpenSpec and operating docs already describe the one-file/check-repair model.

Validation run:
- `nx run attune-architecture:attune:repair-generated --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `nx run workspace:policy-fast --skipNxCache`
- `openspec validate compress-attune-package-surface --type change`
- `git diff --check`

Validation not run:
- Full `nx run-many -t typecheck --all`, full `nx run-many -t test --all`, and
  heavy proof/provider campaigns were not run for this cleanup slice.

Residual debt:
- Source BOM and generated package-contract shards are still checked-in
  framework-owned compatibility projections. A future ProtocolStore/cache
  implementation can move them fully under `.attune/cache` or a virtual module
  strategy.
- Shape conformance still reports migrate/manual candidates, but the one-file
  package-local Attune surface is clean.
- `.pre-commit-config.yaml` has unrelated Nix symlink churn left unstaged.
- `scripts/codex/wake-sqlite-program-index-reactive-projections.sh` remains an
  untracked helper from the separate SQLite program-index change.

Next agent:
- Archive or further harden `compress-attune-package-surface` after deciding
  whether checked-in framework-owned generated projections should remain until
  virtual/cache module support lands.
