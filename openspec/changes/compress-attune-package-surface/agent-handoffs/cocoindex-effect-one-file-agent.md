Agent: Codex local implementation
Date: 2026-06-23
Wave: CocoIndex package-local Attune surface compression
Ownership: `packages/cocoindex-effect`, centralized cocoindex package-contract materialization, and cocoindex Source BOM projection

Changed:
- Moved `packages/cocoindex-effect/src/attune.contract.generated.ts` to
  `framework/architecture/src/generated/package-contracts/cocoindex-effect/attune.contract.generated.ts`.
- Moved `packages/cocoindex-effect/src/attune.generated.ts` to
  `framework/architecture/src/generated/package-contracts/cocoindex-effect/attune.generated.ts`.
- Moved `packages/cocoindex-effect/attune.source-bom.json` to
  `framework/architecture/src/generated/source-bom/cocoindex-effect.json`.
- Updated `packages/cocoindex-effect/src/attune.package.ts` so it no longer
  re-exports generated contract material.
- Updated the cocoindex package contract test to import the framework-owned
  generated contract directly.
- Updated the central package-contract typecheck aggregate to read the
  framework-owned cocoindex generated contract.
- Updated the Source BOM index to point cocoindex at the framework-owned shard.
- Updated the generator-shape manifest's cocoindex package-contract entry to
  point at the framework-owned Source BOM shard.

Contract status:
- `packages/cocoindex-effect/src/attune.package.ts` is now the only
  package-local Attune source file for cocoindex.
- Generated TypeScript remains checked in during migration, but it is now under
  the framework-owned package-contract generated tree.
- Source BOM projection remains checked in during migration, but it is now
  under the framework-owned generated Source BOM tree.

Validated:
- `nx run cocoindex-effect:typecheck --skipNxCache`
- `nx run cocoindex-effect:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `git diff --check`

Validation notes:
- First `workspace:package-contracts-check` run failed because
  `attune.generator-shapes.json` still pointed the cocoindex package-contract
  shape at `packages/cocoindex-effect/attune.source-bom.json`.
- After updating that cocoindex manifest entry, the rerun passed.
- `workspace:package-contracts-check` still reports staged one-file-surface
  warnings for other packages/framework roots that have not moved yet; it no
  longer reports cocoindex.

Residual migration debt:
- Teach `attune-repair` to regenerate or refresh the cocoindex centralized
  contract/BOM projection automatically instead of relying on checked-in moved
  files.
- Keep widening remaining package rings only after focused typecheck/test and
  package-contract validation pass for each package.
