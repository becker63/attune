# Phase 7 Future Removal Blockers

## Status

Phase 7 deleted the remaining active generated-contract tests and added final
drift checks for active docs, primary program-index runtime objects, normal
program-index diagnostic copy, and migrated-ring package-local companion
resurrection.

The remaining compatibility APIs and helpers are not archive-ready permanent
surfaces. They must be removed, renamed, or quarantined before this migration
is considered fully finished.

## Future Removal Gates

### Framework compatibility API/helpers

- Current surface:
  - `framework/protocol/src/package-contract/**`
  - `framework/protocol/src/descriptors/**`
  - `framework/protocol/src/laws/**`
  - `framework/protocol/src/obligations/**`
  - `framework/protocol/src/evidence/**`
  - `framework/testing/src/package-harness.ts`
  - `framework/testing/src/evidence-producer.ts`
- Replacement path:
  - program-index query services over project, source_file, symbol,
    schema_descriptor, edge, artifact, observation, diagnostic, repair, and
    invalidation rows
  - focused package-domain tests for behavior that should remain domain logic
- Gate:
  - runtime, language-service, framework-testing, and package tests no longer
    import old helper modules
  - generated compatibility output has been deleted or quarantined
  - `framework-runtime:test`, `framework-language-service:test`,
    `framework-protocol:test`, and `framework-testing:test` pass

### Framework-owned generated compatibility outputs

- Current surface:
  - `framework/architecture/src/generated/package-contracts/**`
  - `framework/architecture/src/generated/package-contracts.typecheck.generated.ts`
- Replacement path:
  - program-index rows, SQL projections, invalidations, diagnostics, repair
    rows, and cache-owned generated artifacts
- Gate:
  - `workspace:attune-check` and `workspace:attune-repair --dryRun` do not read
    generated compatibility object shapes as primary data
  - package graph discovery tests either read program-index facts or are
    deleted as compatibility tests
  - source ownership and generated artifact freshness checks pass without
    checked-in compatibility outputs

### Authored project facts API

- Status:
  - Phase 9 migrated active authored `src/attune.package.ts` files to
    `ProjectFacts`, `ProjectRuntimeRoots`, `defineAttuneProjectFacts`,
    `symbols`, and `edges`.
  - A framework policy ratchet now rejects `PackageDeclaration`,
    `PackageViewRoots`, `defineAttunePackageDeclaration`, and
    `PackageContractSchema` re-exports in active authored package files.
- Remaining surface:
  - generated compatibility modules still export `PackageContract`,
    `PackageFuzzHandlers`, `PackageProperties`, and `PackageTypeGuidance`
  - package graph discovery still reads those generated compatibility modules
- Remaining gate:
  - generated compatibility output consumers use program-index facts
  - checked-in generated compatibility outputs are deleted or quarantined
  - migrated package `attune-check`, `attune-repair --dryRun`, `typecheck`, and
    touched tests pass

### Internal repair route names

- Current surface:
  - `attune:repair-registry`
  - `attune:repair-properties`
  - `attune:repair-type-guidance`
  - `attune:repair-evidence`
- Replacement path:
  - program-index repair rows with mechanical repair kinds behind public
    `attune-repair` targets
- Gate:
  - `workspace:attune-repair --dryRun` and project repair dry-runs report
    mechanical repair kinds
  - no project `project.json` exposes the old internal route names

### Product proof terminology split

- Current surface:
  - proof and coverage code in `joern-effect-properties`
  - provider safety proof records in `home-deployment` and
    `platform-alchemy-k8s`
- Replacement path:
  - keep legitimate product-domain proof language where it is not framework
    compatibility vocabulary
  - move framework-owned compatibility data into observation rows
- Gate:
  - a focused OpenSpec split distinguishes product proof language from old
    framework compatibility helpers
  - cheap Ring C tests pass without live provider, Kubernetes, Alchemy,
    container, or destructive actions

## Validation Already Run

- `nx run attune-architecture:test --skipNxCache`

## Rule

Do not mark this migration fully finished while these compatibility APIs and
helpers remain normal active workflow surfaces. They are demolition scaffolding
with explicit removal gates.
