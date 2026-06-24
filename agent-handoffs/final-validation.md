# Final Validation

## Changed In Final Slice

- Deleted the checked-in generated package-contract output tree and generated
  typecheck aggregate after the program-index materialization path proved
  parity for active check/repair workflows.
- Replaced active consumers of those checked-in outputs with authored
  `ProjectFacts` and program-index-backed source, artifact, observation,
  diagnostic, and repair rows.
- Updated repair behavior so package-local generated companions are removed
  from safe roots instead of centralized into a checked-in framework-generated
  package-contract tree.
- Removed the tracked historical Joern fuzzer run report from active docs.
- Updated `docs/README.md` so docs no longer advertise checked-in run reports
  as retained workflow material.
- Refined checked-in report artifact detection so package source modules under
  `src/artifacts/*.ts` are not misclassified as report ledgers.
- Reset the SQLite program index during full workspace materialization so stale
  diagnostics, repairs, artifacts, and observations cannot survive deleted
  source/report files.
- Raised the aggregate workspace check timeout to 240 seconds so the public
  fresh-index check path can finish.

## Validated

- `openspec validate promote-program-index-runtime-substrate --type change`
- `git diff --check`
- `nx run framework-sqlite:test --skipNxCache`
- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-nx:test --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

## Final Program Index State

- Fresh `workspace:attune-check` materialization after generated-output
  deletion:
  - 18 projects
  - 227 targets
  - 113 source_files
  - 553 symbols
  - 88 schema_descriptors
  - 8177 edges
  - 217 artifacts
  - 37 observations
  - 21 diagnostics
  - 21 repairs
- `workspace:attune-repair --dryRun`:
  - 21 total repair rows
  - 21 safe rows
  - 0 needs-review rows
  - 0 manual-only rows
  - 21 blocked schema_descriptor refresh rows because no automatic
    materializer route exists yet
  - no checked-in-report removal rows

## Touched Package Validation

- `framework-runtime:test` covers the checked-in report/source artifact
  predicate and program-index compatibility rows.
- `attune-architecture:test` covers docs/report policy, final ratchets, source
  ownership, shape conformance, and repair CLI behavior.

## Not Run

- No heavy proof-pressure target.
- No container fuzzing target.
- No live provider action.
- No Kubernetes or Alchemy apply/deploy action.
- No destructive action.

## Residual Blockers

- Compatibility APIs and helpers listed in
  `agent-handoffs/phase7-future-removal-blockers.md` remain demolition
  scaffolding. They are not acceptable as permanent archive-ready surfaces.
- The repair dry-run still exposes safe schema_descriptor refresh rows as
  blocked because the automatic refresh materializer route is not implemented.
- Framework-owned generated package-contract compatibility outputs have been
  deleted. Remaining demolition scaffolding is concentrated in protocol/testing
  helper modules and old internal repair/artifact route names.

## Archive Readiness

This change is validated as a Phase 7/8 migration checkpoint, but it is not a
strict final archive point if "finished" means all compatibility APIs/helpers
are removed. The next split should remove or rename those compatibility
surfaces rather than preserving them indefinitely.

## Follow-up Splits

- Remove framework protocol/testing compatibility helper modules once runtime,
  language-service, framework-testing, and package tests consume mechanical
  program-index APIs.
- Add an automatic materializer route for schema_descriptor refresh repair rows
  or reclassify those rows if no automatic repair should exist.
- Split legitimate product proof terminology from old framework compatibility
  helper names in Ring C packages.
