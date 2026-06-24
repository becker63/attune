# Phase 7 Future Removal Blockers

## Status

Phase 7 deleted the remaining active generated-contract tests and added final
drift checks for active docs, primary program-index runtime objects, normal
program-index diagnostic copy, and migrated-ring package-local companion
resurrection.

The remaining compatibility APIs and helpers are not archive-ready permanent
surfaces. They must be removed, renamed, or quarantined before this migration
is considered fully finished.

Task 9.3 removed the checked-in framework-owned generated package-contract
outputs. See `agent-handoffs/phase9-generated-output-deletion.md` for the
validated deletion slice and replacement path.

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

- Status:
  - Deleted in Phase 9.
  - `workspace:attune-check` and `workspace:attune-repair --dryRun` validate
    without `framework/architecture/src/generated/package-contracts/**` or the
    generated typecheck aggregate.
- Replacement path:
  - program-index rows, SQL projections, invalidations, diagnostics, repair
    rows, and cache-owned generated artifacts
- Follow-up:
  - Keep the generated tree deleted while removing the remaining old
    protocol/testing helper APIs.

### Authored project facts API

- Status:
  - Phase 9 migrated active authored `src/attune.package.ts` files to
    `ProjectFacts`, `ProjectRuntimeRoots`, `defineAttuneProjectFacts`,
    `symbols`, and `edges`.
  - A framework policy ratchet now rejects `PackageDeclaration`,
    `PackageViewRoots`, `defineAttunePackageDeclaration`, and
    `PackageContractSchema` re-exports in active authored package files.
- Remaining surface:
  - framework protocol/testing compatibility helpers still carry old object and
    helper names until task 9.4 removes or mechanically renames them
- Remaining gate:
  - runtime, language-service, framework-testing, and package tests consume
    program-index query APIs instead of old compatibility helper modules
  - migrated package `attune-check`, `attune-repair --dryRun`, typechecks, and
    touched tests pass

### Internal repair route names

- Renamed in Phase 9.5:
  - `attune:repair-symbol-registry`
  - `attune:repair-property-observations`
  - `attune:repair-schema-observations`
  - `attune:repair-observations`
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
- `nx run framework-runtime:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

## Rule

Do not mark this migration fully finished while these compatibility APIs and
helpers remain normal active workflow surfaces. They are demolition scaffolding
with explicit removal gates.
