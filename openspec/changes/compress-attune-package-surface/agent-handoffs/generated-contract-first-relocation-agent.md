Agent: Codex local implementation
Wave: Real relocation slice 5
Ownership: First full generated contract companion relocation

Changed:
- Moved `packages/platform-alchemy-k8s/src/attune.contract.generated.ts` to
  `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.contract.generated.ts`.
- Taught `framework/architecture/src/framework-policy-cli.ts` to treat
  `framework/architecture/src/generated/package-contracts/<project>/attune.contract.generated.ts`
  as the semantic generated package-contract companion when the package-local
  generated companion has moved.
- Removed the generated contract re-export from
  `packages/platform-alchemy-k8s/src/attune.package.ts`.
- Updated `packages/platform-alchemy-k8s/test/attune-package-contract.test.ts`
  to import generated package-contract facts from the framework-owned
  materialized contract.
- Updated the central package-contract typecheck aggregate to import
  `platform-alchemy-k8s` generated contract facts from the framework-owned
  materialized contract.
- Added a framework policy regression fixture proving a slim package declaration
  can satisfy the final-ratchet view/evidence/type-guidance checks through the
  framework-owned generated package-contract materialization.

Generated:
- `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.contract.generated.ts`
  remains generated TypeScript, but no longer lives in package source.

Validated:
- `nx run platform-alchemy-k8s:typecheck --skipNxCache`
- `nx run platform-alchemy-k8s:test --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `openspec validate compress-attune-package-surface --type change`
- `pnpm exec vitest run framework/architecture/test/framework-policy-cli.test.ts --config framework/architecture/vitest.config.ts`
- `git diff --check`

Not run:
- No broad generated-companion migration for other packages.
- No `attune-repair` generator implementation update yet; this is a manual
  relocation proof.
- `nx run attune-architecture:test --skipNxCache` is currently blocked by an
  Nx task graph cycle:
  `attune-architecture:test -> home-deployment:build -> platform-alchemy-k8s:build -> attune-architecture:build -> home-deployment:build`.

Contract status:
- `platform-alchemy-k8s/src/attune.package.ts` is now the only package-local
  Attune TypeScript source file for that project.
- `platform-alchemy-k8s` still has package-local `attune.source-bom.json`.
- `workspace:framework-policy-check` now warns for `platform-alchemy-k8s` only
  because of the remaining package-local Source BOM shard; it no longer reports
  package-local generated TypeScript companions for that package.

Residual migration debt:
- Move `platform-alchemy-k8s/attune.source-bom.json` to the framework-owned
  Source BOM projection path.
- Teach `attune-repair` to regenerate the central package-contract
  materialization.
- Repeat the generated companion relocation for remaining packages.

Next agent:
- Move `platform-alchemy-k8s` Source BOM into the framework-owned projection, or
  repeat this generated-contract relocation pattern for another small package.
