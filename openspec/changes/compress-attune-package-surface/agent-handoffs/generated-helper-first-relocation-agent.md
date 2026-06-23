Agent: Codex local implementation
Wave: Real relocation slice 4
Ownership: First generated TypeScript helper relocation

Changed:
- Moved `packages/platform-alchemy-k8s/src/attune.generated.ts` to
  `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.generated.ts`.
- Updated `packages/platform-alchemy-k8s/src/attune.contract.generated.ts` to
  import `createAttuneGenerated` from the framework-owned generated helper.
- Updated the package-local surface design/spec to name
  `framework/architecture/src/generated/package-contracts/<project>/*` as a
  checked-in migration materialization path for generated TypeScript.
- Updated package-contract target semantics to include the framework-owned
  generated package-contract location.

Generated:
- `framework/architecture/src/generated/package-contracts/platform-alchemy-k8s/attune.generated.ts`
  is still generated TypeScript, but it no longer lives in the product package
  source tree.

Validated:
- `nx run platform-alchemy-k8s:typecheck --skipNxCache`
- `nx run platform-alchemy-k8s:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`
- `openspec validate compress-attune-package-surface --type change`
- `git diff --check`

Not run:
- No second-stage relocation of
  `packages/platform-alchemy-k8s/src/attune.contract.generated.ts` yet.
- No broad generated-companion migration for other packages.

Contract status:
- `platform-alchemy-k8s` package-local Attune companions decrease by one:
  `src/attune.generated.ts` moved out of the package source tree.
- The package still carries `src/attune.contract.generated.ts` and
  `attune.source-bom.json`.

Residual migration debt:
- Teach framework readers/tests to import central materialized contracts so
  `src/attune.contract.generated.ts` can move next.
- Wire `attune-repair` to regenerate central package-contract materialization.
- Move remaining package-local generated helpers after the first package proof
  stays green.

Next agent:
- Move `platform-alchemy-k8s/src/attune.contract.generated.ts` after adding the
  central materialized contract import/read fallback, or repeat the helper-only
  move for another low-risk package ring.
