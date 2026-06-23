Agent: attune-foldkit-one-file-agent
Wave: one Attune file per package / public surface compression
Ownership: packages/attune-foldkit/**, framework-owned generated assertions for attune-foldkit, and repair CLI support for this relocation slice

Changed:
- Added `attune-foldkit` to the safe generated companion relocation path in `framework/architecture/src/attune-repair-cli.ts`.
- Ran `attune-foldkit:attune-repair` to move package-local generated companions and Source BOM state into framework-owned locations.
- Removed the package-local generated contract re-export from `packages/attune-foldkit/src/attune.package.ts`.
- Rewrote `packages/attune-foldkit/test/attune-package-contract.test.ts` to validate only authored package declaration id/kind/operation ids and view roots.
- Added `framework/architecture/test/attune-foldkit-generated-contract.test.ts` for generated contract, law, type-guidance, handler/property, layer, fixture, and view graph assertions.
- Added repair CLI coverage for rewriting package-local relative imports when centralizing generated contracts.
- Added architecture test/build aliases and build excludes needed for framework-owned generated package contract projections.

Before package-local Attune files:
- `packages/attune-foldkit/src/attune.package.ts` - authored source intent, 106 LOC.
- `packages/attune-foldkit/src/attune.generated.ts` - generated registry/property/type-guidance/RPC material, 474 LOC.
- `packages/attune-foldkit/src/attune.contract.generated.ts` - generated contract/materialized package exports, 672 LOC.
- `packages/attune-foldkit/attune.source-bom.json` - Source BOM shard, 125 LOC.
- No package-local `src/attune.package.typecheck.ts` was present.

After package-local Attune files:
- `packages/attune-foldkit/src/attune.package.ts` only.
- The authored package declaration is 105 LOC after removing the generated re-export.

Generated/cache layout:
- Framework-owned generated contract:
  - `framework/architecture/src/generated/package-contracts/attune-foldkit/attune.contract.generated.ts`
  - `framework/architecture/src/generated/package-contracts/attune-foldkit/attune.generated.ts`
- Framework-owned Source BOM projection:
  - `framework/architecture/src/generated/source-bom/attune-foldkit.json`
- Gitignored repair/cache projections:
  - `.attune/cache/generated/attune-foldkit/attune-operation-registry.ts`
  - `.attune/cache/generated/attune-foldkit/attune-property-registry.ts`
  - `.attune/cache/generated/attune-foldkit/attune-type-guidance.ts`
  - `.attune/cache/generated/attune-foldkit/attune-property-evidence.ts`
  - `.attune/cache/generated/attune-foldkit/generated-freshness.json`
  - `.attune/cache/evidence/attune-foldkit/evidence-scaffold.json`

Typecheck strategy:
- The central `framework/architecture/src/generated/package-contracts.typecheck.generated.ts` now imports the framework-owned generated FoldKit contract.
- Package-local tests no longer import generated contract surfaces from `src/attune.package.ts`.

SQLite/ProtocolStore behavior changed:
- No tracked SQLite/ProtocolStore code changed.
- Private generated/evidence cache outputs remain under `.attune/cache/` and are gitignored.

Nx repair changes:
- `attune-foldkit:attune-repair` now performs safe relocation for generated companions and Source BOM when the `generated` repair kind runs.
- The repair CLI rewrites package-local relative imports in centralized generated contracts while preserving the local `./attune.generated.js` companion import.

Validated:
- `pnpm exec tsx framework/architecture/src/attune-repair-cli.ts --project attune-foldkit --all-safe --dry-run`
- `nx run attune-foldkit:attune-repair --skipNxCache`
- `nx run attune-foldkit:typecheck --skipNxCache`
- `nx run attune-foldkit:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-architecture:build --skipNxCache`
- `nx graph --file=/tmp/attune-graph-foldkit.json`
- `nx run workspace:package-contracts-check --skipNxCache`

Not run:
- Full `nx run-many -t typecheck --all`
- Full `nx run-many -t test --all`
- Heavy proof/provider campaigns

Residual debt:
- One-file warnings remain for `attune-nx`, `attune-pi-agent`, `cocoindex-effect`, `home-deployment`, `joern-effect`, `joern-effect-properties`, `attune-architecture`, and `effect-oxlint-policy`.
- Framework-owned generated package contracts are still checked-in projections under `framework/architecture/src/generated/package-contracts/`; future ProtocolStore work can decide which projections become cache-only.

Next agent:
- Continue the same relocation pattern on the next low-risk product root, likely `cocoindex-effect` or `attune-pi-agent`, then broaden to tooling/framework roots after the product ring is stable.
