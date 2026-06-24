# Phase 7 Generated-Contract Test Deletion

## Changed

- Removed the remaining active architecture generated-contract tests:
  - `framework/architecture/test/attune-package-contract.test.ts`
  - `framework/architecture/test/attune-foldkit-generated-contract.test.ts`
  - `framework/architecture/test/attuned-discovery-generated-contract.test.ts`
  - `framework/architecture/test/platform-alchemy-generated-contract.test.ts`
- Removed `test/attune-package-contract.test.ts` from the
  `attune-architecture` Source BOM compatibility shard and generator-shape
  ownership metadata.

## Mechanical Replacement

- Program-index materialization now carries the normal check surface through
  project, source_file, symbol, schema_descriptor, edge, artifact, observation,
  diagnostic, repair, and invalidation rows.
- `attune-architecture:test` remains the validation target for architecture
  policy behavior; `workspace:attune-check` remains the workspace diagnostic
  path.

## Validation Gate

- `nx run attune-architecture:test --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `openspec validate promote-program-index-runtime-substrate --type change`
- `git diff --check`

## Rollback

- Restore the deleted tests from git only if a regression proves program-index
  rows cannot answer the same architecture policy questions.
- Do not recreate package-local generated companions or package-contract tests
  as new workflow truth.
