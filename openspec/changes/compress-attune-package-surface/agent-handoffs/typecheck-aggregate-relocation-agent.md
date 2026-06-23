Agent: Codex local implementation
Wave: Real relocation slice 1
Ownership: Package-contract compile-only assertions and package-local typecheck companions

Changed:
- Added `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
  as the central framework-owned package contract assertion aggregate.
- Deleted 11 package-local `src/attune.package.typecheck.ts` files from active
  Attune roots.
- Updated product/tooling discovery tests to require package contract modules
  plus the central aggregate instead of per-package typecheck files.
- Updated `@attune/nx:package-contract` so it no longer writes
  `src/attune.package.typecheck.ts`.
- Updated package-contract target semantics, generator inventory, repair-plan
  do-not-edit guidance, Source BOM shards, and `attune.generator-shapes.json`
  away from package-local typecheck outputs.
- Updated docs so compile-only assertions are described as framework-owned
  aggregate state.

Generated:
- `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`

Removed package-local files:
- `framework/architecture/src/attune.package.typecheck.ts`
- `framework/oxlint-policy/src/attune.package.typecheck.ts`
- `packages/attune-foldkit/src/attune.package.typecheck.ts`
- `packages/attune-nx/src/attune.package.typecheck.ts`
- `packages/attune-pi-agent/src/attune.package.typecheck.ts`
- `packages/attuned-discovery/src/attune.package.typecheck.ts`
- `packages/cocoindex-effect/src/attune.package.typecheck.ts`
- `packages/home-deployment/src/attune.package.typecheck.ts`
- `packages/joern-effect/src/attune.package.typecheck.ts`
- `packages/joern-effect-properties/src/attune.package.typecheck.ts`
- `packages/platform-alchemy-k8s/src/attune.package.typecheck.ts`

Validated:
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`

Not run:
- Full all-package typecheck/test sweep.
- Proof-pressure/nightly campaigns.
- Provider/platform live apply flows.

Contract status:
- Compile-only assertions are no longer package-local source files.
- `src/attune.package.ts` is closer to being the only package-local Attune
  file, but generated contract companions and Source BOM shards still remain.
- The one-file policy now warns about three remaining companions per active
  root: `src/attune.contract.generated.ts`, `src/attune.generated.ts`, and
  `attune.source-bom.json`.

Residual migration debt:
- Move generated contract companions out of package source or hide them behind a
  framework-owned generated/cache lookup.
- Move Source BOM shards to `.attune/cache/source-bom` or ProtocolStore-backed
  projection after path compatibility lands.
- Make `attune-repair` apply the relocation instead of only routing/dry-running.

Blocked by:
- Package contract modules still re-export `src/attune.contract.generated.ts`.
- Source BOM checker and hooks still expect package-local shard paths.

Next agent:
- Implement Source BOM cache-path compatibility first, then move one normal
  package ring's Source BOM shard and generated companions behind framework
  materialization before widening the policy ratchet.
