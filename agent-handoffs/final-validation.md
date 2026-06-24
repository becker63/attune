# Final Validation

## Changed In Latest Slice

- Renamed primary runtime/store/query services from `Protocol*`/`SqliteProtocol*`
  to `ProgramFact*`/`SqliteProgramFact*`.
- Deleted the public `package-contract` graph helper and its test; the
  remaining generator surface is `@attune/nx:project-facts`.
- Renamed the `@attune/nx:project-facts`, `effect-service`, and `atom-view`
  generator option surfaces from package/operation vocabulary to
  project/symbol/artifact/observation vocabulary.
- Replaced generated project-facts helper output with `ProjectFacts`,
  `ProgramSymbolRegistry`, `ProgramObservationPlan`,
  `ProgramRuntimeGraph`, `ProgramGeneratedArtifacts`, and
  `ProgramReportPolicy`.
- Renamed framework-owned artifact ownership projection records from
  `contractShards` to `projectFactShards` and routed generated check metadata
  to `workspace:attune-check`.
- Removed the internal artifact ownership helper export from the public
  `@attune/nx` barrel.

## Validated

- `openspec validate promote-program-index-runtime-substrate --type change`
- `git diff --check`
- `pnpm exec tsc -p framework/runtime/tsconfig.json --noEmit`
- `pnpm exec tsc -p framework/architecture/tsconfig.json --noEmit`
- `pnpm exec tsc -p packages/attune-nx/tsconfig.json --noEmit`
- `nx run framework-runtime:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

## Program Index State

Fresh `workspace:attune-check` materialization:

- 18 projects
- 227 targets
- 98 source_files
- 531 symbols
- 88 schema_descriptors
- 8177 edges
- 202 artifacts
- 22 observations
- 21 diagnostics
- 21 repairs

`workspace:attune-repair --dryRun`:

- 21 total repair rows
- 21 safe rows
- 0 needs-review rows
- 0 manual-only rows
- 21 blocked schema_descriptor refresh rows because no automatic materializer
  route exists yet
- no safe artifact or project-surface relocation actions needed

## Not Run

- No heavy proof-pressure target.
- No container fuzzing target.
- No live provider action.
- No Kubernetes or Alchemy apply/deploy action.
- No destructive action.

## Residual Blockers

- Framework protocol/testing compatibility helpers still expose old object
  vocabulary internally. They must be deleted, renamed mechanically, or
  quarantined before archive readiness.
- Internal compatibility target/file names such as
  `workspace:program-facts-check`, `workspace:artifact-ownership-check`, and
  `attune.artifact-ownership*.json` still appear as implementation scaffolding behind
  the public `attune-check` workflow.
- The repair dry-run still exposes safe schema_descriptor refresh rows as
  blocked because the automatic refresh materializer route is not implemented.

## Archive Readiness

Not archive-ready yet. The public generator/API compatibility cut is validated,
but the remaining protocol/testing helpers and internal source-ownership target
names must be removed or quarantined before this migration is genuinely
finished.
