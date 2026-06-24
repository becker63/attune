# Phase 9 Authored Project Facts API

## Changed

- Migrated active authored `src/attune.package.ts` files from
  `PackageDeclaration`, `PackageViewRoots`, `defineAttunePackageDeclaration`,
  and `PackageContractSchema` re-exports to `ProjectFacts`,
  `ProjectRuntimeRoots`, `defineAttuneProjectFacts`, `symbols`, and `edges`.
- Added `defineAttuneProjectFacts` and `ProjectRuntimeRoots` to the protocol
  package as the active authored source API.
- Added a framework policy ratchet for old authored project API names in active
  package surfaces.
- Renamed the slim-file policy diagnostic to `project-facts-too-large`.
- Updated the package-contract generator so new generated source no longer
  re-exports `PackageContractSchema` and frames package-contract output as
  compatibility materialization feeding the mechanical program index.
- Updated framework-owned Source BOM projections whose editable marker pointed
  at `definePackageContract`.

## Validated

- `nx run framework-protocol:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-architecture:typecheck --skipNxCache`
- `nx run effect-oxlint-policy:typecheck --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-foldkit:typecheck --skipNxCache`
- `nx run attuned-discovery:typecheck --skipNxCache`
- `nx run cocoindex-effect:typecheck --skipNxCache`
- `nx run attune-pi-agent:typecheck --skipNxCache`
- `nx run home-deployment:typecheck --skipNxCache`
- `nx run joern-effect:typecheck --skipNxCache`
- `nx run joern-effect-properties:typecheck --skipNxCache`
- `nx run platform-alchemy-k8s:typecheck --skipNxCache`
- `openspec validate promote-program-index-runtime-substrate --type change`
- `git diff --check`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

## Workspace Check State

- Fresh program-index materialization:
  - 18 projects
  - 227 targets
  - 146 source_files
  - 1216 symbols
  - 525 schema_descriptors
  - 9002 edges
  - 250 artifacts
  - 201 observations
  - 21 diagnostics
  - 21 repairs
- Source BOM check passed with 11 registered shards.
- Generator shape conformance passed with 53 shapes across 11 projects.
- Framework policy check passed with the new authored project API ratchet.
- Repair dry-run reported the existing 21 blocked `schema_descriptor` refresh
  rows and no safe generated/package-surface relocation actions.

## Not Done

- The checked-in generated compatibility outputs under
  `framework/architecture/src/generated/package-contracts/**` were deleted in
  the follow-up Phase 9 generated-output slice.
- Protocol and testing compatibility helper modules remain active until their
  consumers move to program-index query APIs.
- Internal repair route and generated artifact names still need mechanical
  naming.
