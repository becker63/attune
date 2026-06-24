# Phase 9 Generated Output Deletion

## Status

Task 9.3 is complete. The checked-in generated project-facts tree and
generated typecheck aggregate were removed from active source, and their
consumers now use authored project facts plus program-index materialization.

Deleted surfaces:

- `framework/architecture/src/generated/project-facts/**`
- `framework/architecture/src/generated/project-facts.typecheck.generated.ts`
- `packages/attune-nx/test/product-contract-discovery.test.ts`
- `packages/attune-nx/test/tooling-contract-discovery.test.ts`

## Replacement Path

- Authored package intent remains in `src/attune.package.ts` as
  `ProjectFacts`, `ProjectRuntimeRoots`, `symbols`, and `edges`.
- `workspace:program-index-materialize` projects source files, symbols,
  schema descriptors, edges, artifacts, observations, diagnostics, repairs, and
  invalidations into `.attune/cache/program-index.sqlite`.
- Generated/cache compatibility projections are cache-owned under
  `.attune/cache/generated/<project>/*` when needed.
- `attune-check` and `attune-repair --dryRun` now validate without reading the
  deleted checked-in generated project-facts outputs as primary data.

## Consumer Changes

- Architecture policy no longer requires framework-generated semantic
  companions when an active project file uses mechanical `ProjectFacts`.
- The repair CLI removes project-local generated compatibility artifacts for safe roots
  instead of centralizing them into a checked-in framework-generated tree.
- Program-index materialization no longer registers the deleted generated tree
  or typecheck aggregate as existing compatibility artifacts.
- Runtime compatibility tests now assert source-file/symbol facts from
  authored project facts and source-ownership compatibility rows, not generated
  PackageContract observations.
- Attune Nx target semantics describe the repair path as authored project
  facts plus cache-owned compatibility projections and artifact ownership rows.

## Validation

- `nx run framework-runtime:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

`workspace:attune-check` materialized the program index with 217 artifact rows
and no dependency on the deleted generated project-facts tree.
`workspace:attune-repair --dryRun` reported no safe artifact or project-surface
relocation actions were needed; the only remaining rows were the existing 21
blocked schema_descriptor refresh repairs.

## Remaining Work

- Task 9.4 still needs the framework protocol/testing compatibility helper
  modules removed or mechanically renamed after consumers move to program-index
  query APIs.
- Task 9.5 repair route and generated artifact naming was completed in the
  2026-06-24 compatibility API slice. Remaining old-noun debt is concentrated
  in framework protocol/testing helpers and internal artifact ownership target
  names.
