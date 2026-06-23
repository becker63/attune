Agent: Codex local implementation
Date: 2026-06-23
Wave: Joern Effect Properties package-local Attune surface compression
Ownership: `packages/joern-effect-properties`, centralized joern-effect-properties package-contract materialization, and joern-effect-properties Source BOM projection

Changed:
- Moved `packages/joern-effect-properties/src/attune.contract.generated.ts` to
  `framework/architecture/src/generated/package-contracts/joern-effect-properties/attune.contract.generated.ts`.
- Moved `packages/joern-effect-properties/src/attune.generated.ts` to
  `framework/architecture/src/generated/package-contracts/joern-effect-properties/attune.generated.ts`.
- Moved `packages/joern-effect-properties/attune.source-bom.json` to
  `framework/architecture/src/generated/source-bom/joern-effect-properties.json`.
- Updated `packages/joern-effect-properties/src/attune.package.ts` so it no
  longer re-exports generated contract material.
- Updated the package-local contract test to import the framework-owned
  generated contract directly.
- Updated the central package-contract typecheck aggregate to read the
  framework-owned joern-effect-properties generated contract.
- Updated the Source BOM index to point joern-effect-properties at the
  framework-owned shard.

Contract status:
- `packages/joern-effect-properties/src/attune.package.ts` is now the only
  package-local Attune source file for joern-effect-properties.
- Generated TypeScript remains checked in during migration, but it is now under
  the framework-owned package-contract generated tree.
- Source BOM projection remains checked in during migration, but it is now
  under the framework-owned generated Source BOM tree.

Validated:
- `nx run joern-effect-properties:typecheck --skipNxCache`
- `nx run joern-effect-properties:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `git diff --check`

Validation notes:
- First `joern-effect-properties:typecheck` failed after the package-local test
  imported the relocated generated contract directly. The package-local test is
  now an authored-root declaration test, and the central typecheck aggregate
  imports the framework-owned generated contract.
- First `joern-effect-properties:test` failed only on a brittle
  `Schema.isSchema(PackageContractSchema)` assertion in the rewritten
  declaration test. The rerun passed: 13 test files, 68 tests.
- `workspace:package-contracts-check` passed. It still reports the existing
  staged one-file-surface warning for `framework/architecture`, not
  `joern-effect-properties`.
- `git diff --check` passed.

Residual migration debt:
- Teach `attune-repair` to regenerate or refresh the joern-effect-properties
  centralized contract/BOM projection automatically instead of relying on
  checked-in moved files.
- Add a package-contract entry for joern-effect-properties to the generator
  shape inventory when the package-contract generator owns this package's
  proof-runtime contract shape.
